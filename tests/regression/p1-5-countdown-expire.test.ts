import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { Countdown } from '@/components/Countdown';

describe('P1-5 Regression Test: Countdown onExpire Multiple Fires', () => {
  it('onExpire callback should be called at most once per phaseEndsAt value when timer expires', async () => {
    vi.useFakeTimers();
    let expireCallCount = 0;
    const onExpire = () => {
      expireCallCount++;
    };

    const pastPhaseEndsAt = new Date(Date.now() - 1000).toISOString();

    // Replicate the Countdown component effect logic
    const targetMs = new Date(pastPhaseEndsAt).getTime();
    const clockOffsetMs = 0;

    const updateTimer = () => {
      const currentServerTimeMs = Date.now() + clockOffsetMs;
      const remainingMs = targetMs - currentServerTimeMs;
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));

      if (secs === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 500);

    // Fast-forward fake timers by 1500ms (3 ticks of 500ms)
    vi.advanceTimersByTime(1500);
    clearInterval(interval);

    vi.useRealTimers();

    // EXPECTED: onExpire should fire exactly once for this phaseEndsAt value
    // CURRENT (UNFIXED): onExpire fires on initial call + 3 interval ticks = 4 times!
    expect(expireCallCount).toBe(1);
  });
});
