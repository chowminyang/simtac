type Counter = {
  count: number;
  resetAt: number;
};

type Store = Map<string, Counter>;

declare global {
  var __simtacRateLimitStore: Store | undefined;
}

const store: Store = global.__simtacRateLimitStore || new Map<string, Counter>();
global.__simtacRateLimitStore = store;

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  existing.count += 1;
  if (existing.count > maxRequests) {
    return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
