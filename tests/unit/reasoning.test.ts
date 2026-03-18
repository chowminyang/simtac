import { describe, expect, it } from "vitest";

import { mapThinkingToReasoningEffort } from "@/lib/reasoning";

describe("mapThinkingToReasoningEffort", () => {
  it("maps depth levels 0/1/2 to none/low/medium and 3/4 to high", () => {
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 0 })).toBe("none");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 1 })).toBe("low");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 2 })).toBe("medium");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 3 })).toBe("high");
    expect(mapThinkingToReasoningEffort({ thinkingDepth: 4 })).toBe("high");
  });
});
