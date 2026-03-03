import { NextResponse } from "next/server";

import { fillScenarioSection } from "@/lib/generation";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { scenarioFillSectionRequestSchema } from "@/lib/scenario-schema";
import { safeErrorMessage, safeLog } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "scenario-fill-section", 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const parsed = scenarioFillSectionRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
    }

    const result = await fillScenarioSection(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    safeLog("/api/scenario/fill-section failed", error);
    return jsonError(safeErrorMessage(error), 500);
  }
}
