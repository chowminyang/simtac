import type { GenerationConfig } from "./types";

export type ReasoningEffort = "none" | "low" | "medium";

export function mapThinkingToReasoningEffort(config: GenerationConfig): ReasoningEffort {
  if (config.thinkingDepth <= 0) return "none";
  if (config.thinkingDepth === 1) return "low";
  return "medium";
}

export function resolveModel(): string {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}
