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

/**
 * In-process token bucket rate limiter per player token.
 * Note: Best-effort implementation on serverless environments.
 */
export function checkRateLimit(
  playerToken: string,
  type: 'mutate' | 'poll'
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let bucket = buckets.get(playerToken);

  if (!bucket) {
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
