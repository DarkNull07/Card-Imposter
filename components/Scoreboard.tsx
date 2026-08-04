import React from 'react';
import { PlayerState } from '@/lib/types';

interface ScoreboardProps {
  players: PlayerState[];
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
        Scoreboard
      </h3>
      <div className="flex flex-col gap-1.5">
        {sorted.map((p, idx) => (
          <div
            key={p.playerId}
            className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-darkBg/30 border border-borderSubtle/50"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-textMuted w-4">{idx + 1}.</span>
              <span className="font-medium text-textMain">{p.name}</span>
            </div>
            <span className="font-mono font-bold text-accent">{p.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};
