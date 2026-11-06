import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { Countdown } from '@/components/Countdown';

describe('P1-5 Regression Test: Countdown onExpire Multiple Fires', () => {
  it('rendering real Countdown component with expired timer should call onExpire at most once', async () => {
    vi.useFakeTimers();
    let expireCallCount = 0;
    const onExpire = vi.fn(() => {
      expireCallCount++;
    });

    const pastPhaseEndsAt = new Date(Date.now() - 1000).toISOString();

    act(() => {
      render(
        React.createElement(Countdown, {
          phaseEndsAt: pastPhaseEndsAt,
          clockOffsetMs: 0,
          onExpire: onExpire,
        })
      );
    });

    // Advance fake timers by 1500ms (3 ticks of the 500ms interval)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    vi.useRealTimers();

    // EXPECTED: onExpire should fire exactly once for this phaseEndsAt value
    // UNFIXED (REAL BUG): onExpire fires on initial updateTimer + every 500ms interval tick while expired (multiple times!)
    expect(expireCallCount).toBe(1);
  });
});
