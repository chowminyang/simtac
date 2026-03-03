import { toFile } from "openai";

import { ensureNonEmptyText, extractTextFromUploadedFile } from "./documents";
import { getOpenAIClient, requireVectorStoreId } from "./openai-client";

export function assertAdminPasscode(passcode: string | null | undefined): void {
  const expected = process.env.KNOWLEDGE_ADMIN_PASSCODE;
  if (!expected) {
    throw new Error("KNOWLEDGE_ADMIN_PASSCODE is not configured.");
  }

  if (!passcode || passcode !== expected) {
    throw new Error("Invalid admin passcode.");
  }
}

export async function listKnowledgeFiles() {
  const client = getOpenAIClient();
  const vectorStoreId = requireVectorStoreId();

  const page = await client.vectorStores.files.list(vectorStoreId, { limit: 100, order: "desc" });

  return page.data.map((item) => ({
    vectorStoreFileId: item.id,
    status: item.status,
    usageBytes: item.usage_bytes,
    createdAt: item.created_at,
    attributes: item.attributes || {},
  }));
}

export async function uploadKnowledgeFile(inputFile: File) {
  const vectorStoreId = requireVectorStoreId();
  const client = getOpenAIClient();

  const { text, normalizedName } = await extractTextFromUploadedFile(inputFile);
  const safeText = ensureNonEmptyText(text, inputFile.name);

  const file = await client.files.create({
    purpose: "assistants",
    file: await toFile(Buffer.from(safeText, "utf-8"), normalizedName, {
      type: "text/plain",
    }),
  });

  const vectorFile = await client.vectorStores.files.createAndPoll(vectorStoreId, {
    file_id: file.id,
    attributes: {
      original_filename: inputFile.name,
      normalized_filename: normalizedName,
      openai_file_id: file.id,
      source: "runtime_upload",
    },
  });

  return {
    vectorStoreFileId: vectorFile.id,
    status: vectorFile.status,
    openaiFileId: file.id,
    normalizedName,
  };
}

export async function deleteKnowledgeFile(vectorStoreFileId: string) {
  const vectorStoreId = requireVectorStoreId();
  const client = getOpenAIClient();

  const vectorFile = await client.vectorStores.files.retrieve(vectorStoreFileId, {
    vector_store_id: vectorStoreId,
  });

  await client.vectorStores.files.delete(vectorStoreFileId, {
    vector_store_id: vectorStoreId,
  });

  const openaiFileId = typeof vectorFile.attributes?.openai_file_id === "string" ? vectorFile.attributes.openai_file_id : null;

  if (openaiFileId) {
    await client.files.delete(openaiFileId);
  }

  return {
    vectorStoreFileId,
    deleted: true,
    openaiFileId,
  };
}
