import { describe, expect, it } from "vitest";

import { buildScenarioDocx, buildExportFileName } from "@/lib/docx-export";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";

describe("docx export", () => {
  it("builds a non-empty docx buffer", async () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.scenarioFlow.push(structuredClone(scenario.scenarioFlow[0]));
    scenario.equipment.push({ category: "Monitoring", item: "ECG", quantity: "1", remarks: "" });

    const buffer = await buildScenarioDocx(scenario);
    expect(buffer.byteLength).toBeGreaterThan(1200);
  });

  it("builds a deterministic filename shape", () => {
    const fileName = buildExportFileName(DEFAULT_SCENARIO);
    expect(fileName.startsWith("SIMTAC_")).toBe(true);
    expect(fileName.endsWith(".docx")).toBe(true);
  });

  it("includes appendix images without crashing export", async () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.appendixImages.push({
      id: "img_test",
      prompt: "Resuscitation bay with monitor and airway setup",
      revisedPrompt: "Resuscitation bay with monitor and airway setup",
      caption: "Appendix test image",
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+XlQAAAAASUVORK5CYII=",
      mimeType: "image/png",
      model: "gpt-image-1.5",
      size: "1024x1024",
      createdAt: "2026-03-02T00:00:00.000Z",
    });

    const buffer = await buildScenarioDocx(scenario);
    expect(buffer.byteLength).toBeGreaterThan(1400);
  });
});
