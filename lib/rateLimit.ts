interface Bucket {
  mutateTokens: number;
  mutateLastRefill: number;
  pollTokens: number;
  pollLastRefill: number;
}

const buckets = new Map<string, Bucket>();

const MUTATE_MAX = 30;
const MUTATE_REFILL_PER_SEC = 30 / 60; // 0.5 per sec

const POLL_MAX = 120;
const POLL_REFILL_PER_SEC = 120 / 60; // 2 per sec

const MAX_BUCKETS = 2000;
const BUCKET_TTL_MS = 10 * 60 * 1000; // 10 minutes idle TTL

function cleanupStaleBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS / 2) return;
  for (const [key, b] of buckets.entries()) {
    if (now - b.mutateLastRefill > BUCKET_TTL_MS && now - b.pollLastRefill > BUCKET_TTL_MS) {
      buckets.delete(key);
    }
  }
}

/**
 * In-process token bucket rate limiter per player token with LRU/TTL eviction.
 */
export function checkRateLimit(
  playerToken: string,
  type: 'mutate' | 'poll'
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  cleanupStaleBuckets(now);

  let bucket = buckets.get(playerToken);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }

    bucket = {
      mutateTokens: MUTATE_MAX,
      mutateLastRefill: now,
      pollTokens: POLL_MAX,
      pollLastRefill: now,
    };
    buckets.set(playerToken, bucket);
  }

  if (type === 'mutate') {
    const elapsed = (now - bucket.mutateLastRefill) / 1000;
    bucket.mutateTokens = Math.min(MUTATE_MAX, bucket.mutateTokens + elapsed * MUTATE_REFILL_PER_SEC);
    bucket.mutateLastRefill = now;

    if (bucket.mutateTokens >= 1) {
      bucket.mutateTokens -= 1;
      return { allowed: true };
    } else {
      const retryAfterSeconds = Math.ceil((1 - bucket.mutateTokens) / MUTATE_REFILL_PER_SEC);
      return { allowed: false, retryAfterSeconds };
    }
  } else {
    const elapsed = (now - bucket.pollLastRefill) / 1000;
    bucket.pollTokens = Math.min(POLL_MAX, bucket.pollTokens + elapsed * POLL_REFILL_PER_SEC);
    bucket.pollLastRefill = now;

    if (bucket.pollTokens >= 1) {
      bucket.pollTokens -= 1;
      return { allowed: true };
    } else {
      const retryAfterSeconds = Math.ceil((1 - bucket.pollTokens) / POLL_REFILL_PER_SEC);
      return { allowed: false, retryAfterSeconds };
    }
  }
}
