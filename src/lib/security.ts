const NRIC_REGEX = /\b[STFGM]\d{7}[A-Z]\b/gi;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d[\d -]{7,}\d)\b/g;

export function redactSensitiveText(input: string): string {
  return input
    .replace(NRIC_REGEX, "[REDACTED_ID]")
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
    .replace(PHONE_REGEX, "[REDACTED_PHONE]");
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  return "Unexpected server error.";
}

export function safeLog(label: string, payload: unknown): void {
  const normalized = typeof payload === "string" ? payload : JSON.stringify(payload);
  console.error(label, redactSensitiveText(normalized));
}
