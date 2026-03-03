import { describe, expect, it } from "vitest";

import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";
import { validateScenarioAgainstSimMan } from "@/lib/simman-validator";

describe("validateScenarioAgainstSimMan", () => {
  it("flags unsupported monitor parameters and sounds", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.monitorSetup.parameters.push("Imaginary Parameter X");
    scenario.scenarioFlow[0].remarks = ["Heart Sound: Unknown Thunder Murmur"];

    const warnings = validateScenarioAgainstSimMan(scenario);

    expect(warnings.some((warning) => warning.code === "INVALID_MONITOR_PARAMETER")).toBe(true);
    expect(warnings.some((warning) => warning.code === "UNSUPPORTED_HEART_SOUND")).toBe(true);
  });

  it("passes base scenario without warnings for defaults", () => {
    const warnings = validateScenarioAgainstSimMan(DEFAULT_SCENARIO);
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("flags SimMan tags placed in instructor-volunteered physical exam field", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.scenarioFlow[0].physicalExamVolunteeredByInstructor = ["Capability: Cardiac rhythm changes"];

    const warnings = validateScenarioAgainstSimMan(scenario);
    expect(warnings.some((warning) => warning.code === "SIMMAN_TAG_IN_INSTRUCTOR_FIELD")).toBe(true);
  });

  it("flags non-DD/MM/YYYY document dates", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.documentInfo.dateScenarioDeveloped = "2026-03-03";

    const warnings = validateScenarioAgainstSimMan(scenario);
    expect(warnings.some((warning) => warning.code === "INVALID_DATE_FORMAT")).toBe(true);
  });

  it("accepts DD/MM/YYYY document dates", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.documentInfo.dateScenarioDeveloped = "03/03/2026";
    scenario.documentInfo.dateScenarioUpdated = "04/03/2026";

    const warnings = validateScenarioAgainstSimMan(scenario);
    expect(warnings.some((warning) => warning.code === "INVALID_DATE_FORMAT")).toBe(false);
  });
});
