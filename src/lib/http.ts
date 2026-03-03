import { NextResponse } from "next/server";

import { checkRateLimit, getClientIdentifier } from "./rate-limit";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function enforceRateLimit(
  request: Request,
  bucket: string,
  maxRequests: number,
  windowMs: number,
): NextResponse | null {
  const clientId = getClientIdentifier(request);
  const { allowed, retryAfterMs } = checkRateLimit(`${bucket}:${clientId}`, maxRequests, windowMs);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please retry shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(retryAfterMs / 1000).toString(),
        },
      },
    );
  }
  return null;
}
