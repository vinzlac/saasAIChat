const RATE_LIMIT = 60; // requests per hour
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: RATE_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: RATE_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: RATE_LIMIT - entry.count,
    resetAt: entry.resetAt,
  };
}
