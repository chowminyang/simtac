import { describe, expect, it } from "vitest";

import { mergeScenarioWithFillMissing } from "@/lib/generation";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";

describe("mergeScenarioWithFillMissing", () => {
  it("preserves non-empty user values while filling missing values", () => {
    const current = structuredClone(DEFAULT_SCENARIO);
    current.courseInfo.courseTitle = "Surgical Sepsis Deterioration Drill";
    current.courseInfo.scenarioTitle = "Post-op Abdominal Sepsis to Shock";
    current.patientInfo.name = "Ms. Nadia Rahman";
    current.objectives = ["Recognize postoperative sepsis early."];

    const generated = structuredClone(DEFAULT_SCENARIO);
    generated.courseInfo.courseTitle = "";
    generated.courseInfo.scenarioTitle = "";
    generated.courseInfo.department = "General Surgery";
    generated.patientInfo.name = "";
    generated.patientInfo.age = "58";
    generated.objectives = [
      "Generated objective that should not replace manual objective.",
      "Escalate to vasopressor support when hypotension persists after fluids.",
    ];

    const merged = mergeScenarioWithFillMissing(current, generated);

    expect(merged.courseInfo.courseTitle).toBe("Surgical Sepsis Deterioration Drill");
    expect(merged.courseInfo.scenarioTitle).toBe("Post-op Abdominal Sepsis to Shock");
    expect(merged.patientInfo.name).toBe("Ms. Nadia Rahman");
    expect(merged.courseInfo.department).toBe("General Surgery");
    expect(merged.patientInfo.age).toBe("58");
    expect(merged.objectives[0]).toBe("Recognize postoperative sepsis early.");
    expect(merged.objectives[1]).toBe(
      "Escalate to vasopressor support when hypotension persists after fluids.",
    );
  });
});
