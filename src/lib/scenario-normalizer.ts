import {
  ALLOWED_MONITOR_LAYOUTS,
  ALLOWED_MONITOR_PARAMETERS,
  MONITOR_LIMITS,
} from "./simman-catalog";
import { normalizeToDmyDate } from "./date-format";
import type { ScenarioDocument } from "./types";

const layoutSynonyms: Record<string, (typeof ALLOWED_MONITOR_LAYOUTS)[number]> = {
  "5waveform": "5 waveform",
  "4waveform": "4 waveform",
  "3waveform": "3 waveform",
  "bignum": "Big Num layout",
  "big num": "Big Num layout",
};

const parameterSynonyms: Record<string, (typeof ALLOWED_MONITOR_PARAMETERS)[number]> = {
  "primary ecg": "Primary Electrocardiogram",
  "ecg": "Primary Electrocardiogram",
  "ecg lead ii": "Primary Electrocardiogram",
  "heart rate": "HR- Heart Rate",
  "heart rate and rhythm": "HR- Heart Rate",
  "oxygen saturation": "SPO2 (Plethysmogram)",
  "oxygen saturation with plethysmography": "SPO2 (Plethysmogram)",
  "spo2": "SPO2 (Plethysmogram)",
  "non-invasive blood pressure": "NBP- Non-invasive Blood Pressure",
  "non-invasive blood pressure cycling q2 min": "NBP- Non-invasive Blood Pressure",
  "nibp": "NBP- Non-invasive Blood Pressure",
  "respiratory rate": "RR - Airway Respiration Rate",
  "rr": "RR - Airway Respiration Rate",
  "temperature": "TPeri - Peripheral Temperature",
  "etco2": "CO2 – End-tidal Carbon Dioxide",
  "end-tidal co2": "CO2 – End-tidal Carbon Dioxide",
  "pulse": "Pulse",
};

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function normalizeLayout(layout: string): string | null {
  if (ALLOWED_MONITOR_LAYOUTS.includes(layout as (typeof ALLOWED_MONITOR_LAYOUTS)[number])) {
    return layout;
  }

  const normalized = normalizeToken(layout);
  if (layoutSynonyms[normalized]) {
    return layoutSynonyms[normalized];
  }

  return null;
}

function normalizeParameter(parameter: string): string | null {
  if (ALLOWED_MONITOR_PARAMETERS.includes(parameter as (typeof ALLOWED_MONITOR_PARAMETERS)[number])) {
    return parameter;
  }

  const normalized = normalizeToken(parameter);
  if (parameterSynonyms[normalized]) {
    return parameterSynonyms[normalized];
  }

  for (const allowed of ALLOWED_MONITOR_PARAMETERS) {
    const allowedNormalized = normalizeToken(allowed);
    if (allowedNormalized.includes(normalized) || normalized.includes(allowedNormalized)) {
      return allowed;
    }
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function normalizeScenarioForSimMan(scenario: ScenarioDocument): ScenarioDocument {
  const normalized = structuredClone(scenario);

  normalized.scenarioFlow = normalized.scenarioFlow.map((row) => {
    const legacyPhysicalExam = toStringArray((row as typeof row & { physicalExam?: unknown }).physicalExam);
    const displayedOnSimMan = toStringArray(row.physicalExamDisplayedOnSimMan);
    const volunteeredByInstructor = toStringArray(row.physicalExamVolunteeredByInstructor);

    return {
      ...row,
      physicalExamDisplayedOnSimMan:
        displayedOnSimMan.length > 0 ? displayedOnSimMan : legacyPhysicalExam,
      physicalExamVolunteeredByInstructor: volunteeredByInstructor,
    };
  });

  const normalizedLayouts = normalized.monitorSetup.layout
    .map((layout) => normalizeLayout(layout))
    .filter((value): value is string => Boolean(value));

  normalized.monitorSetup.layout = Array.from(new Set(normalizedLayouts)).slice(0, MONITOR_LIMITS.maxWaveforms);
  if (normalized.monitorSetup.layout.length === 0) {
    normalized.monitorSetup.layout = ["5 waveform"];
  }

  const normalizedParameters = normalized.monitorSetup.parameters
    .map((parameter) => normalizeParameter(parameter))
    .filter((value): value is string => Boolean(value));

  normalized.monitorSetup.parameters = Array.from(new Set(normalizedParameters)).slice(0, MONITOR_LIMITS.maxNumericParameters);
  if (normalized.monitorSetup.parameters.length === 0) {
    normalized.monitorSetup.parameters = [
      "Primary Electrocardiogram",
      "SPO2 (Plethysmogram)",
      "NBP- Non-invasive Blood Pressure",
      "HR- Heart Rate",
      "Pulse",
    ];
  }

  normalized.documentInfo.dateScenarioDeveloped = normalizeToDmyDate(normalized.documentInfo.dateScenarioDeveloped);
  normalized.documentInfo.dateScenarioUpdated = normalizeToDmyDate(normalized.documentInfo.dateScenarioUpdated);

  return normalized;
}
