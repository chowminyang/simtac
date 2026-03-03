import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

const execFileAsync = promisify(execFile);

export type SupportedUploadExtension = ".docx" | ".pdf" | ".txt";

const RUNTIME_ALLOWED_EXTENSIONS: SupportedUploadExtension[] = [".docx", ".pdf", ".txt"];

function extensionOf(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function assertRuntimeUploadExtension(fileName: string): SupportedUploadExtension {
  const ext = extensionOf(fileName);
  if (!RUNTIME_ALLOWED_EXTENSIONS.includes(ext as SupportedUploadExtension)) {
    throw new Error("Only .docx, .pdf, and .txt uploads are allowed.");
  }
  return ext as SupportedUploadExtension;
}

export async function extractTextFromUploadedFile(file: File): Promise<{ text: string; normalizedName: string }> {
  const ext = assertRuntimeUploadExtension(file.name);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text = "";

  if (ext === ".txt") {
    text = buffer.toString("utf-8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (ext === ".pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
  }

  const normalizedName = file.name.replace(/\.[^.]+$/, "") + ".txt";

  return { text: normalizeText(text), normalizedName };
}

export async function extractTextFromLocalPath(filePath: string): Promise<{ text: string; normalizedName: string }> {
  const ext = extensionOf(filePath);
  const baseName = path.basename(filePath, ext);

  if (ext === ".doc") {
    const { stdout } = await execFileAsync("textutil", ["-convert", "txt", "-stdout", filePath]);
    return { text: normalizeText(stdout), normalizedName: `${baseName}.txt` };
  }

  if (ext === ".docx") {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return { text: normalizeText(result.value), normalizedName: `${baseName}.txt` };
  }

  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return { text: normalizeText(result.text), normalizedName: `${baseName}.txt` };
  }

  if (ext === ".xls" || ext === ".xlsx") {
    const buffer = await fs.readFile(filePath);
    const text = extractSpreadsheetText(buffer);
    return { text: normalizeText(text), normalizedName: `${baseName}.txt` };
  }

  if (ext === ".pptx") {
    const buffer = await fs.readFile(filePath);
    const text = await extractPptxText(buffer);
    return { text: normalizeText(text), normalizedName: `${baseName}.txt` };
  }

  if (ext === ".txt") {
    const text = await fs.readFile(filePath, "utf-8");
    return { text: normalizeText(text), normalizedName: `${baseName}.txt` };
  }

  throw new Error(`Unsupported file extension for ingestion: ${ext}`);
}

export function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u0007/g, " ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ensureNonEmptyText(text: string, fileName: string): string {
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new Error(`No extractable text found in ${fileName}.`);
  }
  return normalized;
}

function extractSpreadsheetText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: false });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = new Map<number, Array<{ col: number; value: string }>>();
    for (const [address, cellValue] of Object.entries(sheet)) {
      if (address.startsWith("!")) continue;

      const cell = cellValue as { w?: unknown; v?: unknown };
      const raw = typeof cell.w === "string" ? cell.w : cell.v;
      const text = String(raw ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      const decoded = XLSX.utils.decode_cell(address);
      const rowValues = rows.get(decoded.r) ?? [];
      rowValues.push({ col: decoded.c, value: text });
      rows.set(decoded.r, rowValues);
    }

    const normalizedRows: string[] = [];
    for (const rowNumber of [...rows.keys()].sort((a, b) => a - b)) {
      const rowValues = rows.get(rowNumber) ?? [];
      rowValues.sort((a, b) => a.col - b.col);
      const renderedCells = rowValues.map((entry) => `${XLSX.utils.encode_col(entry.col)}: ${entry.value}`);
      if (renderedCells.length === 0) continue;
      normalizedRows.push(`Row ${rowNumber + 1}: ${renderedCells.join(" | ")}`);
    }

    if (normalizedRows.length === 0) continue;
    sections.push(`# Sheet: ${sheetName}\n${normalizedRows.join("\n")}`);
  }

  return sections.join("\n\n");
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const sections: string[] = [];

  for (const slidePath of slideNames) {
    const slide = zip.file(slidePath);
    if (!slide) continue;

    const xml = await slide.async("text");
    const textTokens = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXmlEntities(match[1]).replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (textTokens.length === 0) continue;
    sections.push(`# Slide ${slideNumber(slidePath)}\n${textTokens.join("\n")}`);
  }

  return sections.join("\n\n");
}

function slideNumber(slidePath: string): number {
  const match = slidePath.match(/slide(\d+)\.xml$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10);
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)));
}
