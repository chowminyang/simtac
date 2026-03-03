import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { ScenarioDocument } from "./types";

type AppendixImageForExport = {
  prompt: string;
  revisedPrompt: string;
  caption: string;
  size: string;
  bytes: Buffer;
  imageType: "png" | "jpg" | "gif" | "bmp";
};

type AppendixImageDraft = {
  prompt: string;
  revisedPrompt: string;
  caption: string;
  size: string;
  parsedImage: { bytes: Buffer; imageType: "png" | "jpg" | "gif" | "bmp" } | null;
};

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 260, after: 140 },
  });
}

function keyValueParagraph(label: string, value: string | boolean | undefined): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value === undefined ? "" : String(value) }),
    ],
    spacing: { after: 90 },
  });
}

function stringList(items: string[]): Paragraph[] {
  const normalized = items.map((item) => item.trim()).filter(Boolean);
  if (!normalized.length) {
    return [new Paragraph("-")];
  }

  return normalized.map(
    (item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
        spacing: { after: 70 },
      }),
  );
}

function stateFlowTable(scenario: ScenarioDocument): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      "State",
      "Vital Signs",
      "Physical Exam (Displayed on SimMan)",
      "Physical Exam (Volunteered by Instructor)",
      "Investigations",
      "Expected Actions",
      "Remarks",
      "Instructor Control",
      "Transition",
    ].map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  });

  const listToCellText = (items: string[]) => items.map((item) => item.trim()).filter(Boolean).join("\n");

  const rows = scenario.scenarioFlow.map((row) => {
    const vitalSigns = Object.entries(row.vitalSigns || {})
      .filter(([, value]) => value && String(value).trim().length > 0)
      .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
      .join("\n");

    return new TableRow({
      children: [
        row.stateName || "",
        vitalSigns,
        listToCellText(row.physicalExamDisplayedOnSimMan),
        listToCellText(row.physicalExamVolunteeredByInstructor),
        listToCellText(row.investigations),
        listToCellText(row.expectedActions),
        listToCellText(row.remarks),
        listToCellText(row.instructorControl),
        row.transitionRule || "",
      ].map(
        (value) =>
          new TableCell({
            children: [new Paragraph(value || "")],
          }),
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
    layout: TableLayoutType.FIXED,
  });
}

function equipmentTable(scenario: ScenarioDocument): Table {
  const header = new TableRow({
    tableHeader: true,
    children: ["Category", "Item", "Quantity", "Remarks"].map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  });

  const rows = scenario.equipment.map(
    (item) =>
      new TableRow({
        children: [item.category || "", item.item || "", item.quantity || "", item.remarks || ""].map(
          (text) =>
            new TableCell({
              children: [new Paragraph(text)],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
    layout: TableLayoutType.FIXED,
  });
}

function parseImageDataUrl(dataUrl: string): { bytes: Buffer; imageType: "png" | "jpg" | "gif" | "bmp" } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const imageType =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/jpeg"
        ? "jpg"
        : mimeType === "image/gif"
          ? "gif"
          : mimeType === "image/bmp"
            ? "bmp"
            : null;
  if (!imageType) return null;

  try {
    return {
      bytes: Buffer.from(match[2], "base64"),
      imageType,
    };
  } catch {
    return null;
  }
}

function sizeToDimensions(size: string): { width: number; height: number } {
  const fallback = { width: 520, height: 340 };
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return fallback;

  const sourceWidth = Number.parseInt(match[1], 10);
  const sourceHeight = Number.parseInt(match[2], 10);
  if (!sourceWidth || !sourceHeight) return fallback;

  const width = 520;
  const ratio = sourceHeight / sourceWidth;
  const height = Math.max(220, Math.min(640, Math.round(width * ratio)));
  return { width, height };
}

export async function buildScenarioDocx(scenario: ScenarioDocument): Promise<Buffer> {
  const blocks: Array<Paragraph | Table> = [];

  blocks.push(
    new Paragraph({
      text: "SIMTAC Scenario Development Worksheet",
      heading: HeadingLevel.TITLE,
      spacing: { after: 220 },
    }),
  );

  blocks.push(heading("1. Course and Trainee Information"));
  Object.entries(scenario.courseInfo).forEach(([key, value]) => {
    blocks.push(keyValueParagraph(key, value));
  });

  blocks.push(heading("2. Specific Learning Objectives"));
  blocks.push(...stringList(scenario.objectives));

  blocks.push(heading("3. Clinical / Environment Setting"));
  blocks.push(keyValueParagraph("Setting required", scenario.clinicalSetting.settingRequired));
  blocks.push(keyValueParagraph("Remarks", scenario.clinicalSetting.remarks));

  blocks.push(heading("4. Instructor Information"));
  blocks.push(...stringList(scenario.instructors));

  blocks.push(heading("5. Confederate Information"));
  blocks.push(...stringList(scenario.confederates));

  blocks.push(heading("6. Trainees Role"));
  blocks.push(...stringList(scenario.traineeRoles));

  blocks.push(heading("7. Patient Information"));
  Object.entries(scenario.patientInfo).forEach(([key, value]) => {
    blocks.push(keyValueParagraph(key, value));
  });

  blocks.push(heading("8. Scenario Information"));
  Object.entries(scenario.scenarioInfo).forEach(([key, value]) => {
    blocks.push(keyValueParagraph(key, value));
  });

  blocks.push(heading("9. Scenario Flow"));
  blocks.push(stateFlowTable(scenario));

  blocks.push(heading("10. Equipment"));
  blocks.push(equipmentTable(scenario));

  blocks.push(heading("11. Debrief Information"));
  Object.entries(scenario.debriefInfo).forEach(([key, value]) => {
    blocks.push(keyValueParagraph(key, value));
  });

  blocks.push(heading("12. Simulator / Standardised Patient / Task Trainer Preparation"));
  blocks.push(...stringList(scenario.simulatorPrep));

  blocks.push(heading("13. Patient Monitor Setup"));
  blocks.push(keyValueParagraph("Layout", scenario.monitorSetup.layout.join(", ")));
  blocks.push(keyValueParagraph("Parameters", scenario.monitorSetup.parameters.join(", ")));

  blocks.push(heading("14. Document Information"));
  Object.entries(scenario.documentInfo).forEach(([key, value]) => {
    blocks.push(keyValueParagraph(key, value));
  });

  const appendixImages: AppendixImageForExport[] = scenario.appendixImages
    .map((image) => ({
      prompt: image.prompt,
      revisedPrompt: image.revisedPrompt,
      caption: image.caption,
      size: image.size,
      parsedImage: parseImageDataUrl(image.dataUrl),
    }) as AppendixImageDraft)
    .filter((image): image is AppendixImageDraft & { parsedImage: NonNullable<AppendixImageDraft["parsedImage"]> } => {
      return Boolean(image.parsedImage?.bytes && image.parsedImage.imageType);
    })
    .map((image) => ({
      prompt: image.prompt,
      revisedPrompt: image.revisedPrompt,
      caption: image.caption,
      size: image.size,
      bytes: image.parsedImage.bytes,
      imageType: image.parsedImage.imageType,
    }));

  if (appendixImages.length > 0) {
    blocks.push(heading("Appendix A. Generated Simulation Images"));

    appendixImages.forEach((image, index) => {
      const dimensions = sizeToDimensions(image.size);
      const title = image.caption.trim() || image.revisedPrompt.trim() || image.prompt.trim() || `Image ${index + 1}`;

      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: `A${index + 1}. ${title}`, bold: true })],
          spacing: { before: 180, after: 80 },
        }),
      );
      blocks.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new ImageRun({
              type: image.imageType,
              data: image.bytes,
              transformation: dimensions,
            }),
          ],
        }),
      );
      blocks.push(keyValueParagraph("Prompt", image.prompt));
      if (image.revisedPrompt && image.revisedPrompt !== image.prompt) {
        blocks.push(keyValueParagraph("Revised prompt", image.revisedPrompt));
      }
    });
  }

  const document = new Document({
    sections: [
      {
        children: blocks,
      },
    ],
  });

  return Packer.toBuffer(document);
}

export function buildExportFileName(scenario: ScenarioDocument): string {
  const title = (scenario.courseInfo.scenarioTitle || scenario.courseInfo.courseTitle || "Scenario")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 80);

  const date = new Date().toISOString().slice(0, 10);
  return `SIMTAC_${title}_${date}.docx`;
}
