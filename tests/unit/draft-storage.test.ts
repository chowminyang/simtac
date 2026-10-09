import { describe, expect, it } from "vitest";
import { parseDraft } from "@/lib/draft-storage";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";

describe("draft recovery", () => {
  it("restores legacy drafts and field/state protection without losing authored values", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.courseInfo.courseTitle = "Author's course";
    const restored = parseDraft(JSON.stringify({ scenario, mode: "worksheet_assist", lockedFields: { "courseInfo.courseTitle": true }, lockedScenarioFlowStates: { 0: true } }));
    expect(restored.scenario).toEqual(scenario);
    expect(restored.lockedFields?.["courseInfo.courseTitle"]).toBe(true);
    expect(restored.lockedScenarioFlowStates?.["0"]).toBe(true);
  });
  it("rejects unrelated JSON, invalid fields, oversized files and external images", () => {
    expect(() => parseDraft("{}")).toThrow();
    expect(() => parseDraft(JSON.stringify({ scenario: { courseInfo: { courseTitle: 12 } } }))).toThrow();
    expect(() => parseDraft(" ".repeat(25_000_001))).toThrow("too large");
    expect(() => parseDraft(JSON.stringify({ scenario: { ...DEFAULT_SCENARIO, appendixImages: [{ dataUrl: "https://example.com/image.png" }] } }))).toThrow("unsupported image");
  });
});
