import { NextResponse } from "next/server";

import { enforceRateLimit, jsonError } from "@/lib/http";
import { scenarioValidateRequestSchema } from "@/lib/scenario-schema";
import { safeErrorMessage, safeLog } from "@/lib/security";
import { validateScenarioAgainstSimMan } from "@/lib/simman-validator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "scenario-validate", 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const parsed = scenarioValidateRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
    }

    const warnings = validateScenarioAgainstSimMan(parsed.data.scenario);
    return NextResponse.json({ warnings });
  } catch (error) {
    safeLog("/api/scenario/validate failed", error);
    return jsonError(safeErrorMessage(error), 500);
  }
}
