import { z } from "zod";
import { scenarioDocumentSchema } from "./scenario-schema";

// Passthrough preserves preferences from older drafts; validated fields are used by the editor.
const draftSchema = z.object({
  scenario: scenarioDocumentSchema,
  mode: z.enum(["ai_prompt", "worksheet_assist"]).nullable().optional(),
  prompt: z.string().max(12000).optional(),
  lockedSections: z.record(z.string(), z.boolean()).optional(),
  lockedScenarioFlowStates: z.record(z.string(), z.boolean()).optional(),
  lockedFields: z.record(z.string(), z.boolean()).optional(),
}).passthrough();

export function parseDraft(raw: string) {
  if (raw.length > 25_000_000) throw new Error("This backup is too large (maximum 25 MB).");
  const input: unknown = JSON.parse(raw);
  if (!input || typeof input !== "object" || !("scenario" in input) ||
      !input.scenario || typeof input.scenario !== "object" ||
      !("courseInfo" in input.scenario)) {
    throw new Error("Choose a SIMTAC draft backup containing a scenario.");
  }
  const result = draftSchema.safeParse(input);
  if (!result.success) throw new Error("This draft has invalid fields. Your current scenario has been kept.");
  // Generated image URLs are rendered/exported; backups must contain image bytes, not external resources.
  if (result.data.scenario.appendixImages.some((image) =>
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(image.dataUrl))) {
    throw new Error("This backup contains an unsupported image. Your current scenario has been kept.");
  }
  return result.data;
}
