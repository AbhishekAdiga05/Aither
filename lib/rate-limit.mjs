// In-memory fixed-window rate limiter (per-user / per-IP).
// NOTE: on serverless/multi-instance deploys this is per-instance, so it's a
// complementary guard, not a hard global quota. To harden further, swap the
// Map for Redis (@upstash/redis) with the same API surface.

const DEFAULT_LIMIT = parseInt(process.env.CHAT_RATE_LIMIT_MAX ?? "40", 10);
const DEFAULT_WINDOW_MS = parseInt(
  process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? String(10 * 60 * 1000),
  10,
);

const MAX_BUCKETS = 50_000;
const buckets = new Map();

export function rateLimit(
  key,
  { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {},
) {
  const normalizedKey = String(key || "global");
  const now = Date.now();

  let entry = buckets.get(normalizedKey);
  if (!entry || now - entry.startedAt >= windowMs) {
    entry = { count: 0, startedAt: now };
    buckets.set(normalizedKey, entry);
  }
  entry.count += 1;

  // Periodic cleanup of expired windows.
  if (buckets.size % 200 === 0) {
    for (const [k, v] of buckets) {
      if (now - v.startedAt >= windowMs) buckets.delete(k);
    }
  }

  // Bounded memory: evict oldest 20% when saturated.
  if (buckets.size > MAX_BUCKETS) {
    const oldest = [...buckets.entries()].sort(
      (a, b) => a[1].startedAt - b[1].startedAt,
    );
    for (let i = 0; i < Math.floor(MAX_BUCKETS * 0.2); i++) {
      buckets.delete(oldest[i][0]);
    }
  }

  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.startedAt + windowMs;

  return {
    allowed: entry.count <= limit,
    remaining,
    limit,
    resetAt,
    retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
  };
}