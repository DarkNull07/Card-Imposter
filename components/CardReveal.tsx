import React, { useState } from 'react';

interface CardRevealProps {
  cardName: string | null;
  isSpectator?: boolean;
}

export const CardReveal: React.FC<CardRevealProps> = ({ cardName, isSpectator = false }) => {
  const [revealed, setRevealed] = useState(false);

  if (isSpectator) {
    return (
      <div className="w-full bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 text-center">
        <p className="text-purple-300 text-sm font-semibold">
          You are spectating this match. You&apos;ll join the next match!
        </p>
      </div>
    );
  }

  if (!cardName) return null;

  return (
    <div className="w-full flex flex-col items-center gap-2 my-2">
      <p className="text-xs uppercase tracking-wider font-semibold text-textMuted">
        Your Secret Card Assignment
      </p>

      <button
        type="button"
        onMouseDown={() => setRevealed(true)}
        onMouseUp={() => setRevealed(false)}
        onMouseLeave={() => setRevealed(false)}
        onTouchStart={() => setRevealed(true)}
        onTouchEnd={() => setRevealed(false)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') setRevealed(true);
        }}
        onKeyUp={() => setRevealed(false)}
        className="w-full max-w-sm h-32 rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-slate-900 to-darkSurface flex flex-col items-center justify-center p-4 cursor-pointer select-none transition shadow-lg hover:border-accent active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="Hold to reveal your secret card"
      >
        {revealed ? (
          <div className="flex flex-col items-center gap-1 animate-fadeIn">
            <span className="text-xs text-accent font-semibold uppercase tracking-widest">
              Secret Card
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white tracking-wide text-center">
              {cardName}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">🔒</span>
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider bg-darkBg/60 px-3 py-1.5 rounded-full border border-borderSubtle">
              Press & Hold to Reveal
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
