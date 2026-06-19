import "server-only";

/**
 * Tiny fixed-window rate limiter (in-memory).
 *
 * Adequate for a single self-hosted process. For multi-instance deployments,
 * swap the Map for Redis (INCR + EXPIRE) keeping the same signature.
 */
type Bucket = { count: number; resetAt: number };

const globalForRL = globalThis as unknown as {
  __spkRateBuckets?: Map<string, Bucket>;
};
const buckets =
  globalForRL.__spkRateBuckets ?? (globalForRL.__spkRateBuckets = new Map());

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}
