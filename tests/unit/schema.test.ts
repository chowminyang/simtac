import { describe, expect, it } from "vitest";

import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";
import { scenarioDocumentSchema } from "@/lib/scenario-schema";

describe("scenarioDocumentSchema", () => {
  it("accepts default scenario", () => {
    const parsed = scenarioDocumentSchema.parse(DEFAULT_SCENARIO);
    expect(parsed.courseInfo).toBeDefined();
    expect(Array.isArray(parsed.scenarioFlow)).toBe(true);
  });

  it("rejects invalid patient field types", () => {
    const bad = structuredClone(DEFAULT_SCENARIO);
    // @ts-expect-error intentional invalid type for test
    bad.patientInfo.age = { years: 70 };

    const result = scenarioDocumentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts split physical exam fields in scenario flow", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.scenarioFlow[0].physicalExamDisplayedOnSimMan = ["Lung Sound: Wheezing"];
    scenario.scenarioFlow[0].physicalExamVolunteeredByInstructor = ["Patient reports chest tightness for 2 hours."];

    const parsed = scenarioDocumentSchema.parse(scenario);
    expect(parsed.scenarioFlow[0].physicalExamDisplayedOnSimMan).toEqual(["Lung Sound: Wheezing"]);
    expect(parsed.scenarioFlow[0].physicalExamVolunteeredByInstructor).toEqual([
      "Patient reports chest tightness for 2 hours.",
    ]);
  });
});
