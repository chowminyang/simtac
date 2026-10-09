import { describe, expect, it } from "vitest";

import { mapThinkingToReasoningEffort } from "@/lib/reasoning";

describe("mapThinkingToReasoningEffort", () => {
  it("maps depth levels 0/1/2 to none/low/medium and safely caps 3/4 to medium", () => {
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 0 })).toBe("none");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 1 })).toBe("low");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 2 })).toBe("medium");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 3 })).toBe("medium");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 4 })).toBe("medium");
  });
  it("uses the minimum supported reasoning for Sol and Astra overrides", () => {
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 0 }, "gpt-6.1-sol")).toBe("low");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 0 }, "gpt-6-astra")).toBe("low");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 0 }, "gpt-6-luna")).toBe("none");
  });
});
