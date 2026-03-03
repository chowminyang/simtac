import { NextResponse } from "next/server";
import { toFile } from "openai";
import { z } from "zod";

import { enforceRateLimit, jsonError } from "@/lib/http";
import { getOpenAIClient } from "@/lib/openai-client";
import { safeErrorMessage, safeLog } from "@/lib/security";
import type { ScenarioAppendixImage } from "@/lib/types";

export const runtime = "nodejs";

export const SINGAPORE_IMAGE_CONTEXT = [
  "Generate this image for Singapore healthcare simulation training context.",
  "Use a realistic Singapore hospital environment and local clinical workflow context.",
  "If people are present, prefer realistic Southeast Asian demographics.",
  "Avoid non-Singapore country-specific branding, insignia, or setting cues unless explicitly requested by the user.",
].join(" ");

const imageGenerateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(32000),
  mode: z.enum(["new", "refine"]).default("new"),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]).optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
  baseImageDataUrl: z.string().max(20_000_000).optional(),
});

type ParsedDataUrl = {
  mimeType: string;
  bytes: Buffer;
};

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data format.");
  }

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function mimeTypeFromOutputFormat(outputFormat: string | undefined): string {
  if (outputFormat === "jpeg") return "image/jpeg";
  if (outputFormat === "webp") return "image/webp";
  return "image/png";
}

async function urlToDataUrl(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image (${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function resolveImageErrorStatus(message: string): number {
  const normalized = message.toLowerCase();
  if (normalized.includes("safety system") || normalized.includes("safety_violations")) return 400;
  if (normalized.includes("invalid image data format")) return 400;
  if (normalized.includes("baseimagedataurl is required")) return 400;
  return 500;
}

export function buildSingaporeContextPrompt(userPrompt: string): string {
  return `${SINGAPORE_IMAGE_CONTEXT}\n\nUser prompt:\n${userPrompt.trim()}`;
}

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "imagegen-generate", 10, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const parsed = imageGenerateRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
    }

    const client = getOpenAIClient();
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
    const size = parsed.data.size || "1536x1024";
    const quality = parsed.data.quality || "medium";

    const userPrompt = parsed.data.prompt;
    const localizedPrompt = buildSingaporeContextPrompt(userPrompt);
    let imageResponse;

    if (parsed.data.mode === "refine") {
      if (!parsed.data.baseImageDataUrl) {
        return jsonError("baseImageDataUrl is required when mode is 'refine'.", 400);
      }

      const parsedBaseImage = parseDataUrl(parsed.data.baseImageDataUrl);
      imageResponse = await client.images.edit({
        model,
        prompt: localizedPrompt,
        size,
        quality,
        image: await toFile(
          parsedBaseImage.bytes,
          `reference.${extensionFromMimeType(parsedBaseImage.mimeType)}`,
          { type: parsedBaseImage.mimeType },
        ),
      });
    } else {
      imageResponse = await client.images.generate({
        model,
        prompt: localizedPrompt,
        size,
        quality,
        output_format: "png",
      });
    }

    const image = imageResponse.data?.[0];
    if (!image) {
      throw new Error("Image generation returned no images.");
    }

    const mimeType = mimeTypeFromOutputFormat(imageResponse.output_format);
    const dataUrl = image.b64_json
      ? `data:${mimeType};base64,${image.b64_json}`
      : image.url
        ? await urlToDataUrl(image.url, mimeType)
        : null;

    if (!dataUrl) {
      throw new Error("Generated image payload is empty.");
    }

    const generatedImage: ScenarioAppendixImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      prompt: userPrompt,
      revisedPrompt: image.revised_prompt || localizedPrompt,
      caption: "",
      dataUrl,
      mimeType,
      model,
      size,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      image: generatedImage,
    });
  } catch (error) {
    safeLog("/api/imagegen/generate failed", error);
    const message = safeErrorMessage(error);
    const status = resolveImageErrorStatus(message);
    const safeMessage =
      status === 400 && message.toLowerCase().includes("safety")
        ? "Image request blocked by safety filters. Try a less explicit prompt or use a different base image."
        : message;
    return jsonError(safeMessage, status);
  }
}
