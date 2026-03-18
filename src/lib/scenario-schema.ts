import { z } from "zod";

export const thinkingDepthSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const generationConfigSchema = z.object({
  thinkingDepth: thinkingDepthSchema,
});

const vitalSignsSchema = z
  .object({
    bp: z.string().default(""),
    pr: z.string().default(""),
    rr: z.string().default(""),
    spo2: z.string().default(""),
    rhythm: z.string().default(""),
  })
  .catchall(z.string().default(""));

export const scenarioStateRowSchema = z.object({
  stateName: z.string().default(""),
  vitalSigns: vitalSignsSchema.default({
    bp: "",
    pr: "",
    rr: "",
    spo2: "",
    rhythm: "",
  }),
  physicalExamDisplayedOnSimMan: z.array(z.string()).default([]),
  physicalExamVolunteeredByInstructor: z.array(z.string()).default([]),
  investigations: z.array(z.string()).default([]),
  expectedActions: z.array(z.string()).default([]),
  remarks: z.array(z.string()).default([]),
  instructorControl: z.array(z.string()).default([]),
  transitionRule: z.string().default(""),
});

export const equipmentItemSchema = z.object({
  category: z.string().default(""),
  item: z.string().default(""),
  quantity: z.string().default(""),
  remarks: z.string().default(""),
});

const courseInfoSchema = z.object({
  courseTitle: z.string().default(""),
  department: z.string().default(""),
  scenarioTitle: z.string().default(""),
  targetLearnerGroup: z.string().default(""),
  numberOfTrainees: z.string().default(""),
  numberOfInstructors: z.string().default(""),
  levelOfExperience: z.string().default(""),
  prerequisiteKnowledge: z.string().default(""),
});

const patientInfoSchema = z.object({
  name: z.string().default(""),
  showOnMonitorBeforeStart: z.boolean().default(false),
  makeAvailableDuringSimulation: z.boolean().default(false),
  identificationNo: z.string().default(""),
  race: z.string().default(""),
  age: z.string().default(""),
  gender: z.string().default(""),
  weight: z.string().default(""),
  height: z.string().default(""),
  pastMedicalAndSocialHistory: z.string().default(""),
  currentMedications: z.string().default(""),
  foodDrugAllergies: z.string().default(""),
  primaryCareProvider: z.string().default(""),
  presentingComplaintHistory: z.string().default(""),
});

const scenarioInfoSchema = z.object({
  timeAllocatedForScenario: z.string().default(""),
  timeAllocatedForDebrief: z.string().default(""),
  scenarioSummary: z.string().default(""),
  scenarioInformationToTrainees: z.string().default(""),
  transitionMode: z.string().default("next"),
});

const debriefInfoSchema = z.object({
  numberOfDebriefers: z.string().default(""),
  debriefRoomSetup: z.string().default(""),
  debriefDescription: z.string().default(""),
  logisticsRequired: z.string().default(""),
});

const documentInfoSchema = z.object({
  author: z.string().default(""),
  designation: z.string().default(""),
  department: z.string().default(""),
  dateScenarioDeveloped: z.string().default(""),
  dateScenarioUpdated: z.string().default(""),
});

const scenarioAppendixImageSchema = z.object({
  id: z.string().default(""),
  prompt: z.string().default(""),
  revisedPrompt: z.string().default(""),
  caption: z.string().default(""),
  dataUrl: z.string().default(""),
  mimeType: z.string().default("image/png"),
  model: z.string().default(""),
  size: z.string().default(""),
  createdAt: z.string().default(""),
});

export const scenarioDocumentSchema = z.object({
  courseInfo: courseInfoSchema.default({
    courseTitle: "",
    department: "",
    scenarioTitle: "",
    targetLearnerGroup: "",
    numberOfTrainees: "",
    numberOfInstructors: "",
    levelOfExperience: "",
    prerequisiteKnowledge: "",
  }),
  objectives: z.array(z.string()).default([]),
  clinicalSetting: z
    .object({
      settingRequired: z.string().default(""),
      remarks: z.string().default(""),
    })
    .default({ settingRequired: "", remarks: "" }),
  instructors: z.array(z.string()).default([]),
  confederates: z.array(z.string()).default([]),
  traineeRoles: z.array(z.string()).default([]),
  patientInfo: patientInfoSchema.default({
    name: "",
    showOnMonitorBeforeStart: false,
    makeAvailableDuringSimulation: false,
    identificationNo: "",
    race: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    pastMedicalAndSocialHistory: "",
    currentMedications: "",
    foodDrugAllergies: "",
    primaryCareProvider: "",
    presentingComplaintHistory: "",
  }),
  scenarioInfo: scenarioInfoSchema.default({
    timeAllocatedForScenario: "",
    timeAllocatedForDebrief: "",
    scenarioSummary: "",
    scenarioInformationToTrainees: "",
    transitionMode: "next",
  }),
  scenarioFlow: z.array(scenarioStateRowSchema).default([]),
  equipment: z.array(equipmentItemSchema).default([]),
  debriefInfo: debriefInfoSchema.default({
    numberOfDebriefers: "",
    debriefRoomSetup: "",
    debriefDescription: "",
    logisticsRequired: "",
  }),
  simulatorPrep: z.array(z.string()).default([]),
  monitorSetup: z
    .object({
      layout: z.array(z.string()).default([]),
      parameters: z.array(z.string()).default([]),
    })
    .default({ layout: [], parameters: [] }),
  appendixImages: z.array(scenarioAppendixImageSchema).default([]),
  documentInfo: documentInfoSchema.default({
    author: "",
    designation: "",
    department: "",
    dateScenarioDeveloped: "",
    dateScenarioUpdated: "",
  }),
});

export const validationWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldPath: z.string(),
  suggestedAlternatives: z.array(z.string()).default([]),
});

export const citationSchema = z.object({
  source: z.string(),
  excerpt: z.string().default(""),
});

export const generationResponsePayloadSchema = z.object({
  scenario: scenarioDocumentSchema,
  warnings: z.array(validationWarningSchema).default([]),
  citations: z.array(citationSchema).default([]),
});

export const scenarioGenerateRequestSchema = z.object({
  mode: z.enum(["ai_prompt", "worksheet_assist"]),
  prompt: z.string().max(12000).optional(),
  scenario: scenarioDocumentSchema.optional(),
  config: generationConfigSchema,
});

export const scenarioFillSectionRequestSchema = z.object({
  section: z.enum([
    "courseInfo",
    "objectives",
    "clinicalSetting",
    "instructors",
    "confederates",
    "traineeRoles",
    "patientInfo",
    "scenarioInfo",
    "scenarioFlow",
    "equipment",
    "debriefInfo",
    "simulatorPrep",
    "monitorSetup",
    "documentInfo",
  ]),
  scenario: scenarioDocumentSchema,
  prompt: z.string().max(6000).optional(),
  config: generationConfigSchema,
});

export const scenarioValidateRequestSchema = z.object({
  scenario: scenarioDocumentSchema,
});

export const scenarioExportRequestSchema = z.object({
  scenario: scenarioDocumentSchema,
});

export type ScenarioDocumentSchema = z.infer<typeof scenarioDocumentSchema>;
export type GenerationConfigSchema = z.infer<typeof generationConfigSchema>;
export type ScenarioGenerateRequest = z.infer<typeof scenarioGenerateRequestSchema>;
export type ScenarioFillSectionRequest = z.infer<typeof scenarioFillSectionRequestSchema>;
