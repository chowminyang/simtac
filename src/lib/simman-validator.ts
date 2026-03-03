import {
  ALLOWED_BOWEL_SOUNDS,
  ALLOWED_HEART_SOUNDS,
  ALLOWED_LUNG_SOUNDS,
  ALLOWED_MONITOR_LAYOUTS,
  ALLOWED_MONITOR_PARAMETERS,
  ALLOWED_SIMMAN_CAPABILITIES,
  MONITOR_LIMITS,
} from "./simman-catalog";
import { isValidDmyDate, normalizeToDmyDate } from "./date-format";
import type { ScenarioDocument, ValidationWarning } from "./types";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function closestMatches(value: string, options: readonly string[], limit = 3): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return options.slice(0, limit);

  return [...options]
    .map((option) => ({
      option,
      score: levenshtein(normalized, option.toLowerCase()),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.option);
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function isAllowedTaggedValue(value: string, options: readonly string[]): boolean {
  const normalized = normalizeToken(value);
  if (!normalized) return false;

  return options.some((option) => {
    const allowed = normalizeToken(option);
    if (allowed === normalized) return true;

    if (normalized.length >= 4 && (allowed.includes(normalized) || normalized.includes(allowed))) {
      return true;
    }

    return false;
  });
}

function extractTaggedValues(text: string, label: string): string[] {
  const pattern = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, "gi");
  const matches: string[] = [];
  let match = pattern.exec(text);
  while (match) {
    matches.push(match[1].trim());
    match = pattern.exec(text);
  }
  return matches;
}

function containsSimManTag(text: string): boolean {
  return /(Heart Sound|Lung Sound|Bowel Sound|Capability)\s*:/i.test(text);
}

function buildScenarioText(scenario: ScenarioDocument): string {
  const rows = scenario.scenarioFlow
    .flatMap((row) => [
      row.stateName,
      ...row.physicalExamDisplayedOnSimMan,
      ...row.physicalExamVolunteeredByInstructor,
      ...row.investigations,
      ...row.expectedActions,
      ...row.remarks,
      ...row.instructorControl,
    ])
    .join("\n");

  return [scenario.scenarioInfo.scenarioSummary || "", scenario.scenarioInfo.scenarioInformationToTrainees || "", rows].join("\n");
}

export function validateScenarioAgainstSimMan(scenario: ScenarioDocument): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const dateFields: Array<{ fieldPath: "documentInfo.dateScenarioDeveloped" | "documentInfo.dateScenarioUpdated"; value: string; label: string }> = [
    {
      fieldPath: "documentInfo.dateScenarioDeveloped",
      value: scenario.documentInfo.dateScenarioDeveloped,
      label: "Date Scenario Developed",
    },
    {
      fieldPath: "documentInfo.dateScenarioUpdated",
      value: scenario.documentInfo.dateScenarioUpdated,
      label: "Date Scenario Updated",
    },
  ];

  dateFields.forEach(({ fieldPath, value, label }) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isValidDmyDate(trimmed)) return;

    const normalizedCandidate = normalizeToDmyDate(trimmed);
    warnings.push({
      code: "INVALID_DATE_FORMAT",
      message: `${label} must be in DD/MM/YYYY format.`,
      fieldPath,
      suggestedAlternatives: isValidDmyDate(normalizedCandidate) ? [normalizedCandidate] : ["DD/MM/YYYY"],
    });
  });

  const invalidLayouts = scenario.monitorSetup.layout.filter(
    (layout) => !ALLOWED_MONITOR_LAYOUTS.includes(layout as (typeof ALLOWED_MONITOR_LAYOUTS)[number]),
  );

  invalidLayouts.forEach((layout) => {
    warnings.push({
      code: "INVALID_MONITOR_LAYOUT",
      message: `Monitor layout '${layout}' is not supported by the SIMTAC worksheet template.`,
      fieldPath: "monitorSetup.layout",
      suggestedAlternatives: closestMatches(layout, ALLOWED_MONITOR_LAYOUTS),
    });
  });

  const invalidParameters = scenario.monitorSetup.parameters.filter(
    (parameter) => !ALLOWED_MONITOR_PARAMETERS.includes(parameter as (typeof ALLOWED_MONITOR_PARAMETERS)[number]),
  );

  invalidParameters.forEach((parameter) => {
    warnings.push({
      code: "INVALID_MONITOR_PARAMETER",
      message: `Monitor parameter '${parameter}' is not listed in allowed SimMan monitor parameters.`,
      fieldPath: "monitorSetup.parameters",
      suggestedAlternatives: closestMatches(parameter, ALLOWED_MONITOR_PARAMETERS),
    });
  });

  if (scenario.monitorSetup.parameters.length > MONITOR_LIMITS.maxNumericParameters) {
    warnings.push({
      code: "MONITOR_PARAMETER_LIMIT_EXCEEDED",
      message: `Selected ${scenario.monitorSetup.parameters.length} monitor parameters. Maximum allowed is ${MONITOR_LIMITS.maxNumericParameters}.`,
      fieldPath: "monitorSetup.parameters",
      suggestedAlternatives: scenario.monitorSetup.parameters.slice(0, MONITOR_LIMITS.maxNumericParameters),
    });
  }

  if (scenario.monitorSetup.layout.length > MONITOR_LIMITS.maxWaveforms) {
    warnings.push({
      code: "MONITOR_WAVEFORM_LIMIT_EXCEEDED",
      message: `Selected ${scenario.monitorSetup.layout.length} waveform layouts. Maximum allowed is ${MONITOR_LIMITS.maxWaveforms}.`,
      fieldPath: "monitorSetup.layout",
      suggestedAlternatives: scenario.monitorSetup.layout.slice(0, MONITOR_LIMITS.maxWaveforms),
    });
  }

  const scenarioText = buildScenarioText(scenario);

  scenario.scenarioFlow.forEach((row, rowIndex) => {
    row.physicalExamVolunteeredByInstructor
      .filter((entry) => containsSimManTag(entry))
      .forEach(() => {
        warnings.push({
          code: "SIMMAN_TAG_IN_INSTRUCTOR_FIELD",
          message:
            "SimMan-specific tags were found in 'Physical exam (Volunteered by instructor)'. Move simulator-displayed findings to 'Physical exam (Displayed on SimMan)'.",
          fieldPath: `scenarioFlow.${rowIndex}.physicalExamVolunteeredByInstructor`,
        });
      });
  });

  const heartSounds = extractTaggedValues(scenarioText, "Heart Sound");
  const lungSounds = extractTaggedValues(scenarioText, "Lung Sound");
  const bowelSounds = extractTaggedValues(scenarioText, "Bowel Sound");
  const capabilities = extractTaggedValues(scenarioText, "Capability");

  heartSounds
    .filter((sound) => !isAllowedTaggedValue(sound, ALLOWED_HEART_SOUNDS))
    .forEach((sound) => {
      warnings.push({
        code: "UNSUPPORTED_HEART_SOUND",
        message: `Heart sound '${sound}' is not supported in current SimMan preset list.`,
        fieldPath: "scenarioFlow",
        suggestedAlternatives: closestMatches(sound, ALLOWED_HEART_SOUNDS),
      });
    });

  lungSounds
    .filter((sound) => !isAllowedTaggedValue(sound, ALLOWED_LUNG_SOUNDS))
    .forEach((sound) => {
      warnings.push({
        code: "UNSUPPORTED_LUNG_SOUND",
        message: `Lung sound '${sound}' is not supported in current SimMan preset list.`,
        fieldPath: "scenarioFlow",
        suggestedAlternatives: closestMatches(sound, ALLOWED_LUNG_SOUNDS),
      });
    });

  bowelSounds
    .filter((sound) => !isAllowedTaggedValue(sound, ALLOWED_BOWEL_SOUNDS))
    .forEach((sound) => {
      warnings.push({
        code: "UNSUPPORTED_BOWEL_SOUND",
        message: `Bowel sound '${sound}' is not supported in current SimMan preset list.`,
        fieldPath: "scenarioFlow",
        suggestedAlternatives: closestMatches(sound, ALLOWED_BOWEL_SOUNDS),
      });
    });

  capabilities
    .filter((capability) => !isAllowedTaggedValue(capability, ALLOWED_SIMMAN_CAPABILITIES))
    .forEach((capability) => {
      warnings.push({
        code: "UNSUPPORTED_SIMMAN_CAPABILITY",
        message: `Capability '${capability}' is not in the known SimMan capability set.`,
        fieldPath: "scenarioFlow",
        suggestedAlternatives: closestMatches(capability, ALLOWED_SIMMAN_CAPABILITIES),
      });
    });

  return warnings;
}
