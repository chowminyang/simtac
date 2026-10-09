import type { GenerationConfig } from "./types";

export type ReasoningEffort = "none" | "low" | "medium";

export function mapThinkingToReasoningEffort(config: GenerationConfig, model = resolveModel()): ReasoningEffort {
  if (config.thinkingDepth <= 0) return /^(gpt-6\.1-sol|gpt-6-astra)/.test(model) ? "low" : "none";
  if (config.thinkingDepth === 1) return "low";
  return "medium";
}

export function resolveModel(): string {
  return process.env.OPENAI_MODEL || "gpt-6-luna";
}
