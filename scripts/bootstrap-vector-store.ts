import path from "node:path";

import { config as loadEnv } from "dotenv";
import OpenAI, { toFile } from "openai";

import { ensureNonEmptyText, extractTextFromLocalPath } from "../src/lib/documents";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const CORE_SOURCE_FILES = [
  "Resources/SIMTAC - Scenario Development Worksheet (280316).doc",
  "Resources/Clinical Features of the SimMan 3G.docx",
  "Resources/Heart, Lung & Bowel Sounds.doc",
  "Resources/Integrated Resuscitation Drill/IRD Scenarios 2020 (Updated).docx",
] as const;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const client = new OpenAI({ apiKey });

  let vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

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

  const existing = await client.vectorStores.files.list(vectorStoreId, { limit: 100 });
  const existingOriginalNames = new Set(
    existing.data
      .map((file) => (typeof file.attributes?.original_filename === "string" ? file.attributes.original_filename : ""))
      .filter(Boolean),
  );

  for (const relativePath of CORE_SOURCE_FILES) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const originalName = path.basename(relativePath);

    if (existingOriginalNames.has(originalName)) {
      console.log(`Skipping already ingested file: ${originalName}`);
      continue;
    }

    console.log(`Extracting text from ${relativePath}...`);
    const { text, normalizedName } = await extractTextFromLocalPath(absolutePath);
    const safeText = ensureNonEmptyText(text, originalName);

    const createdFile = await client.files.create({
      purpose: "assistants",
      file: await toFile(Buffer.from(safeText, "utf-8"), normalizedName, {
        type: "text/plain",
      }),
    });

    const vectorFile = await client.vectorStores.files.createAndPoll(vectorStoreId, {
      file_id: createdFile.id,
      attributes: {
        source: "core_bootstrap",
        original_filename: originalName,
        normalized_filename: normalizedName,
        openai_file_id: createdFile.id,
      },
    });

    console.log(`Ingested ${originalName}: ${vectorFile.id} (${vectorFile.status})`);
  }

  console.log("Knowledge bootstrap complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
