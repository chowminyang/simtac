import { NextResponse } from "next/server";

import { enforceRateLimit, jsonError } from "@/lib/http";
import { assertAdminPasscode, deleteKnowledgeFile } from "@/lib/knowledge";
import { safeErrorMessage, safeLog } from "@/lib/security";

export const runtime = "nodejs";

function resolvePasscode(request: Request): string | null {
  const header = request.headers.get("x-admin-passcode");
  if (header) return header;

  const url = new URL(request.url);
  return url.searchParams.get("passcode");
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const rateLimitResponse = enforceRateLimit(request, "knowledge-delete", 12, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    assertAdminPasscode(resolvePasscode(request));
    const { fileId } = await context.params;

    if (!fileId) {
      return jsonError("fileId is required.", 400);
    }

    const result = await deleteKnowledgeFile(fileId);
    return NextResponse.json(result);
  } catch (error) {
    safeLog("/api/knowledge/files/[fileId] DELETE failed", error);
    const message = safeErrorMessage(error);
    if (message.toLowerCase().includes("passcode")) {
      return jsonError(message, 401);
    }
    return jsonError(message, 500);
  }
}
