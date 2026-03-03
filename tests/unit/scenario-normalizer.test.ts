import { describe, expect, it } from "vitest";

import { normalizeScenarioForSimMan } from "@/lib/scenario-normalizer";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";

describe("normalizeScenarioForSimMan", () => {
  it("maps legacy physicalExam content into physicalExamDisplayedOnSimMan", () => {
    const legacy = structuredClone(DEFAULT_SCENARIO) as typeof DEFAULT_SCENARIO & {
      scenarioFlow: Array<{ physicalExam?: string[] }>;
    };

    legacy.scenarioFlow[0].physicalExamDisplayedOnSimMan = [];
    legacy.scenarioFlow[0].physicalExam = ["Lung Sound: Wheezing"];

    const normalized = normalizeScenarioForSimMan(legacy);
    expect(normalized.scenarioFlow[0].physicalExamDisplayedOnSimMan).toEqual(["Lung Sound: Wheezing"]);
  });

  it("normalizes document dates to DD/MM/YYYY", () => {
    const scenario = structuredClone(DEFAULT_SCENARIO);
    scenario.documentInfo.dateScenarioDeveloped = "2026-03-03";
    scenario.documentInfo.dateScenarioUpdated = "3-3-2026";

    const normalized = normalizeScenarioForSimMan(scenario);
    expect(normalized.documentInfo.dateScenarioDeveloped).toBe("03/03/2026");
    expect(normalized.documentInfo.dateScenarioUpdated).toBe("03/03/2026");
  });
});
