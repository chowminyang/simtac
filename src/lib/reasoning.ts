import type { GenerationConfig } from "./types";

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export function mapThinkingToReasoningEffort(config: GenerationConfig): ReasoningEffort {
  if (config.thinkingDepth <= 0) return "none";
  if (config.thinkingDepth === 1) return "low";
  if (config.thinkingDepth === 2) return "medium";
  return "high";
}

export function resolveModel(): string {
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}
