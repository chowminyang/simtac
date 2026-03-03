import { NextResponse } from "next/server";

import { enforceRateLimit, jsonError } from "@/lib/http";
import { assertAdminPasscode, uploadKnowledgeFile } from "@/lib/knowledge";
import { safeErrorMessage, safeLog } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "knowledge-upload", 12, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await request.formData();

    const passcode = request.headers.get("x-admin-passcode") || String(formData.get("passcode") || "");
    assertAdminPasscode(passcode);

    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) {
      return jsonError("A file field is required.", 400);
    }

    const upload = await uploadKnowledgeFile(fileValue);
    return NextResponse.json({ upload });
  } catch (error) {
    safeLog("/api/knowledge/upload failed", error);
    const message = safeErrorMessage(error);
    if (message.toLowerCase().includes("passcode")) {
      return jsonError(message, 401);
    }
    return jsonError(message, 500);
  }
}
