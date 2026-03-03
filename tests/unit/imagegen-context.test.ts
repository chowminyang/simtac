import { describe, expect, it } from "vitest";

import { buildSingaporeContextPrompt, SINGAPORE_IMAGE_CONTEXT } from "@/app/api/imagegen/generate/route";

describe("image generation Singapore context", () => {
  it("prefixes user prompt with Singapore healthcare context instructions", () => {
    const userPrompt = "Emergency airway management in a resus bay";
    const finalPrompt = buildSingaporeContextPrompt(userPrompt);

    expect(finalPrompt).toContain(SINGAPORE_IMAGE_CONTEXT);
    expect(finalPrompt).toContain("Singapore healthcare simulation training context");
    expect(finalPrompt).toContain("User prompt:");
    expect(finalPrompt).toContain(userPrompt);
  });

  it("trims extra whitespace in user prompt", () => {
    const finalPrompt = buildSingaporeContextPrompt("  ED chest pain team training  ");

    expect(finalPrompt).toContain("ED chest pain team training");
    expect(finalPrompt).not.toContain("  ED chest pain team training  ");
  });
});
