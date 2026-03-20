import { NextResponse } from "next/server";

import { buildExportFileName, buildScenarioDocx } from "@/lib/docx-export";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { scenarioExportRequestSchema } from "@/lib/scenario-schema";
import { safeErrorMessage, safeLog } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, "scenario-export", 20, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.json();
    const parsed = scenarioExportRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues.map((issue) => issue.message).join("; "), 400);
    }

    const fileBuffer = await buildScenarioDocx(parsed.data.scenario, {
      scenarioFlowColumns: parsed.data.scenarioFlowColumns,
    });
    const fileName = buildExportFileName(parsed.data.scenario);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    safeLog("/api/scenario/export-docx failed", error);
    return jsonError(safeErrorMessage(error), 500);
  }
}
