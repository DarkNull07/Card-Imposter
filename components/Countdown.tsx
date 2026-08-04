import React, { useEffect, useState } from 'react';

interface CountdownProps {
  phaseEndsAt: string | null;
  clockOffsetMs: number;
  onExpire?: () => void;
}

export const Countdown: React.FC<CountdownProps> = ({
  phaseEndsAt,
  clockOffsetMs,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsLeft(null);
      return;
    }

    const targetMs = new Date(phaseEndsAt).getTime();

    const updateTimer = () => {
      const currentServerTimeMs = Date.now() + clockOffsetMs;
      const remainingMs = targetMs - currentServerTimeMs;
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);

      if (secs === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [phaseEndsAt, clockOffsetMs, onExpire]);

  if (secondsLeft === null) return null;

  const isLow = secondsLeft <= 15;

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-xs uppercase tracking-wider text-textMuted">Time:</span>
      <span
        className={`text-lg font-bold px-3 py-1 rounded-xl border transition ${
          isLow
            ? 'bg-danger/20 border-danger/40 text-danger animate-pulse'
            : 'bg-darkBg border-borderSubtle text-accent'
        }`}
      >
        {secondsLeft}s
      </span>
    </div>
  );
};
