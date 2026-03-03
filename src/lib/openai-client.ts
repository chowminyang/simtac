import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  client = new OpenAI({ apiKey });
  return client;
}

export function getVectorStoreId(): string {
  return process.env.OPENAI_VECTOR_STORE_ID || "";
}

export function requireVectorStoreId(): string {
  const id = getVectorStoreId();
  if (!id) {
    throw new Error("OPENAI_VECTOR_STORE_ID is not configured.");
  }
  return id;
}
