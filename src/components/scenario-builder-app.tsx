"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { normalizeToDmyDate } from "@/lib/date-format";
import { formatFieldLabel } from "@/lib/label-format";
import { DEFAULT_SCENARIO } from "@/lib/scenario-defaults";
import {
  ALLOWED_MONITOR_LAYOUTS,
  ALLOWED_MONITOR_PARAMETERS,
} from "@/lib/simman-catalog";
import type {
  Citation,
  GenerationMode,
  ScenarioAppendixImage,
  ScenarioDocument,
  ScenarioStateRow,
  ThinkingDepth,
  ValidationWarning,
} from "@/lib/types";

type SectionKey =
  | "courseInfo"
  | "objectives"
  | "clinicalSetting"
  | "instructors"
  | "confederates"
  | "traineeRoles"
  | "patientInfo"
  | "scenarioInfo"
  | "scenarioFlow"
  | "equipment"
  | "debriefInfo"
  | "simulatorPrep"
  | "monitorSetup"
  | "documentInfo";

type NavigationSectionKey = SectionKey | "appendixImages";

const SECTION_LIST: Array<{ key: SectionKey; label: string }> = [
  { key: "courseInfo", label: "1. Course & Trainee" },
  { key: "objectives", label: "2. Learning Objectives" },
  { key: "clinicalSetting", label: "3. Clinical Setting" },
  { key: "instructors", label: "4. Instructors" },
  { key: "confederates", label: "5. Confederates" },
  { key: "traineeRoles", label: "6. Trainee Roles" },
  { key: "patientInfo", label: "7. Patient Information" },
  { key: "scenarioInfo", label: "8. Scenario Information" },
  { key: "scenarioFlow", label: "9. Scenario Flow" },
  { key: "equipment", label: "10. Equipment" },
  { key: "debriefInfo", label: "11. Debrief Info" },
  { key: "simulatorPrep", label: "12. Simulator Prep" },
  { key: "monitorSetup", label: "13. Monitor Setup" },
  { key: "documentInfo", label: "14. Document Info" },
];

const NAV_SECTION_LIST: Array<{ key: NavigationSectionKey; label: string }> = [
  ...SECTION_LIST,
  { key: "appendixImages", label: "15. Simulation Images" },
];
const SECTION_KEY_SET = new Set<SectionKey>(SECTION_LIST.map((section) => section.key));

const STORAGE_KEY = "simtac_scenario_builder_v1";

const EMPTY_STATE_ROW: ScenarioStateRow = {
  stateName: "",
  vitalSigns: { bp: "", pr: "", rr: "", spo2: "", rhythm: "" },
  physicalExamDisplayedOnSimMan: [""],
  physicalExamVolunteeredByInstructor: [""],
  investigations: [""],
  expectedActions: [""],
  remarks: [""],
  instructorControl: [""],
  transitionRule: "next",
};

const SCENARIO_FLOW_EXPORT_COLUMNS = [
  { key: "stateName", label: "State" },
  { key: "vitalSigns", label: "Vital Signs" },
  { key: "physicalExamDisplayedOnSimMan", label: "Physical Exam (Displayed on SimMan)" },
  { key: "physicalExamVolunteeredByInstructor", label: "Physical Exam (Volunteered by Instructor)" },
  { key: "investigations", label: "Investigations" },
  { key: "expectedActions", label: "Expected Actions" },
  { key: "remarks", label: "Remarks" },
  { key: "instructorControl", label: "Instructor Control" },
  { key: "transitionRule", label: "Transition: next / auto / handler" },
] as const;

type ScenarioFlowExportColumnKey = (typeof SCENARIO_FLOW_EXPORT_COLUMNS)[number]["key"];

const DEFAULT_SCENARIO_FLOW_EXPORT_COLUMNS: ScenarioFlowExportColumnKey[] = SCENARIO_FLOW_EXPORT_COLUMNS.map(
  (column) => column.key,
);

function normalizeIdentificationNo(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
  if (!compact) return "";

  const prefix = compact.slice(0, 1).replace(/[^A-Z]/g, "");
  const digits = compact.slice(1, 8).replace(/\D/g, "");
  const suffix = compact.slice(8, 9).replace(/[^A-Z]/g, "");

  return `${prefix}${digits}${suffix}`;
}

function buildSectionLockState(defaultValue = false): Record<SectionKey, boolean> {
  return SECTION_LIST.reduce(
    (acc, section) => {
      acc[section.key] = defaultValue;
      return acc;
    },
    {} as Record<SectionKey, boolean>,
  );
}

function buildUnlockedGenerationScenario(
  currentScenario: ScenarioDocument,
  lockedSections: Record<SectionKey, boolean>,
): ScenarioDocument {
  const draft = structuredClone(currentScenario);

  for (const section of SECTION_LIST) {
    if (lockedSections[section.key]) continue;

    switch (section.key) {
      case "objectives": {
        const count = Math.max(currentScenario.objectives.length, 1);
        draft.objectives = Array.from({ length: count }, () => "");
        break;
      }
      case "instructors": {
        const count = Math.max(currentScenario.instructors.length, 1);
        draft.instructors = Array.from({ length: count }, () => "");
        break;
      }
      case "confederates": {
        const count = Math.max(currentScenario.confederates.length, 1);
        draft.confederates = Array.from({ length: count }, () => "");
        break;
      }
      case "traineeRoles": {
        const count = Math.max(currentScenario.traineeRoles.length, 1);
        draft.traineeRoles = Array.from({ length: count }, () => "");
        break;
      }
      case "scenarioFlow": {
        const count = Math.max(currentScenario.scenarioFlow.length, 1);
        draft.scenarioFlow = Array.from({ length: count }, () => structuredClone(EMPTY_STATE_ROW));
        break;
      }
      case "equipment": {
        const count = Math.max(currentScenario.equipment.length, 1);
        draft.equipment = Array.from({ length: count }, (_, index) => ({
          category: index === 0 ? "Airway and breathing" : "",
          item: "",
          quantity: "",
          remarks: "",
        }));
        break;
      }
      case "simulatorPrep": {
        const count = Math.max(currentScenario.simulatorPrep.length, 1);
        draft.simulatorPrep = Array.from({ length: count }, () => "");
        break;
      }
      default: {
        draft[section.key] = structuredClone(DEFAULT_SCENARIO[section.key]) as never;
      }
    }
  }

  return draft;
}

function parsePath(path: string): Array<string | number> {
  return path.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function getValueAtPath(source: unknown, path: string): unknown {
  const parts = parsePath(path);
  let current: unknown = source;

  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part as string];
  }

  return current;
}

function setValueAtPath(target: unknown, path: string, value: unknown): void {
  const parts = parsePath(path);
  if (parts.length === 0) return;

  let current: unknown = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (current == null) return;
    current = (current as Record<string, unknown>)[parts[index] as string];
  }

  if (current == null) return;
  const last = parts[parts.length - 1];
  (current as Record<string, unknown>)[last as string] = value;
}

function applyLockedFieldValues(
  scenarioToPatch: ScenarioDocument,
  currentScenario: ScenarioDocument,
  lockedFields: Record<string, boolean>,
): ScenarioDocument {
  const patched = structuredClone(scenarioToPatch);

  for (const [path, locked] of Object.entries(lockedFields)) {
    if (!locked) continue;
    const value = getValueAtPath(currentScenario, path);
    if (value === undefined) continue;
    setValueAtPath(patched, path, structuredClone(value));
  }

  return patched;
}

function applyAllLocksToScenario(
  scenarioToPatch: ScenarioDocument,
  currentScenario: ScenarioDocument,
  lockedSections: Record<SectionKey, boolean>,
  lockedScenarioFlowStates: Record<number, boolean>,
  lockedFields: Record<string, boolean>,
): ScenarioDocument {
  const patched = structuredClone(scenarioToPatch);

  for (const section of SECTION_LIST) {
    if (!lockedSections[section.key]) continue;
    patched[section.key] = structuredClone(currentScenario[section.key]) as never;
  }

  for (const [key, locked] of Object.entries(lockedScenarioFlowStates)) {
    if (!locked) continue;
    const index = Number.parseInt(key, 10);
    if (!Number.isFinite(index) || index < 0) continue;
    if (!currentScenario.scenarioFlow[index]) continue;

    while (patched.scenarioFlow.length <= index) {
      patched.scenarioFlow.push(structuredClone(EMPTY_STATE_ROW));
    }
    patched.scenarioFlow[index] = structuredClone(currentScenario.scenarioFlow[index]);
  }

  return applyLockedFieldValues(patched, currentScenario, lockedFields);
}

function reindexScenarioFlowStateLocksAfterRemove(
  current: Record<number, boolean>,
  removedIndex: number,
): Record<number, boolean> {
  const next: Record<number, boolean> = {};

  for (const [key, locked] of Object.entries(current)) {
    if (!locked) continue;
    const index = Number.parseInt(key, 10);
    if (!Number.isFinite(index) || index < 0) continue;
    if (index === removedIndex) continue;
    const adjustedIndex = index > removedIndex ? index - 1 : index;
    next[adjustedIndex] = true;
  }

  return next;
}

function reindexScenarioFlowFieldLocksAfterRemove(
  current: Record<string, boolean>,
  removedIndex: number,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const [path, locked] of Object.entries(current)) {
    if (!locked) continue;

    const match = path.match(/^scenarioFlow\.(\d+)(.*)$/);
    if (!match) {
      next[path] = true;
      continue;
    }

    const index = Number.parseInt(match[1], 10);
    if (!Number.isFinite(index) || index < 0) continue;
    if (index === removedIndex) continue;

    const adjustedIndex = index > removedIndex ? index - 1 : index;
    next[`scenarioFlow.${adjustedIndex}${match[2]}`] = true;
  }

  return next;
}

function reindexSelectedFieldPathAfterScenarioFlowRemove(path: string, removedIndex: number): string {
  if (!path) return path;

  const match = path.match(/^scenarioFlow\.(\d+)(.*)$/);
  if (!match) return path;

  const index = Number.parseInt(match[1], 10);
  if (!Number.isFinite(index) || index < 0) return path;
  if (index === removedIndex) return "";

  const adjustedIndex = index > removedIndex ? index - 1 : index;
  return `scenarioFlow.${adjustedIndex}${match[2]}`;
}

function remapScenarioFlowIndexForMove(index: number, fromIndex: number, toIndex: number): number {
  if (index === fromIndex) return toIndex;
  if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
  if (fromIndex > toIndex && index >= toIndex && index < fromIndex) return index + 1;
  return index;
}

function reindexScenarioFlowStateLocksAfterMove(
  current: Record<number, boolean>,
  fromIndex: number,
  toIndex: number,
): Record<number, boolean> {
  const next: Record<number, boolean> = {};

  for (const [key, locked] of Object.entries(current)) {
    if (!locked) continue;
    const index = Number.parseInt(key, 10);
    if (!Number.isFinite(index) || index < 0) continue;
    next[remapScenarioFlowIndexForMove(index, fromIndex, toIndex)] = true;
  }

  return next;
}

function reindexScenarioFlowFieldLocksAfterMove(
  current: Record<string, boolean>,
  fromIndex: number,
  toIndex: number,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const [path, locked] of Object.entries(current)) {
    if (!locked) continue;

    const match = path.match(/^scenarioFlow\.(\d+)(.*)$/);
    if (!match) {
      next[path] = true;
      continue;
    }

    const index = Number.parseInt(match[1], 10);
    if (!Number.isFinite(index) || index < 0) continue;
    const adjustedIndex = remapScenarioFlowIndexForMove(index, fromIndex, toIndex);
    next[`scenarioFlow.${adjustedIndex}${match[2]}`] = true;
  }

  return next;
}

function reindexSelectedFieldPathAfterScenarioFlowMove(path: string, fromIndex: number, toIndex: number): string {
  if (!path) return path;

  const match = path.match(/^scenarioFlow\.(\d+)(.*)$/);
  if (!match) return path;

  const index = Number.parseInt(match[1], 10);
  if (!Number.isFinite(index) || index < 0) return path;

  return `scenarioFlow.${remapScenarioFlowIndexForMove(index, fromIndex, toIndex)}${match[2]}`;
}

function arrayFromTextarea(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function textareaFromArray(values: string[]): string {
  return values.join("\n");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeScenarioFlowRow(row: ScenarioStateRow): ScenarioStateRow {
  const legacyPhysicalExam = toStringArray((row as ScenarioStateRow & { physicalExam?: unknown }).physicalExam);
  const displayedOnSimMan = toStringArray(row.physicalExamDisplayedOnSimMan);
  const volunteeredByInstructor = toStringArray(row.physicalExamVolunteeredByInstructor);

  return {
    ...EMPTY_STATE_ROW,
    ...row,
    vitalSigns: {
      ...EMPTY_STATE_ROW.vitalSigns,
      ...(row.vitalSigns || {}),
    },
    physicalExamDisplayedOnSimMan:
      displayedOnSimMan.length > 0 ? displayedOnSimMan : legacyPhysicalExam,
    physicalExamVolunteeredByInstructor: volunteeredByInstructor,
    investigations: toStringArray(row.investigations),
    expectedActions: toStringArray(row.expectedActions),
    remarks: toStringArray(row.remarks),
    instructorControl: toStringArray(row.instructorControl),
  };
}

function normalizeScenario(scenario: ScenarioDocument): ScenarioDocument {
  const normalizedScenarioFlow =
    Array.isArray(scenario.scenarioFlow) && scenario.scenarioFlow.length > 0
      ? scenario.scenarioFlow.map((row) => normalizeScenarioFlowRow(row))
      : [
          {
            ...EMPTY_STATE_ROW,
          },
        ];

  return {
    ...scenario,
    patientInfo: {
      ...scenario.patientInfo,
      identificationNo: normalizeIdentificationNo(scenario.patientInfo.identificationNo || ""),
    },
    documentInfo: {
      ...scenario.documentInfo,
      dateScenarioDeveloped: normalizeToDmyDate(scenario.documentInfo.dateScenarioDeveloped),
      dateScenarioUpdated: normalizeToDmyDate(scenario.documentInfo.dateScenarioUpdated),
    },
    scenarioFlow: normalizedScenarioFlow,
    equipment:
      scenario.equipment.length > 0
        ? scenario.equipment
        : [
            {
              category: "Airway and breathing",
              item: "",
              quantity: "",
              remarks: "",
            },
          ],
    appendixImages: Array.isArray(scenario.appendixImages) ? scenario.appendixImages : [],
  };
}

export function ScenarioBuilderApp() {
  const [scenario, setScenario] = useState<ScenarioDocument>(DEFAULT_SCENARIO);
  const [mode, setMode] = useState<GenerationMode | null>(null);
  const [prompt, setPrompt] = useState("");
  const [thinkingDepth, setThinkingDepth] = useState<ThinkingDepth>(1);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeSection, setActiveSection] = useState<NavigationSectionKey>("courseInfo");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [lockedSections, setLockedSections] = useState<Record<SectionKey, boolean>>(
    buildSectionLockState(false),
  );
  const [lockedScenarioFlowStates, setLockedScenarioFlowStates] = useState<Record<number, boolean>>({});
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [, setSelectedFieldPath] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1024x1024" | "1536x1024" | "1024x1536" | "auto">("1536x1024");
  const [imageQuality, setImageQuality] = useState<"low" | "medium" | "high" | "auto">("medium");
  const [generatedImages, setGeneratedImages] = useState<ScenarioAppendixImage[]>([]);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<ScenarioAppendixImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busySection, setBusySection] = useState<SectionKey | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDialogPrompt, setUpdateDialogPrompt] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedScenarioFlowExportColumns, setSelectedScenarioFlowExportColumns] = useState<
    ScenarioFlowExportColumnKey[]
  >([...DEFAULT_SCENARIO_FLOW_EXPORT_COLUMNS]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sectionRefs = useRef<Record<NavigationSectionKey, HTMLElement | null>>({
    courseInfo: null,
    objectives: null,
    clinicalSetting: null,
    instructors: null,
    confederates: null,
    traineeRoles: null,
    patientInfo: null,
    scenarioInfo: null,
    scenarioFlow: null,
    equipment: null,
    debriefInfo: null,
    simulatorPrep: null,
    monitorSetup: null,
    documentInfo: null,
    appendixImages: null,
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.scenario) setScenario(normalizeScenario(parsed.scenario as ScenarioDocument));
      if (parsed.mode) setMode(parsed.mode as GenerationMode);
      if (parsed.prompt) setPrompt(String(parsed.prompt));
      if (typeof parsed.showLeftSidebar === "boolean") {
        setShowLeftSidebar(parsed.showLeftSidebar);
      }
      if (typeof parsed.showRightSidebar === "boolean") {
        setShowRightSidebar(parsed.showRightSidebar);
      }
      if (
        parsed.thinkingDepth === 0 ||
        parsed.thinkingDepth === 1 ||
        parsed.thinkingDepth === 2 ||
        parsed.thinkingDepth === 3 ||
        parsed.thinkingDepth === 4
      ) {
        setThinkingDepth((parsed.thinkingDepth >= 2 ? 2 : parsed.thinkingDepth) as ThinkingDepth);
      }
      if (parsed.imagePrompt) setImagePrompt(String(parsed.imagePrompt));
      if (
        parsed.imageSize === "1024x1024" ||
        parsed.imageSize === "1536x1024" ||
        parsed.imageSize === "1024x1536" ||
        parsed.imageSize === "auto"
      ) {
        setImageSize(parsed.imageSize);
      }
      if (
        parsed.imageQuality === "low" ||
        parsed.imageQuality === "medium" ||
        parsed.imageQuality === "high" ||
        parsed.imageQuality === "auto"
      ) {
        setImageQuality(parsed.imageQuality);
      }
      if (Array.isArray(parsed.warnings)) setWarnings(parsed.warnings as ValidationWarning[]);
      if (Array.isArray(parsed.citations)) setCitations(parsed.citations as Citation[]);
      if (parsed.lockedSections && typeof parsed.lockedSections === "object") {
        const restored = buildSectionLockState(false);
        for (const section of SECTION_LIST) {
          if (parsed.lockedSections[section.key]) restored[section.key] = true;
        }
        setLockedSections(restored);
      }
      if (parsed.lockedScenarioFlowStates && typeof parsed.lockedScenarioFlowStates === "object") {
        const restored: Record<number, boolean> = {};
        Object.entries(parsed.lockedScenarioFlowStates as Record<string, unknown>).forEach(([key, value]) => {
          const index = Number.parseInt(key, 10);
          if (!Number.isFinite(index) || index < 0) return;
          if (value) restored[index] = true;
        });
        setLockedScenarioFlowStates(restored);
      }
    } catch {
      // ignore corrupt local storage payload
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scenario,
          mode,
          prompt,
          showLeftSidebar,
          showRightSidebar,
          thinkingDepth,
          imagePrompt,
          imageSize,
          imageQuality,
          warnings,
          citations,
          lockedSections,
          lockedScenarioFlowStates,
        }),
      );
    } catch {
      // ignore storage quota errors for large scenarios containing images
    }
  }, [
    scenario,
    mode,
    prompt,
    showLeftSidebar,
    showRightSidebar,
    thinkingDepth,
    imagePrompt,
    imageSize,
    imageQuality,
    warnings,
    citations,
    lockedSections,
    lockedScenarioFlowStates,
  ]);

  useEffect(() => {
    setLockedScenarioFlowStates((current) => {
      const next: Record<number, boolean> = {};
      for (const [key, locked] of Object.entries(current)) {
        if (!locked) continue;
        const index = Number.parseInt(key, 10);
        if (!Number.isFinite(index) || index < 0) continue;
        if (index >= scenario.scenarioFlow.length) continue;
        next[index] = true;
      }
      return next;
    });
  }, [scenario.scenarioFlow.length]);

  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  const config = useMemo(
    () => ({
      thinkingDepth,
    }),
    [thinkingDepth],
  );

  const latestRefinementSource = useMemo(() => {
    if (generatedImages.length > 0) return generatedImages[0];
    if (scenario.appendixImages.length > 0) return scenario.appendixImages[scenario.appendixImages.length - 1];
    return null;
  }, [generatedImages, scenario.appendixImages]);

  function updateScenario(updater: (draft: ScenarioDocument) => void) {
    setScenario((current) => {
      const draft = structuredClone(current);
      updater(draft);
      return draft;
    });
  }

  function toggleSectionLock(section: SectionKey) {
    setLockedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function toggleScenarioFlowStateLock(index: number) {
    if (index < 0 || index >= scenario.scenarioFlow.length) return;
    setLockedScenarioFlowStates((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function removeScenarioFlowState(index: number) {
    if (index < 0 || index >= scenario.scenarioFlow.length || scenario.scenarioFlow.length <= 1) return;

    setLockedScenarioFlowStates((current) => reindexScenarioFlowStateLocksAfterRemove(current, index));
    setLockedFields((current) => reindexScenarioFlowFieldLocksAfterRemove(current, index));
    setSelectedFieldPath((current) => reindexSelectedFieldPathAfterScenarioFlowRemove(current, index));

    updateScenario((draft) => {
      if (draft.scenarioFlow.length <= 1) return;
      draft.scenarioFlow.splice(index, 1);
    });
  }

  function moveScenarioFlowState(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (index < 0 || index >= scenario.scenarioFlow.length) return;
    if (nextIndex < 0 || nextIndex >= scenario.scenarioFlow.length) return;

    setLockedScenarioFlowStates((current) => reindexScenarioFlowStateLocksAfterMove(current, index, nextIndex));
    setLockedFields((current) => reindexScenarioFlowFieldLocksAfterMove(current, index, nextIndex));
    setSelectedFieldPath((current) => reindexSelectedFieldPathAfterScenarioFlowMove(current, index, nextIndex));

    updateScenario((draft) => {
      const [movedRow] = draft.scenarioFlow.splice(index, 1);
      if (!movedRow) return;
      draft.scenarioFlow.splice(nextIndex, 0, movedRow);
    });
  }

  function isScenarioFlowStateLocked(index: number): boolean {
    return Boolean(lockedScenarioFlowStates[index]);
  }

  function isFieldLocked(path: string): boolean {
    const scenarioFlowMatch = path.match(/^scenarioFlow\.(\d+)(?:\.|$)/);
    if (scenarioFlowMatch) {
      const stateIndex = Number.parseInt(scenarioFlowMatch[1], 10);
      if (Number.isFinite(stateIndex) && isScenarioFlowStateLocked(stateIndex)) {
        return true;
      }
    }

    if (lockedFields[path]) return true;

    const rootSegment = path.split(".")[0];
    if (SECTION_KEY_SET.has(rootSegment as SectionKey)) {
      return lockedSections[rootSegment as SectionKey];
    }

    return false;
  }

  const lockedSectionCount = useMemo(
    () => SECTION_LIST.reduce((count, section) => count + (lockedSections[section.key] ? 1 : 0), 0),
    [lockedSections],
  );
  const lockedScenarioFlowStateCount = useMemo(
    () => Object.values(lockedScenarioFlowStates).reduce((count, locked) => count + (locked ? 1 : 0), 0),
    [lockedScenarioFlowStates],
  );
  const workspaceGridClass = useMemo(() => {
    if (showLeftSidebar && showRightSidebar) {
      return "grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_360px]";
    }
    if (showLeftSidebar && !showRightSidebar) {
      return "grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]";
    }
    if (!showLeftSidebar && showRightSidebar) {
      return "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]";
    }
    return "grid gap-4";
  }, [showLeftSidebar, showRightSidebar]);

  async function callApi<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async function runGenerate() {
    if (!mode) return;
    setErrorMessage("");
    setStatusMessage("Generating scenario...");
    setBusy(true);

    try {
      const payload =
        mode === "ai_prompt"
          ? {
              mode,
              prompt,
              config,
            }
          : {
              mode,
              prompt,
              scenario,
              config,
            };

      const result = await callApi<{
        scenario: ScenarioDocument;
        warnings: ValidationWarning[];
        citations: Citation[];
      }>("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const lockedAwareScenario = applyAllLocksToScenario(
        result.scenario,
        scenario,
        lockedSections,
        lockedScenarioFlowStates,
        lockedFields,
      );
      setScenario(normalizeScenario(lockedAwareScenario));
      setWarnings(result.warnings || []);
      setCitations(result.citations || []);
      setStatusMessage("Scenario generated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate scenario.");
      setStatusMessage("Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runFillSection(section: SectionKey) {
    if (lockedSections[section]) {
      setStatusMessage(`Section '${section}' is locked. Unlock it to run AI fill.`);
      return;
    }

    setErrorMessage("");
    setBusySection(section);
    setStatusMessage(`Filling ${section} with AI...`);

    try {
      const result = await callApi<{
        scenario: ScenarioDocument;
        warnings: ValidationWarning[];
        citations: Citation[];
      }>("/api/scenario/fill-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          scenario,
          prompt,
          config,
        }),
      });

      const lockedAwareScenario = applyAllLocksToScenario(
        result.scenario,
        scenario,
        lockedSections,
        lockedScenarioFlowStates,
        lockedFields,
      );
      setScenario(normalizeScenario(lockedAwareScenario));
      setWarnings(result.warnings || []);
      setCitations(result.citations || []);
      setStatusMessage(`Section '${section}' filled.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to fill section.");
      setStatusMessage("Section fill failed.");
    } finally {
      setBusySection(null);
    }
  }

  async function runUpdateUnlockedSections(additionalGuidance?: string): Promise<boolean> {
    if (!mode) return false;
    if (lockedSectionCount === SECTION_LIST.length) {
      setErrorMessage("All sections are locked. Unlock at least one section to update with AI.");
      return false;
    }

    setErrorMessage("");
    setStatusMessage("Updating unlocked sections with AI...");
    setBusy(true);

    try {
      const extra = additionalGuidance?.trim() || "";
      const mergedPrompt =
        prompt.trim() && extra
          ? `${prompt.trim()}\n\nUpdate request:\n${extra}`
          : prompt.trim() || (extra ? `Update request:\n${extra}` : "");

      const seededScenario = applyLockedFieldValues(
        buildUnlockedGenerationScenario(scenario, lockedSections),
        scenario,
        lockedFields,
      );
      const result = await callApi<{
        scenario: ScenarioDocument;
        warnings: ValidationWarning[];
        citations: Citation[];
      }>("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "worksheet_assist",
          prompt: mergedPrompt,
          scenario: seededScenario,
          config,
        }),
      });

      const lockedAwareScenario = applyAllLocksToScenario(
        result.scenario,
        scenario,
        lockedSections,
        lockedScenarioFlowStates,
        lockedFields,
      );
      setScenario(normalizeScenario(lockedAwareScenario));
      setWarnings(result.warnings || []);
      setCitations(result.citations || []);
      setStatusMessage("Unlocked sections updated.");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update unlocked sections.");
      setStatusMessage("AI update failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openUpdateUnlockedDialog() {
    if (lockedSectionCount === SECTION_LIST.length) {
      setErrorMessage("All sections are locked. Unlock at least one section to update with AI.");
      return;
    }
    setUpdateDialogPrompt("");
    setUpdateDialogOpen(true);
  }

  async function submitUpdateUnlockedDialog() {
    const success = await runUpdateUnlockedSections(updateDialogPrompt);
    if (success) {
      setUpdateDialogOpen(false);
      setUpdateDialogPrompt("");
    }
  }

  function openExportDialog() {
    setErrorMessage("");
    setSelectedScenarioFlowExportColumns([...DEFAULT_SCENARIO_FLOW_EXPORT_COLUMNS]);
    setExportDialogOpen(true);
  }

  async function runExport(selectedColumns: ScenarioFlowExportColumnKey[]) {
    setErrorMessage("");
    setStatusMessage("Exporting DOCX...");

    try {
      const response = await fetch("/api/scenario/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, scenarioFlowColumns: selectedColumns }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Export failed.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename=\"(.+)\"/);
      const fileName = fileNameMatch?.[1] || "SIMTAC_Scenario.docx";

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      setStatusMessage("DOCX exported.");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed.");
      setStatusMessage("Export failed.");
      return false;
    }
  }

  async function submitExportDialog() {
    if (selectedScenarioFlowExportColumns.length === 0) {
      setErrorMessage("Select at least one Scenario Flow column to export.");
      return;
    }

    const success = await runExport(selectedScenarioFlowExportColumns);
    if (success) {
      setExportDialogOpen(false);
    }
  }

  async function runGenerateImage(
    modeValue: "new" | "refine",
    baseImageDataUrl?: string,
  ) {
    if (!imagePrompt.trim()) {
      setErrorMessage("Enter an image prompt before generating.");
      return;
    }

    if (modeValue === "refine" && !baseImageDataUrl) {
      setErrorMessage("No base image available for refinement.");
      return;
    }

    setErrorMessage("");
    setImageBusy(true);
    setStatusMessage(modeValue === "new" ? "Generating medical image..." : "Refining medical image...");

    try {
      const result = await callApi<{ image: ScenarioAppendixImage }>("/api/imagegen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modeValue,
          prompt: imagePrompt,
          size: imageSize,
          quality: imageQuality,
          baseImageDataUrl,
        }),
      });

      setGeneratedImages((current) => [result.image, ...current].slice(0, 8));
      setStatusMessage(modeValue === "new" ? "Image generated." : "Image refined.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Image generation failed.");
      setStatusMessage("Image generation failed.");
    } finally {
      setImageBusy(false);
    }
  }

  function saveGeneratedImage(image: ScenarioAppendixImage) {
    updateScenario((draft) => {
      draft.appendixImages.push({
        ...image,
        id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
    });
    setGeneratedImages((current) => current.filter((item) => item.id !== image.id));
    setStatusMessage("Image saved to scenario appendix.");
  }

  function removeSavedImage(index: number) {
    const image = scenario.appendixImages[index];
    const draftKey = image?.id || `appendix-${index}`;

    updateScenario((draft) => {
      if (index < 0 || index >= draft.appendixImages.length) return;
      draft.appendixImages.splice(index, 1);
    });

    setCaptionDrafts((current) => {
      if (!(draftKey in current)) return current;
      const next = { ...current };
      delete next[draftKey];
      return next;
    });

    setStatusMessage("Saved appendix image removed.");
  }

  function applyWorkspaceReset(nextMode: GenerationMode | null, nextStatusMessage = "") {
    setMode(nextMode);
    setScenario(structuredClone(DEFAULT_SCENARIO));
    setPrompt("");
    setThinkingDepth(1);
    setWarnings([]);
    setCitations([]);
    setActiveSection("courseInfo");
    setLockedSections(buildSectionLockState(false));
    setLockedScenarioFlowStates({});
    setLockedFields({});
    setSelectedFieldPath("");
    setImagePrompt("");
    setImageSize("1536x1024");
    setImageQuality("medium");
    setGeneratedImages([]);
    setCaptionDrafts({});
    setPreviewImage(null);
    setUpdateDialogOpen(false);
    setUpdateDialogPrompt("");
    setErrorMessage("");
    setStatusMessage(nextStatusMessage);
  }

  function switchMode(nextMode: GenerationMode) {
    applyWorkspaceReset(nextMode);
  }

  function resetAll() {
    if (!window.confirm("Reset the entire scenario workspace? This will clear all current edits.")) {
      return;
    }

    applyWorkspaceReset(mode, "Workspace reset.");
  }

  function jumpToSection(section: NavigationSectionKey) {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#f8f6f1_45%,#f3f3f0_100%)] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight">SIMTAC AI Scenario Builder</h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-700">
                Generate and refine Singapore-context medical simulation scenarios with strict SimMan capability checks and direct DOCX export.
              </p>
              {statusMessage &&
              !statusMessage.startsWith("Generating medical image") &&
              !statusMessage.startsWith("Refining medical image") &&
              !statusMessage.startsWith("Image ") &&
              !statusMessage.startsWith("Saved appendix image") ? (
                <p className="mt-2 text-xs text-slate-600">{statusMessage}</p>
              ) : null}
              {errorMessage ? <p className="mt-1 text-sm text-rose-700">{errorMessage}</p> : null}
            </div>
            <Image
              src="/ttsh-logo.jpg"
              alt="Tan Tock Seng Hospital logo"
              width={496}
              height={308}
              className="h-24 w-auto shrink-0 object-contain sm:h-28 md:h-32"
              unoptimized
              loading="eager"
            />
          </div>
        </header>

        {!mode ? (
          <section className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className="rounded-2xl border border-slate-300 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => switchMode("ai_prompt")}
            >
              <h2 className="text-xl font-semibold">Create with AI</h2>
              <p className="mt-2 text-sm text-slate-700">
                Describe a scenario in free text and let AI build a complete SIMTAC worksheet for Singapore healthcare training.
              </p>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-300 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => switchMode("worksheet_assist")}
            >
              <h2 className="text-xl font-semibold">Fill Worksheet</h2>
              <p className="mt-2 text-sm text-slate-700">
                Fill key worksheet fields manually and use AI to complete missing sections using Singapore-context clinical logic.
              </p>
            </button>
          </section>
        ) : (
          <div className={workspaceGridClass}>
            {showLeftSidebar ? (
              <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                <button
                  type="button"
                  className="mb-3 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-medium"
                  onClick={() => setMode(null)}
                >
                  Back to mode selection
                </button>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ul className="space-y-1">
                    {NAV_SECTION_LIST.map((section) => (
                      <li key={section.key}>
                        <button
                          type="button"
                          onClick={() => jumpToSection(section.key)}
                          className={`w-full rounded-md px-2 py-2 text-left text-xs transition ${
                            activeSection === section.key
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {section.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href="/help"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block w-full rounded-md bg-emerald-700 px-2 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  Getting Started / How To Use
                </a>
              </aside>
            ) : null}

            <main className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Workspace Layout</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium"
                      onClick={() => setShowLeftSidebar((current) => !current)}
                    >
                      {showLeftSidebar ? "Hide Left Sidebar" : "Show Left Sidebar"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium"
                      onClick={() => setShowRightSidebar((current) => !current)}
                    >
                      {showRightSidebar ? "Hide Right Sidebar" : "Show Right Sidebar"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Scenario Prompt</h2>
                <textarea
                  className="mt-2 h-28 w-full rounded-md border border-slate-300 p-2 text-sm"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    mode === "ai_prompt"
                      ? "Describe your scenario goals, progression, expected learner actions, and Singapore clinical context (ward/ED/OT/ICU, team roles, escalation workflow)..."
                      : "Optional guidance for AI filling, e.g. focus on airway escalation, ISBAR/SBAR communication, and local escalation pathways."
                  }
                />
                {mode === "ai_prompt" ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      onClick={runGenerate}
                    >
                      {busy ? "Working..." : "Generate Scenario"}
                    </button>
                  </div>
                ) : null}
              </section>

              <section
                id="courseInfo"
                ref={(element) => {
                  sectionRefs.current.courseInfo = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="1. Course & Trainee Information"
                  onFill={() => runFillSection("courseInfo")}
                  loading={busySection === "courseInfo"}
                  locked={lockedSections.courseInfo}
                />
                <RecordEditor
                  sectionKey="courseInfo"
                  record={scenario.courseInfo}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(key, value) =>
                    updateScenario((draft) => {
                      (draft.courseInfo as unknown as Record<string, string>)[key] = value as string;
                    })
                  }
                />
              </section>

              <section
                id="objectives"
                ref={(element) => {
                  sectionRefs.current.objectives = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="2. Specific Learning Objectives"
                  onFill={() => runFillSection("objectives")}
                  loading={busySection === "objectives"}
                  locked={lockedSections.objectives}
                />
                <ArrayEditor
                  sectionKey="objectives"
                  items={scenario.objectives}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(items) =>
                    updateScenario((draft) => {
                      draft.objectives = items;
                    })
                  }
                />
              </section>

              <section
                id="clinicalSetting"
                ref={(element) => {
                  sectionRefs.current.clinicalSetting = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="3. Clinical / Environment Setting"
                  onFill={() => runFillSection("clinicalSetting")}
                  loading={busySection === "clinicalSetting"}
                  locked={lockedSections.clinicalSetting}
                />
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-600">Clinical setting</label>
                <textarea
                  className={`mb-3 h-16 w-full rounded-md border p-2 text-sm ${
                    isFieldLocked("clinicalSetting.settingRequired")
                      ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                      : "border-slate-300"
                  }`}
                  value={scenario.clinicalSetting.settingRequired}
                  disabled={isFieldLocked("clinicalSetting.settingRequired")}
                  onFocus={() => setSelectedFieldPath("clinicalSetting.settingRequired")}
                  onChange={(event) =>
                    updateScenario((draft) => {
                      draft.clinicalSetting.settingRequired = event.target.value;
                    })
                  }
                />
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-600">Remarks</label>
                <textarea
                  className={`h-16 w-full rounded-md border p-2 text-sm ${
                    isFieldLocked("clinicalSetting.remarks")
                      ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                      : "border-slate-300"
                  }`}
                  value={scenario.clinicalSetting.remarks || ""}
                  disabled={isFieldLocked("clinicalSetting.remarks")}
                  onFocus={() => setSelectedFieldPath("clinicalSetting.remarks")}
                  onChange={(event) =>
                    updateScenario((draft) => {
                      draft.clinicalSetting.remarks = event.target.value;
                    })
                  }
                />
              </section>

              <section
                id="instructors"
                ref={(element) => {
                  sectionRefs.current.instructors = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="4. Instructor Information"
                  onFill={() => runFillSection("instructors")}
                  loading={busySection === "instructors"}
                  locked={lockedSections.instructors}
                />
                <ArrayEditor
                  sectionKey="instructors"
                  items={scenario.instructors}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(items) =>
                    updateScenario((draft) => {
                      draft.instructors = items;
                    })
                  }
                />
              </section>

              <section
                id="confederates"
                ref={(element) => {
                  sectionRefs.current.confederates = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="5. Confederate Information"
                  onFill={() => runFillSection("confederates")}
                  loading={busySection === "confederates"}
                  locked={lockedSections.confederates}
                />
                <ArrayEditor
                  sectionKey="confederates"
                  items={scenario.confederates}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(items) =>
                    updateScenario((draft) => {
                      draft.confederates = items;
                    })
                  }
                />
              </section>

              <section
                id="traineeRoles"
                ref={(element) => {
                  sectionRefs.current.traineeRoles = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="6. Trainees Role"
                  onFill={() => runFillSection("traineeRoles")}
                  loading={busySection === "traineeRoles"}
                  locked={lockedSections.traineeRoles}
                />
                <ArrayEditor
                  sectionKey="traineeRoles"
                  items={scenario.traineeRoles}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(items) =>
                    updateScenario((draft) => {
                      draft.traineeRoles = items;
                    })
                  }
                />
              </section>

              <section
                id="patientInfo"
                ref={(element) => {
                  sectionRefs.current.patientInfo = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="7. Patient Information"
                  onFill={() => runFillSection("patientInfo")}
                  loading={busySection === "patientInfo"}
                  locked={lockedSections.patientInfo}
                />
                <RecordEditor
                  sectionKey="patientInfo"
                  record={scenario.patientInfo}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(key, value) =>
                    updateScenario((draft) => {
                      (draft.patientInfo as unknown as Record<string, string | boolean>)[key] = value;
                    })
                  }
                />
              </section>

              <section
                id="scenarioInfo"
                ref={(element) => {
                  sectionRefs.current.scenarioInfo = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="8. Scenario Information"
                  onFill={() => runFillSection("scenarioInfo")}
                  loading={busySection === "scenarioInfo"}
                  locked={lockedSections.scenarioInfo}
                />
                <RecordEditor
                  sectionKey="scenarioInfo"
                  record={scenario.scenarioInfo}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(key, value) =>
                    updateScenario((draft) => {
                      (draft.scenarioInfo as unknown as Record<string, string>)[key] = value as string;
                    })
                  }
                />
              </section>

              <section
                id="scenarioFlow"
                ref={(element) => {
                  sectionRefs.current.scenarioFlow = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="9. Scenario Flow"
                  onFill={() => runFillSection("scenarioFlow")}
                  loading={busySection === "scenarioFlow"}
                  locked={lockedSections.scenarioFlow}
                />
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-700">State-by-state simulator control and expected action flow.</p>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium"
                    disabled={lockedSections.scenarioFlow}
                    onClick={() =>
                      updateScenario((draft) => {
                        draft.scenarioFlow.push(structuredClone(EMPTY_STATE_ROW));
                      })
                    }
                  >
                    + Add state
                  </button>
                </div>
                <div className="space-y-4">
                  {scenario.scenarioFlow.map((row, rowIndex) => {
                    const stateLocked = isScenarioFlowStateLocked(rowIndex);

                    return (
                    <div
                      key={`scenario-row-${rowIndex}`}
                      className={`rounded-xl border p-3 ${
                        stateLocked
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">State {rowIndex + 1}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                            disabled={lockedSections.scenarioFlow || rowIndex === 0}
                            onClick={() => moveScenarioFlowState(rowIndex, -1)}
                            aria-label={`Move State ${rowIndex + 1} up`}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                            disabled={lockedSections.scenarioFlow || rowIndex === scenario.scenarioFlow.length - 1}
                            onClick={() => moveScenarioFlowState(rowIndex, 1)}
                            aria-label={`Move State ${rowIndex + 1} down`}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={`rounded-md border px-2 py-1 text-xs font-medium ${
                              stateLocked
                                ? "border-amber-400 bg-amber-100 text-amber-900"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                            disabled={lockedSections.scenarioFlow}
                            onClick={() => toggleScenarioFlowStateLock(rowIndex)}
                          >
                            {stateLocked ? "Unlock state" : "Lock state"}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                            disabled={scenario.scenarioFlow.length <= 1 || lockedSections.scenarioFlow || stateLocked}
                            onClick={() => removeScenarioFlowState(rowIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">State name</label>
                      <input
                        className={`mb-3 w-full rounded-md border px-2 py-1 text-sm ${
                          isFieldLocked(`scenarioFlow.${rowIndex}.stateName`)
                            ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                            : "border-slate-300"
                        }`}
                        value={row.stateName}
                        disabled={isFieldLocked(`scenarioFlow.${rowIndex}.stateName`)}
                        onFocus={() => setSelectedFieldPath(`scenarioFlow.${rowIndex}.stateName`)}
                        onChange={(event) =>
                          updateScenario((draft) => {
                            draft.scenarioFlow[rowIndex].stateName = event.target.value;
                          })
                        }
                      />

                      <div className="mb-3 grid gap-2 sm:grid-cols-5">
                        {(["bp", "pr", "rr", "spo2", "rhythm"] as const).map((key) => (
                          <label key={key} className="text-xs text-slate-700">
                            <span className="mb-1 block uppercase">{key}</span>
                            <input
                              className={`w-full rounded-md border px-2 py-1 text-sm ${
                                isFieldLocked(`scenarioFlow.${rowIndex}.vitalSigns.${key}`)
                                  ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                  : "border-slate-300"
                              }`}
                              value={row.vitalSigns[key] || ""}
                              disabled={isFieldLocked(`scenarioFlow.${rowIndex}.vitalSigns.${key}`)}
                              onFocus={() => setSelectedFieldPath(`scenarioFlow.${rowIndex}.vitalSigns.${key}`)}
                              onChange={(event) =>
                                updateScenario((draft) => {
                                  draft.scenarioFlow[rowIndex].vitalSigns[key] = event.target.value;
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <LabeledTextArea
                          label="Physical exam (Displayed on SimMan only)"
                          path={`scenarioFlow.${rowIndex}.physicalExamDisplayedOnSimMan`}
                          value={textareaFromArray(row.physicalExamDisplayedOnSimMan)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].physicalExamDisplayedOnSimMan = arrayFromTextarea(value);
                            })
                          }
                        />
                        <LabeledTextArea
                          label="Physical exam (Volunteered by instructor)"
                          path={`scenarioFlow.${rowIndex}.physicalExamVolunteeredByInstructor`}
                          value={textareaFromArray(row.physicalExamVolunteeredByInstructor)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].physicalExamVolunteeredByInstructor = arrayFromTextarea(value);
                            })
                          }
                        />
                        <LabeledTextArea
                          label="Investigations"
                          path={`scenarioFlow.${rowIndex}.investigations`}
                          value={textareaFromArray(row.investigations)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].investigations = arrayFromTextarea(value);
                            })
                          }
                        />
                        <LabeledTextArea
                          label="Expected actions"
                          path={`scenarioFlow.${rowIndex}.expectedActions`}
                          value={textareaFromArray(row.expectedActions)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].expectedActions = arrayFromTextarea(value);
                            })
                          }
                        />
                        <LabeledTextArea
                          label="Remarks"
                          path={`scenarioFlow.${rowIndex}.remarks`}
                          value={textareaFromArray(row.remarks)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].remarks = arrayFromTextarea(value);
                            })
                          }
                        />
                        <LabeledTextArea
                          label="Instructor control"
                          path={`scenarioFlow.${rowIndex}.instructorControl`}
                          value={textareaFromArray(row.instructorControl)}
                          isFieldLocked={isFieldLocked}
                          onFieldFocus={setSelectedFieldPath}
                          onChange={(value) =>
                            updateScenario((draft) => {
                              draft.scenarioFlow[rowIndex].instructorControl = arrayFromTextarea(value);
                            })
                          }
                        />
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
                          Transition: next / auto / handler
                          <select
                            className={`mt-1 w-full rounded-md border px-2 py-1 text-sm ${
                              isFieldLocked(`scenarioFlow.${rowIndex}.transitionRule`)
                                ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                : "border-slate-300"
                            }`}
                            value={row.transitionRule || "next"}
                            disabled={isFieldLocked(`scenarioFlow.${rowIndex}.transitionRule`)}
                            onFocus={() => setSelectedFieldPath(`scenarioFlow.${rowIndex}.transitionRule`)}
                            onChange={(event) =>
                              updateScenario((draft) => {
                                draft.scenarioFlow[rowIndex].transitionRule = event.target.value;
                              })
                            }
                          >
                            <option value="next">next</option>
                            <option value="auto">auto</option>
                            <option value="handler">handler</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </section>

              <section
                id="equipment"
                ref={(element) => {
                  sectionRefs.current.equipment = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="10. Equipment"
                  onFill={() => runFillSection("equipment")}
                  loading={busySection === "equipment"}
                  locked={lockedSections.equipment}
                />
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium"
                    disabled={lockedSections.equipment}
                    onClick={() =>
                      updateScenario((draft) => {
                        draft.equipment.push({ category: "", item: "", quantity: "", remarks: "" });
                      })
                    }
                  >
                    + Add equipment row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1 text-left">Category</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Item</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Qty</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Remarks</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenario.equipment.map((item, index) => (
                        <tr key={`equipment-${index}`}>
                          <td className="border border-slate-300 p-1 align-top">
                            <textarea
                              rows={2}
                              className={`min-h-[64px] w-full resize-y rounded border px-2 py-1 leading-relaxed ${
                                isFieldLocked(`equipment.${index}.category`)
                                  ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                  : "border-slate-300"
                              }`}
                              value={item.category}
                              disabled={isFieldLocked(`equipment.${index}.category`)}
                              onFocus={() => setSelectedFieldPath(`equipment.${index}.category`)}
                              onChange={(event) =>
                                updateScenario((draft) => {
                                  draft.equipment[index].category = event.target.value;
                                })
                              }
                            />
                          </td>
                          <td className="border border-slate-300 p-1 align-top">
                            <textarea
                              rows={3}
                              className={`min-h-[84px] w-full resize-y rounded border px-2 py-1 leading-relaxed ${
                                isFieldLocked(`equipment.${index}.item`)
                                  ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                  : "border-slate-300"
                              }`}
                              value={item.item}
                              disabled={isFieldLocked(`equipment.${index}.item`)}
                              onFocus={() => setSelectedFieldPath(`equipment.${index}.item`)}
                              onChange={(event) =>
                                updateScenario((draft) => {
                                  draft.equipment[index].item = event.target.value;
                                })
                              }
                            />
                          </td>
                          <td className="border border-slate-300 p-1 align-top">
                            <input
                              className={`w-full rounded border px-2 py-1 ${
                                isFieldLocked(`equipment.${index}.quantity`)
                                  ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                  : "border-slate-300"
                              }`}
                              value={item.quantity || ""}
                              disabled={isFieldLocked(`equipment.${index}.quantity`)}
                              onFocus={() => setSelectedFieldPath(`equipment.${index}.quantity`)}
                              onChange={(event) =>
                                updateScenario((draft) => {
                                  draft.equipment[index].quantity = event.target.value;
                                })
                              }
                            />
                          </td>
                          <td className="border border-slate-300 p-1 align-top">
                            <textarea
                              rows={3}
                              className={`min-h-[84px] w-full resize-y rounded border px-2 py-1 leading-relaxed ${
                                isFieldLocked(`equipment.${index}.remarks`)
                                  ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                                  : "border-slate-300"
                              }`}
                              value={item.remarks || ""}
                              disabled={isFieldLocked(`equipment.${index}.remarks`)}
                              onFocus={() => setSelectedFieldPath(`equipment.${index}.remarks`)}
                              onChange={(event) =>
                                updateScenario((draft) => {
                                  draft.equipment[index].remarks = event.target.value;
                                })
                              }
                            />
                          </td>
                          <td className="border border-slate-300 p-1 align-top">
                            <button
                              type="button"
                              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              disabled={scenario.equipment.length <= 1 || lockedSections.equipment}
                              onClick={() =>
                                updateScenario((draft) => {
                                  if (draft.equipment.length <= 1) return;
                                  draft.equipment.splice(index, 1);
                                })
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                id="debriefInfo"
                ref={(element) => {
                  sectionRefs.current.debriefInfo = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="11. Debrief Information"
                  onFill={() => runFillSection("debriefInfo")}
                  loading={busySection === "debriefInfo"}
                  locked={lockedSections.debriefInfo}
                />
                <RecordEditor
                  sectionKey="debriefInfo"
                  record={scenario.debriefInfo}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(key, value) =>
                    updateScenario((draft) => {
                      (draft.debriefInfo as unknown as Record<string, string>)[key] = value as string;
                    })
                  }
                />
              </section>

              <section
                id="simulatorPrep"
                ref={(element) => {
                  sectionRefs.current.simulatorPrep = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="12. Simulator / SP / Task Trainer Preparation"
                  onFill={() => runFillSection("simulatorPrep")}
                  loading={busySection === "simulatorPrep"}
                  locked={lockedSections.simulatorPrep}
                />
                <ArrayEditor
                  sectionKey="simulatorPrep"
                  items={scenario.simulatorPrep}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(items) =>
                    updateScenario((draft) => {
                      draft.simulatorPrep = items;
                    })
                  }
                />
              </section>

              <section
                id="monitorSetup"
                ref={(element) => {
                  sectionRefs.current.monitorSetup = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="13. Patient Monitor Setup"
                  onFill={() => runFillSection("monitorSetup")}
                  loading={busySection === "monitorSetup"}
                  locked={lockedSections.monitorSetup}
                />

                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Monitor Layout</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ALLOWED_MONITOR_LAYOUTS.map((layout) => (
                      <label
                        key={layout}
                        className={`flex items-center gap-2 rounded border px-2 py-1 text-sm ${
                          isFieldLocked("monitorSetup.layout")
                            ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                            : "border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={scenario.monitorSetup.layout.includes(layout)}
                          disabled={isFieldLocked("monitorSetup.layout")}
                          onFocus={() => setSelectedFieldPath("monitorSetup.layout")}
                          onChange={(event) =>
                            updateScenario((draft) => {
                              const set = new Set(draft.monitorSetup.layout);
                              if (event.target.checked) {
                                set.add(layout);
                              } else {
                                set.delete(layout);
                              }
                              draft.monitorSetup.layout = [...set];
                            })
                          }
                        />
                        {layout}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Monitor Parameters</p>
                  <div className="max-h-64 overflow-y-auto rounded border border-slate-300 p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ALLOWED_MONITOR_PARAMETERS.map((parameter) => (
                        <label
                          key={parameter}
                          className={`flex items-center gap-2 rounded border px-2 py-1 text-sm ${
                            isFieldLocked("monitorSetup.parameters")
                              ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100"
                              : "border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={scenario.monitorSetup.parameters.includes(parameter)}
                            disabled={isFieldLocked("monitorSetup.parameters")}
                            onFocus={() => setSelectedFieldPath("monitorSetup.parameters")}
                            onChange={(event) =>
                              updateScenario((draft) => {
                                const set = new Set(draft.monitorSetup.parameters);
                                if (event.target.checked) {
                                  set.add(parameter);
                                } else {
                                  set.delete(parameter);
                                }
                                draft.monitorSetup.parameters = [...set];
                              })
                            }
                          />
                          {parameter}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section
                id="documentInfo"
                ref={(element) => {
                  sectionRefs.current.documentInfo = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SectionHeader
                  title="14. Document Information"
                  onFill={() => runFillSection("documentInfo")}
                  loading={busySection === "documentInfo"}
                  locked={lockedSections.documentInfo}
                />
                <RecordEditor
                  sectionKey="documentInfo"
                  record={scenario.documentInfo}
                  isFieldLocked={isFieldLocked}
                  onFieldFocus={setSelectedFieldPath}
                  onChange={(key, value) =>
                    updateScenario((draft) => {
                      const nextValue =
                        (key === "dateScenarioDeveloped" || key === "dateScenarioUpdated") && typeof value === "string"
                          ? normalizeToDmyDate(value)
                          : (value as string);
                      (draft.documentInfo as unknown as Record<string, string>)[key] = nextValue;
                    })
                  }
                />
              </section>

              <section
                id="appendixImages"
                ref={(element) => {
                  sectionRefs.current.appendixImages = element;
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h2 className="text-base font-semibold">15. Simulation Images</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Generate Singapore-context medical simulation images for this scenario, refine them iteratively, then save selected images into the DOCX appendix.
                </p>
                <p className="mt-1 text-sm text-amber-700">Do not use image generation to create XRs or ECGs.</p>
                {statusMessage &&
                (statusMessage.startsWith("Generating medical image") ||
                  statusMessage.startsWith("Refining medical image") ||
                  statusMessage.startsWith("Image ") ||
                  statusMessage.startsWith("Saved appendix image")) ? (
                  <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {statusMessage}
                  </p>
                ) : null}

                <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  Image prompt
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-slate-300 p-2 text-sm normal-case"
                      value={imagePrompt}
                      onChange={(event) => setImagePrompt(event.target.value)}
                      placeholder="Example: Singapore ED resus bay team treating severe status asthmaticus with intubation setup, realistic monitor and airway cart."
                    />
                  </label>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Size
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm normal-case"
                      value={imageSize}
                      onChange={(event) =>
                        setImageSize(event.target.value as "1024x1024" | "1536x1024" | "1024x1536" | "auto")
                      }
                    >
                      <option value="1536x1024">1536x1024 (landscape)</option>
                      <option value="1024x1536">1024x1536 (portrait)</option>
                      <option value="1024x1024">1024x1024 (square)</option>
                      <option value="auto">auto</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Quality
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm normal-case"
                      value={imageQuality}
                      onChange={(event) => setImageQuality(event.target.value as "low" | "medium" | "high" | "auto")}
                    >
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                      <option value="auto">auto</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={imageBusy}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    onClick={() => runGenerateImage("new")}
                  >
                    {imageBusy ? "Generating..." : "Generate New Image"}
                  </button>
                  <button
                    type="button"
                    disabled={imageBusy || !latestRefinementSource}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
                    onClick={() => runGenerateImage("refine", latestRefinementSource?.dataUrl)}
                  >
                    Refine Latest Image
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                    onClick={() => setImagePrompt("")}
                  >
                    Start New Prompt
                  </button>
                </div>

                {generatedImages.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Generated Images (unsaved)</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {generatedImages.map((image) => (
                        <article key={image.id} className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                          <Image
                            src={image.dataUrl}
                            alt={image.revisedPrompt || image.prompt || "Generated simulation image"}
                            width={640}
                            height={352}
                            unoptimized
                            className="h-44 w-full rounded-md border border-slate-200 object-cover"
                          />
                          <p className="mt-2 line-clamp-3 text-xs text-slate-700">{image.revisedPrompt || image.prompt}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                              onClick={() => saveGeneratedImage(image)}
                            >
                              Save to Scenario
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              onClick={() => runGenerateImage("refine", image.dataUrl)}
                            >
                              Refine This
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                              onClick={() => setGeneratedImages((current) => current.filter((item) => item.id !== image.id))}
                            >
                              Discard
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Saved Appendix Images ({scenario.appendixImages.length})
                  </p>
                  {scenario.appendixImages.length === 0 ? (
                    <p className="text-sm text-slate-600">No saved images yet.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {scenario.appendixImages.map((image, index) => {
                        const captionPath = `appendixImages.${index}.caption`;
                        const captionLocked = isFieldLocked(captionPath);
                        const captionDraftKey = image.id || `appendix-${index}`;
                        const captionValue = captionDrafts[captionDraftKey] ?? image.caption;
                        const hasUnsavedCaption = captionValue !== image.caption;

                        return (
                          <article key={image.id || `appendix-${index}`} className="rounded-xl border border-slate-300 bg-white p-3">
                            <button
                              type="button"
                              className="block w-full"
                              onClick={() => setPreviewImage(image)}
                              aria-label={`Open saved image ${index + 1} preview`}
                            >
                              <Image
                                src={image.dataUrl}
                                alt={image.caption || image.revisedPrompt || image.prompt || "Saved appendix image"}
                                width={640}
                                height={352}
                                unoptimized
                                className="h-44 w-full rounded-md border border-slate-200 object-cover transition hover:opacity-95"
                              />
                            </button>
                            <p className="mt-1 text-[11px] text-slate-500">Click image to view full size.</p>
                            <label className="mt-2 block text-xs font-medium uppercase tracking-wide text-slate-600">
                              Caption
                              <textarea
                                className={`mt-1 h-16 w-full rounded-md border p-2 text-sm normal-case ${
                                  captionLocked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
                                }`}
                                value={captionValue}
                                disabled={captionLocked}
                                onFocus={() => setSelectedFieldPath(captionPath)}
                                onChange={(event) =>
                                  setCaptionDrafts((current) => ({
                                    ...current,
                                    [captionDraftKey]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <p className="mt-1 line-clamp-3 text-xs text-slate-700">{image.revisedPrompt || image.prompt}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={captionLocked || !hasUnsavedCaption}
                                className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                                onClick={() => {
                                  updateScenario((draft) => {
                                    if (!draft.appendixImages[index]) return;
                                    draft.appendixImages[index].caption = captionValue;
                                  });
                                  setCaptionDrafts((current) => {
                                    if (!(captionDraftKey in current)) return current;
                                    const next = { ...current };
                                    delete next[captionDraftKey];
                                    return next;
                                  });
                                  setStatusMessage("Image caption saved.");
                                }}
                              >
                                Save Caption
                              </button>
                              <button
                                type="button"
                                disabled={!hasUnsavedCaption}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                                onClick={() =>
                                  setCaptionDrafts((current) => {
                                    if (!(captionDraftKey in current)) return current;
                                    const next = { ...current };
                                    delete next[captionDraftKey];
                                    return next;
                                  })
                                }
                              >
                                Discard Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                onClick={() => runGenerateImage("refine", image.dataUrl)}
                              >
                                Refine From This
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                                onClick={() => removeSavedImage(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </main>

            {showRightSidebar ? (
              <aside className="sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">AI Controls</h3>
                  <div className="mt-2 space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-600">
                      Thinking depth: {thinkingDepth}
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={1}
                        value={thinkingDepth}
                        onChange={(event) => setThinkingDepth(Number(event.target.value) as ThinkingDepth)}
                        className="mt-1 w-full"
                      />
                      <span className="mt-1 block normal-case text-[11px] text-slate-500">
                        0 = none, 1 = minimum, 2 = medium
                      </span>
                    </label>

                    <div className="space-y-2">
                      {mode === "worksheet_assist" ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                          onClick={runGenerate}
                        >
                          {busy ? "Working..." : "Fill Missing (Whole Form)"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy || lockedSectionCount === SECTION_LIST.length}
                        className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
                        onClick={openUpdateUnlockedDialog}
                      >
                        {busy ? "Working..." : "Update Unlocked with AI"}
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                        onClick={openExportDialog}
                      >
                        Export DOCX
                      </button>
                      <button
                        type="button"
                        disabled={busy || imageBusy}
                        className="w-full rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                        onClick={resetAll}
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Section Locks ({lockedSectionCount}/{SECTION_LIST.length})
                  </h3>
                  <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                    {SECTION_LIST.map((section) => {
                      const locked = lockedSections[section.key];
                      return (
                        <button
                          key={`lock-${section.key}`}
                          type="button"
                          className={`w-full rounded px-2 py-1 text-left text-xs ${
                            locked ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                          }`}
                          onClick={() => toggleSectionLock(section.key)}
                        >
                          {locked ? "[Locked] " : "[Open] "}
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                    onClick={() => setLockedSections(buildSectionLockState(lockedSectionCount !== SECTION_LIST.length))}
                  >
                    {lockedSectionCount === SECTION_LIST.length ? "Unlock all sections" : "Lock all sections"}
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Scenario Flow State Locks ({lockedScenarioFlowStateCount})
                  </h3>
                  <p className="mt-2 text-xs text-slate-600">Use each state card to lock/unlock State 1, 2, 3, etc.</p>
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                    {scenario.scenarioFlow.length === 0 ? (
                      <p className="text-xs text-slate-600">No scenario flow states.</p>
                    ) : (
                      scenario.scenarioFlow.map((_, index) => {
                        const locked = Boolean(lockedScenarioFlowStates[index]);
                        return (
                          <div
                            key={`state-lock-summary-${index}`}
                            className={`rounded px-2 py-1 text-xs ${
                              locked ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {locked ? "[Locked]" : "[Open]"} State {index + 1}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                    disabled={scenario.scenarioFlow.length === 0}
                    onClick={() =>
                      setLockedScenarioFlowStates(
                        lockedScenarioFlowStateCount === scenario.scenarioFlow.length
                          ? {}
                          : scenario.scenarioFlow.reduce<Record<number, boolean>>((next, _row, index) => {
                              next[index] = true;
                              return next;
                            }, {}),
                      )
                    }
                  >
                    {lockedScenarioFlowStateCount === scenario.scenarioFlow.length && scenario.scenarioFlow.length > 0
                      ? "Unlock all states"
                      : "Lock all states"}
                  </button>
                </div>

              </aside>
            ) : null}
          </div>
        )}
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Saved Image Preview"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Saved Image Preview</h2>
                <p className="mt-1 text-sm text-slate-700">
                  {previewImage.caption.trim() || previewImage.revisedPrompt || previewImage.prompt || "Saved simulation image"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                onClick={() => setPreviewImage(null)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              <Image
                src={previewImage.dataUrl}
                alt={previewImage.caption || previewImage.revisedPrompt || previewImage.prompt || "Saved simulation image"}
                width={1600}
                height={1200}
                unoptimized
                className="mx-auto h-auto max-h-[72vh] w-full rounded-md object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      {exportDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Export DOCX</h2>
            <p className="mt-2 text-sm text-slate-700">
              Choose which columns from <span className="font-medium">9. Scenario Flow</span> should be included in the exported DOCX table.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setSelectedScenarioFlowExportColumns([...DEFAULT_SCENARIO_FLOW_EXPORT_COLUMNS])}
              >
                Select all
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setSelectedScenarioFlowExportColumns([])}
              >
                Unselect all
              </button>
            </div>
            <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 p-3">
              {SCENARIO_FLOW_EXPORT_COLUMNS.map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedScenarioFlowExportColumns.includes(column.key)}
                    onChange={() =>
                      setSelectedScenarioFlowExportColumns((current) =>
                        current.includes(column.key)
                          ? current.filter((key) => key !== column.key)
                          : [...current, column.key],
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setExportDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={submitExportDialog}
                disabled={selectedScenarioFlowExportColumns.length === 0}
              >
                Export DOCX
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {updateDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Update Unlocked with AI</h2>
            <p className="mt-2 text-sm text-slate-700">
              Add any extra instructions on what you want AI to improve or focus on for unlocked fields.
            </p>
            <textarea
              className="mt-3 h-36 w-full rounded-md border border-slate-300 p-2 text-sm"
              value={updateDialogPrompt}
              onChange={(event) => setUpdateDialogPrompt(event.target.value)}
              placeholder="Example: Strengthen hemodynamic progression, add clearer trigger points for state transitions, and include communication cues for nursing handover."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setUpdateDialogOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={submitUpdateUnlockedDialog}
                disabled={busy}
              >
                {busy ? "Updating..." : "Run Update"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  loading: boolean;
  locked: boolean;
  onFill: () => void;
};

function SectionHeader({ title, loading, locked, onFill }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium"
          disabled={loading || locked}
          onClick={onFill}
        >
          {loading ? "AI filling..." : "AI Fill Section"}
        </button>
      </div>
    </div>
  );
}

type RecordEditorProps = {
  sectionKey: SectionKey;
  record: object;
  isFieldLocked: (path: string) => boolean;
  onFieldFocus: (path: string) => void;
  onChange: (key: string, value: string | boolean) => void;
};

function RecordEditor({ sectionKey, record, isFieldLocked, onFieldFocus, onChange }: RecordEditorProps) {
  const editableRecord = record as Record<string, string | boolean>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(editableRecord).map(([key, value]) => {
        const label = formatFieldLabel(key);
        const fieldPath = `${sectionKey}.${key}`;
        const locked = isFieldLocked(fieldPath);
        const isDocumentDateField =
          sectionKey === "documentInfo" && (key === "dateScenarioDeveloped" || key === "dateScenarioUpdated");
        const isIdentificationField = sectionKey === "patientInfo" && key === "identificationNo";

        if (typeof value === "boolean") {
          return (
            <div
              key={key}
              className={`rounded-md border px-3 py-2 text-sm ${
                locked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
              }`}
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value}
                  disabled={locked}
                  onFocus={() => onFieldFocus(fieldPath)}
                  onChange={(event) => onChange(key, event.target.checked)}
                />
                {label}
              </label>
            </div>
          );
        }

        if (isIdentificationField) {
          return (
            <label key={key} className="text-xs font-medium uppercase tracking-wide text-slate-600">
              {label}
              <input
                type="text"
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm uppercase ${
                  locked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
                }`}
                value={normalizeIdentificationNo(String(value))}
                disabled={locked}
                maxLength={9}
                autoCapitalize="characters"
                spellCheck={false}
                onFocus={() => onFieldFocus(fieldPath)}
                onChange={(event) => onChange(key, normalizeIdentificationNo(event.target.value))}
                placeholder="S1234567D"
                title="Format: S1234567D"
              />
            </label>
          );
        }

        return (
          <label key={key} className="text-xs font-medium uppercase tracking-wide text-slate-600">
            {label}
            <textarea
              className={`mt-1 h-16 w-full rounded-md border p-2 text-sm normal-case ${
                locked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
              }`}
              value={value}
              disabled={locked}
              onFocus={() => onFieldFocus(fieldPath)}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={isDocumentDateField ? "DD/MM/YYYY" : undefined}
            />
          </label>
        );
      })}
    </div>
  );
}

type ArrayEditorProps = {
  sectionKey: SectionKey;
  items: string[];
  isFieldLocked: (path: string) => boolean;
  onFieldFocus: (path: string) => void;
  onChange: (items: string[]) => void;
};

function ArrayEditor({ sectionKey, items, isFieldLocked, onFieldFocus, onChange }: ArrayEditorProps) {
  const locked = isFieldLocked(sectionKey);

  return (
    <div>
      <textarea
        className={`h-28 w-full rounded-md border p-2 text-sm ${
          locked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
        }`}
        value={textareaFromArray(items)}
        disabled={locked}
        onFocus={() => onFieldFocus(sectionKey)}
        onChange={(event) => onChange(arrayFromTextarea(event.target.value))}
        placeholder="One entry per line"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          disabled={locked}
          onClick={() => onChange([...items, ""])}
        >
          Add row
        </button>
      </div>
    </div>
  );
}

type LabeledTextAreaProps = {
  label: string;
  path: string;
  value: string;
  isFieldLocked: (path: string) => boolean;
  onFieldFocus: (path: string) => void;
  onChange: (value: string) => void;
};

function LabeledTextArea({ label, path, value, isFieldLocked, onFieldFocus, onChange }: LabeledTextAreaProps) {
  const locked = isFieldLocked(path);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <label className="text-xs font-medium uppercase tracking-wide text-slate-600">
      {label}
      <textarea
        ref={textareaRef}
        className={`mt-1 min-h-[96px] w-full rounded-md border p-2 text-sm leading-relaxed normal-case ${
          locked ? "border-amber-300 bg-amber-50 text-amber-900 disabled:border-amber-300 disabled:bg-amber-50 disabled:text-amber-900 disabled:opacity-100" : "border-slate-300"
        }`}
        style={{ overflow: "hidden", resize: "none" }}
        value={value}
        disabled={locked}
        onFocus={() => onFieldFocus(path)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
