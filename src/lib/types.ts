export type GenerationMode = "ai_prompt" | "worksheet_assist";
export type ThinkingDepth = 0 | 1 | 2 | 3 | 4;

export interface GenerationConfig {
  thinkingDepth: ThinkingDepth;
}

export interface ScenarioStateRow {
  stateName: string;
  vitalSigns: {
    bp?: string;
    pr?: string;
    rr?: string;
    spo2?: string;
    rhythm?: string;
    [key: string]: string | undefined;
  };
  physicalExamDisplayedOnSimMan: string[];
  physicalExamVolunteeredByInstructor: string[];
  investigations: string[];
  expectedActions: string[];
  remarks: string[];
  instructorControl: string[];
  transitionRule?: "next" | "auto" | "handler" | string;
}

export interface EquipmentItem {
  category: string;
  item: string;
  quantity: string;
  remarks: string;
}

export interface CourseInfo {
  courseTitle: string;
  department: string;
  scenarioTitle: string;
  targetLearnerGroup: string;
  numberOfTrainees: string;
  numberOfInstructors: string;
  levelOfExperience: string;
  prerequisiteKnowledge: string;
}

export interface PatientInfo {
  name: string;
  showOnMonitorBeforeStart: boolean;
  makeAvailableDuringSimulation: boolean;
  identificationNo: string;
  race: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  pastMedicalAndSocialHistory: string;
  currentMedications: string;
  foodDrugAllergies: string;
  primaryCareProvider: string;
  presentingComplaintHistory: string;
}

export interface ScenarioInfo {
  timeAllocatedForScenario: string;
  timeAllocatedForDebrief: string;
  scenarioSummary: string;
  scenarioInformationToTrainees: string;
  transitionMode: string;
}

export interface DebriefInfo {
  numberOfDebriefers: string;
  debriefRoomSetup: string;
  debriefDescription: string;
  logisticsRequired: string;
}

export interface DocumentInfo {
  author: string;
  designation: string;
  department: string;
  dateScenarioDeveloped: string;
  dateScenarioUpdated: string;
}

export interface ScenarioAppendixImage {
  id: string;
  prompt: string;
  revisedPrompt: string;
  caption: string;
  dataUrl: string;
  mimeType: string;
  model: string;
  size: string;
  createdAt: string;
}

export interface ScenarioDocument {
  courseInfo: CourseInfo;
  objectives: string[];
  clinicalSetting: {
    settingRequired: string;
    remarks: string;
  };
  instructors: string[];
  confederates: string[];
  traineeRoles: string[];
  patientInfo: PatientInfo;
  scenarioInfo: ScenarioInfo;
  scenarioFlow: ScenarioStateRow[];
  equipment: EquipmentItem[];
  debriefInfo: DebriefInfo;
  simulatorPrep: string[];
  monitorSetup: {
    layout: string[];
    parameters: string[];
  };
  appendixImages: ScenarioAppendixImage[];
  documentInfo: DocumentInfo;
}

export interface ValidationWarning {
  code: string;
  message: string;
  fieldPath: string;
  suggestedAlternatives?: string[];
}

export interface Citation {
  source: string;
  excerpt?: string;
}

export interface GenerationResponsePayload {
  scenario: ScenarioDocument;
  warnings: ValidationWarning[];
  citations: Citation[];
}
