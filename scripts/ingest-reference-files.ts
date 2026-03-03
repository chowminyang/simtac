import { promises as fs } from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import OpenAI, { toFile } from "openai";

import { ensureNonEmptyText, extractTextFromLocalPath } from "../src/lib/documents";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const REFERENCE_SOURCE_FILES = [
  "Resources/Anaes_LKCMed Y3 Anaesthesia Rotation/LKC Y3 - Scenario 1 - GA with RSI and Bronchospasm.doc",
  "Resources/Anaes_LKCMed Y3 Anaesthesia Rotation/LKC Y3 - Scenario 2 - GA with Anaphylaxis.doc",
  "Resources/Anaes_LKCMed Y3 Anaesthesia Rotation/LKC Y3 - Scenario 3 - Difficult airway.doc",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/EM Resuscitation Simulation Course - Basic (19Jun23).pdf",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 1 Collapse from hyperkalemia.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 2 Status asthmaticus.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 3 Anterior STEMI with pulm edema and cardiogenic shock.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 4 SVT.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 5 Facial injuries.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 6 Flail chest.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 7 MRT limb amputation.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 8 EDH.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 9 Fall from height.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 1/Scenario 10 Inferior STEMI with SAH.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 2/EM Resus Simulation Part 02 old.docx",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course - Part 2/EM Resus Simulation Part 02_suggestions 07092015.docx",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (MO Teaching-Chest Pain)/ED MO Teaching Simulation - Chest pain_23Jun17.doc",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (MO Teaching-Chest Pain)/ED MO Teaching Simulation - Chest pain.doc",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2017/ED RP Sim Case 1.doc",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2017/ED RP Sim Case 1.pptx",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2017/ED RP Sim Case 2.doc",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2017/ED RP Sim case 2.pptx",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2019/Scenario 1 Collapse from hyperkalemia.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2019/Scenario 2 Status asthmaticus.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2019/Scenario 3 Anterior STEMI with pulm edema and cardiogenic shock.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2019/Scenario 8 EDH.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2019/Scenario 9 Fall from height.xls",
  "Resources/EM Resuscitation Simulation Course/EM Resus Sim Course (RPs)/2023/RP simulation training_23112023.docx",
  "Resources/NU Ward Resus Drill Simulation L10/L10 Resus Scenario setup 1 - HyPOglycemia.docx",
  "Resources/NU Ward Resus Drill Simulation L10/L10 Scenario setup 2 - COPD Turned AMI.docx",
  "Resources/Ward Resuscitation Drill Simulation for L13/L13 Resus Drill_Scenarios_For participants_Updated 250414.pdf",
  "Resources/Ward Resuscitation Drill Simulation for L13/SIMTAC - Scenario Development Worksheet_L13 Scenario 1.pdf",
  "Resources/Ward Resuscitation Drill Simulation for L13/SIMTAC - Scenario Development Worksheet_L13 Scenario 2.pdf",
] as const;

const MAX_UPLOAD_CHARS = 180_000;
const MAX_ATTACH_ATTEMPTS = 3;

type IngestResult = {
  sourcePath: string;
  status: "ingested" | "skipped" | "failed";
  details: string;
};

function normalizeSourcePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  let vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  const client = new OpenAI({ apiKey });

  if (!vectorStoreId) {
    const created = await client.vectorStores.create({
      name: "SIMTAC Knowledge Base",
      description: "Core SIMTAC references and future uploaded simulation materials",
    });
    vectorStoreId = created.id;
    console.log("Created vector store:", vectorStoreId);
    console.log(`Add this to your env: OPENAI_VECTOR_STORE_ID=${vectorStoreId}`);
  } else {
    console.log("Using existing vector store:", vectorStoreId);
  }

  const existing = await client.vectorStores.files.list(vectorStoreId, { limit: 100, order: "desc" });
  const existingSourcePaths = new Set(
    existing.data
      .filter((file) => file.status !== "failed")
      .map((file) => (typeof file.attributes?.source_relative_path === "string" ? normalizeSourcePath(file.attributes.source_relative_path) : ""))
      .filter(Boolean),
  );

  const results: IngestResult[] = [];

  for (const relativePath of REFERENCE_SOURCE_FILES) {
    const sourcePath = normalizeSourcePath(relativePath);
    const originalName = path.basename(sourcePath);

    if (existingSourcePaths.has(sourcePath)) {
      results.push({
        sourcePath,
        status: "skipped",
        details: "already ingested",
      });
      continue;
    }

    const absolutePath = path.resolve(process.cwd(), sourcePath);
    try {
      await fs.access(absolutePath);
      console.log(`Extracting text from ${sourcePath}...`);
      const { text, normalizedName } = await extractTextFromLocalPath(absolutePath);
      const safeText = ensureNonEmptyText(text, originalName);
      const boundedText =
        safeText.length > MAX_UPLOAD_CHARS
          ? `${safeText.slice(0, MAX_UPLOAD_CHARS)}\n\n[Truncated for stable vector ingestion.]`
          : safeText;
      if (boundedText.length !== safeText.length) {
        console.log(`Truncated extracted text for ${sourcePath} to ${MAX_UPLOAD_CHARS} characters.`);
      }

      let vectorFile:
        | {
            id: string;
            status: string;
          }
        | null = null;
      let lastAttachError = "";

      for (let attempt = 1; attempt <= MAX_ATTACH_ATTEMPTS; attempt += 1) {
        const createdFile = await client.files.create({
          purpose: "assistants",
          file: await toFile(Buffer.from(boundedText, "utf-8"), normalizedName, {
            type: "text/plain",
          }),
        });

        const attached = await client.vectorStores.files.createAndPoll(vectorStoreId, {
          file_id: createdFile.id,
          attributes: {
            source: "bulk_reference_upload",
            source_relative_path: sourcePath,
            original_filename: originalName,
            normalized_filename: normalizedName,
            openai_file_id: createdFile.id,
          },
        });

        if (attached.status === "completed") {
          vectorFile = attached;
          break;
        }

        lastAttachError = attached.last_error?.message || attached.last_error?.code || attached.status;
        console.log(
          `Attempt ${attempt}/${MAX_ATTACH_ATTEMPTS} failed for ${sourcePath}: ${lastAttachError}`,
        );

        try {
          await client.vectorStores.files.delete(attached.id, { vector_store_id: vectorStoreId });
        } catch {
          // ignore cleanup failure
        }
        try {
          await client.files.delete(createdFile.id);
        } catch {
          // ignore cleanup failure
        }

        if (attempt < MAX_ATTACH_ATTEMPTS) {
          await sleep(1500 * attempt);
        }
      }

      if (!vectorFile) {
        throw new Error(
          `Vector store indexing failed after ${MAX_ATTACH_ATTEMPTS} attempts: ${lastAttachError || "unknown error"}`,
        );
      }

      existingSourcePaths.add(sourcePath);
      results.push({
        sourcePath,
        status: "ingested",
        details: `${vectorFile.id} (${vectorFile.status})`,
      });
      console.log(`Queued ${sourcePath}: ${vectorFile.id} (${vectorFile.status})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({
        sourcePath,
        status: "failed",
        details: message,
      });
    }
  }

  const ingested = results.filter((item) => item.status === "ingested");
  const skipped = results.filter((item) => item.status === "skipped");
  const failed = results.filter((item) => item.status === "failed");

  console.log("");
  console.log("Bulk reference ingestion summary");
  console.log("- total:", results.length);
  console.log("- ingested:", ingested.length);
  console.log("- skipped:", skipped.length);
  console.log("- failed:", failed.length);

  if (failed.length > 0) {
    console.log("");
    console.log("Failed files:");
    for (const item of failed) {
      console.log(`- ${item.sourcePath}: ${item.details}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
