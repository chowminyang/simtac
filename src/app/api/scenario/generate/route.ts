import { NextResponse } from "next/server";

import { generateScenario } from "@/lib/generation";
import { jsonError, enforceRateLimit } from "@/lib/http";
import { scenarioGenerateRequestSchema } from "@/lib/scenario-schema";
import { safeErrorMessage, safeLog } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "scenario-generate", 20, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const parsed = scenarioGenerateRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
    }

    if (parsed.data.mode === "ai_prompt" && !parsed.data.prompt?.trim()) {
      return jsonError("Prompt is required for ai_prompt mode.", 400);
    }

    const result = await generateScenario(parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    safeLog("/api/scenario/generate failed", error);
    return jsonError(safeErrorMessage(error), 500);
  }
}
