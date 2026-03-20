import { zodTextFormat } from "openai/helpers/zod";

import {
  generationResponsePayloadSchema,
  scenarioDocumentSchema,
  type ScenarioFillSectionRequest,
  type ScenarioGenerateRequest,
} from "./scenario-schema";
import { getOpenAIClient, getVectorStoreId } from "./openai-client";
import { mapThinkingToReasoningEffort, resolveModel } from "./reasoning";
import { normalizeScenarioForSimMan } from "./scenario-normalizer";
import {
  ALLOWED_BOWEL_SOUNDS,
  ALLOWED_HEART_SOUNDS,
  ALLOWED_LUNG_SOUNDS,
  ALLOWED_MONITOR_LAYOUTS,
  ALLOWED_MONITOR_PARAMETERS,
  ALLOWED_SIMMAN_CAPABILITIES,
} from "./simman-catalog";
import { validateScenarioAgainstSimMan } from "./simman-validator";
import type { Citation, GenerationResponsePayload, ScenarioDocument } from "./types";

const MAX_PROMPT_CHARS = 12000;
const MAX_SCENARIO_JSON_CHARS = 90000;

const SYSTEM_PROMPT = `You are SIMTAC Scenario Builder AI.
Generate complete, clinically coherent medical simulation scenarios.
Rules:
1) Always return JSON that matches the requested schema exactly.
2) Keep scenario in SIMTAC section order and ensure each section is usable in an exported worksheet.
3) Use only supported SimMan features and known monitor/sound presets when possible.
4) For any explicit sound reference, use tags in free text: Heart Sound: <value>, Lung Sound: <value>, Bowel Sound: <value>.
5) For explicit simulator capability references, use tag: Capability: <value>.
6) In each scenario flow state, use physicalExamDisplayedOnSimMan only for findings directly shown or audible on SimMan and keep them aligned to known SimMan capabilities/sounds.
7) Use physicalExamVolunteeredByInstructor for findings/history provided verbally by the instructor and not directly displayed on SimMan.
8) Keep language professional, concise, and instructor-facing.
9) Scenario flow must contain actionable state-by-state instructions, expected actions, and instructor control cues.
10) Any explicit date fields (for example dateScenarioDeveloped/dateScenarioUpdated) must be formatted as DD/MM/YYYY.`;

const SINGAPORE_CONTEXT_PROMPT = `Local context defaults:
- Assume Singapore healthcare context by default (acute hospital, ED, ICU, ward, or OT simulation setting in Singapore).
- Use Singapore-relevant clinical workflow language (for example MO, registrar/resident, consultant, nursing handover with SBAR/ISBAR, institutional escalation pathways).
- Use SI units and clinically realistic values appropriate for local practice (for example mmol/L, kPa or mmHg, mg, mcg, mL, kg).
- Prefer generic medication names and practical dosing formats used in hospital training scenarios.
- Avoid non-Singapore administrative references (for example US insurance or billing workflows) unless the user explicitly requests another country context.
- If the user specifies a different country/system, follow the user instruction and note the override clearly in scenarioInfo.scenarioSummary.`;

const STRICT_VALUE_PROMPT = `Use exact values from these allowed sets whenever generating monitor setup and tags:
- Monitor layouts: ${ALLOWED_MONITOR_LAYOUTS.join(" | ")}
- Monitor parameters: ${ALLOWED_MONITOR_PARAMETERS.join(" | ")}
- Heart Sound tags: ${ALLOWED_HEART_SOUNDS.join(" | ")}
- Lung Sound tags: ${ALLOWED_LUNG_SOUNDS.join(" | ")}
- Bowel Sound tags: ${ALLOWED_BOWEL_SOUNDS.join(" | ")}
- Capability tags: ${ALLOWED_SIMMAN_CAPABILITIES.join(" | ")}

If an exact allowed value is not appropriate, avoid creating that tag instead of inventing unsupported values.`;

function assertPromptBounds(prompt: string | undefined): void {
  if (!prompt) return;
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new Error(`Prompt exceeds ${MAX_PROMPT_CHARS} characters.`);
  }
}

function assertScenarioBounds(scenario: ScenarioDocument | undefined): void {
  if (!scenario) return;
  const serialized = JSON.stringify(scenario);
  if (serialized.length > MAX_SCENARIO_JSON_CHARS) {
    throw new Error(
      `Scenario payload exceeds ${MAX_SCENARIO_JSON_CHARS} characters. Remove very large free-text blocks and retry.`,
    );
  }
}

function buildRetrievalTool() {
  const vectorStoreId = getVectorStoreId();
  if (!vectorStoreId) return undefined;

  return [
    {
      type: "file_search" as const,
      vector_store_ids: [vectorStoreId],
      max_num_results: 12,
    },
  ];
}

type FileSearchCallResult = {
  filename?: string;
  file_id?: string;
  text?: string;
};

type FileSearchCallOutputItem = {
  type: "file_search_call";
  results?: FileSearchCallResult[] | null;
};

type ResponseWithOutput = {
  output?: Array<FileSearchCallOutputItem | { type: string }>;
};

function isFileSearchCallOutputItem(
  item: FileSearchCallOutputItem | { type: string },
): item is FileSearchCallOutputItem {
  return item.type === "file_search_call";
}

function extractCitationsFromResponse(response: ResponseWithOutput): Citation[] {
  const citations: Citation[] = [];

  for (const item of response?.output || []) {
    if (isFileSearchCallOutputItem(item) && Array.isArray(item.results)) {
      for (const result of item.results) {
        const source = result.filename || result.file_id || "knowledge-file";
        citations.push({
          source,
          excerpt: typeof result.text === "string" ? result.text.slice(0, 240) : undefined,
        });
      }
    }
  }

  return citations;
}

export function fillMissingValue(current: unknown, generated: unknown): unknown {
  if (typeof current === "string") {
    return current.trim() ? current : typeof generated === "string" ? generated : current;
  }

  if (typeof current === "boolean") {
    return current;
  }

  if (Array.isArray(current)) {
    if (!Array.isArray(generated)) return current;
    if (current.length === 0) return generated;

    const merged = current.map((entry, index) => fillMissingValue(entry, generated[index]));
    if (generated.length > merged.length) {
      merged.push(...generated.slice(merged.length));
    }
    return merged;
  }

  if (current && typeof current === "object") {
    const currentObject = current as Record<string, unknown>;
    const generatedObject = generated && typeof generated === "object" ? (generated as Record<string, unknown>) : {};

    const mergedObject: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(currentObject), ...Object.keys(generatedObject)]);

    keys.forEach((key) => {
      mergedObject[key] = fillMissingValue(currentObject[key], generatedObject[key]);
    });

    return mergedObject;
  }

  return generated ?? current;
}

export function mergeScenarioWithFillMissing(
  scenario: ScenarioDocument,
  generated: ScenarioDocument,
): ScenarioDocument {
  return fillMissingValue(scenario, generated) as ScenarioDocument;
}

function mergeSectionWithFillMissing<K extends keyof ScenarioDocument>(
  scenario: ScenarioDocument,
  generated: ScenarioDocument,
  section: K,
): ScenarioDocument {
  const merged = { ...scenario } as ScenarioDocument;
  merged[section] = fillMissingValue(scenario[section], generated[section]) as ScenarioDocument[K];
  return merged;
}

function preserveAppendixImages(base: ScenarioDocument, source: ScenarioDocument | undefined): ScenarioDocument {
  return {
    ...base,
    appendixImages: source?.appendixImages || [],
  };
}

function buildTextConfig(model: string, format: ReturnType<typeof zodTextFormat>) {
  return model === "gpt-5.4-mini"
    ? {
        format,
        verbosity: "low" as const,
      }
    : {
        format,
      };
}

export async function generateScenario(request: ScenarioGenerateRequest): Promise<GenerationResponsePayload> {
  assertPromptBounds(request.prompt);
  assertScenarioBounds(request.scenario);

  const client = getOpenAIClient();
  const model = resolveModel();
  const reasoningEffort = mapThinkingToReasoningEffort(request.config);

  const worksheetGuidance = request.prompt?.trim() ? `\n\nUser guidance:\n${request.prompt.trim()}` : "";
  const userPrompt =
    request.mode === "ai_prompt"
      ? `Create a complete scenario from this prompt:\n${request.prompt || ""}`
      : `You are completing a partially prepared SIMTAC worksheet JSON.\nCurrent scenario JSON:\n${JSON.stringify(
          request.scenario || {},
          null,
          2,
        )}\n\nRequirements:
- Fill blank fields across all sections (1-14) with coherent, practical content.
- Preserve all non-empty user-provided values.
- Build a complete scenario flow with 4-6 clinically progressive states and clear transitions.
- Populate objectives, equipment, simulator prep, monitor setup, and debrief sections with realistic details.
- In scenarioFlow, split physical exam content into physicalExamDisplayedOnSimMan and physicalExamVolunteeredByInstructor.
- Keep values compatible with SimMan constraints and allowed monitor/sound/capability sets.
- Return complete scenario JSON only.${worksheetGuidance}`;

  const response = await client.responses.parse({
    model,
    reasoning: { effort: reasoningEffort },
    max_output_tokens: 8000,
    include: ["file_search_call.results"],
    tools: buildRetrievalTool(),
    text: buildTextConfig(model, zodTextFormat(generationResponsePayloadSchema, "scenario_generation")),
    input: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n${SINGAPORE_CONTEXT_PROMPT}\n${STRICT_VALUE_PROMPT}`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const parsed = generationResponsePayloadSchema.parse(
    response.output_parsed || {
      scenario: {},
      warnings: [],
      citations: [],
    },
  );

  const generatedScenario = normalizeScenarioForSimMan(scenarioDocumentSchema.parse(parsed.scenario));
  const scenario = preserveAppendixImages(
    request.mode === "worksheet_assist" && request.scenario
      ? normalizeScenarioForSimMan(mergeScenarioWithFillMissing(request.scenario, generatedScenario))
      : generatedScenario,
    request.scenario,
  );
  const localWarnings = validateScenarioAgainstSimMan(scenario);

  return {
    scenario,
    warnings: [...parsed.warnings, ...localWarnings],
    citations: parsed.citations.length ? parsed.citations : extractCitationsFromResponse(response),
  };
}

export async function fillScenarioSection(
  request: ScenarioFillSectionRequest,
): Promise<GenerationResponsePayload> {
  assertPromptBounds(request.prompt);
  assertScenarioBounds(request.scenario);

  const client = getOpenAIClient();
  const model = resolveModel();
  const reasoningEffort = mapThinkingToReasoningEffort(request.config);

  const sectionPrompt = request.prompt?.trim() ? `Additional instruction: ${request.prompt}` : "";

  const response = await client.responses.parse({
    model,
    reasoning: { effort: reasoningEffort },
    max_output_tokens: 7000,
    include: ["file_search_call.results"],
    tools: buildRetrievalTool(),
    text: buildTextConfig(model, zodTextFormat(scenarioDocumentSchema, "scenario_document")),
    input: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n${SINGAPORE_CONTEXT_PROMPT}\n${STRICT_VALUE_PROMPT}\nYou are filling only one section while keeping all existing values intact unless blank.`,
      },
      {
        role: "user",
        content: `Section to fill: ${request.section}.\nCurrent scenario JSON:\n${JSON.stringify(
          request.scenario,
          null,
          2,
        )}\n\nReturn a complete scenario JSON. Fill missing details in the requested section only.${sectionPrompt}`,
      },
    ],
  });

  const generatedScenario = normalizeScenarioForSimMan(
    scenarioDocumentSchema.parse(response.output_parsed || {}),
  );
  const merged = normalizeScenarioForSimMan(
    mergeSectionWithFillMissing(request.scenario, generatedScenario, request.section),
  );
  const mergedWithImages = preserveAppendixImages(merged, request.scenario);
  const warnings = validateScenarioAgainstSimMan(mergedWithImages);

  return {
    scenario: mergedWithImages,
    warnings,
    citations: extractCitationsFromResponse(response),
  };
}
