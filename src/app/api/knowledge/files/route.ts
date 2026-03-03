import { enforceRateLimit, jsonError } from "@/lib/http";
import { safeLog } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "knowledge-files-list", 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    return jsonError("Knowledge library listing is disabled in the app.", 403);
  } catch (error) {
    safeLog("/api/knowledge/files GET failed", error);
    return jsonError("Knowledge library listing failed.", 500);
  }
}
