import React from 'react';
import { RoundState } from '../lib/types';

interface TranscriptProps {
  rounds: RoundState[];
}

export const Transcript: React.FC<TranscriptProps> = ({ rounds }) => {
  return (
    <div className="w-full flex flex-col gap-4" aria-live="polite">
      {rounds.map((r) => (
        <div
          key={r.roundNumber}
          className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-borderSubtle pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
              Round {r.roundNumber} Transcript
            </h4>
            <span className="text-xs text-textMuted font-mono">
              {r.revealed ? 'Revealed' : 'Messages Hidden'}
            </span>
          </div>

          {!r.revealed ? (
            <p className="text-sm text-textMuted italic py-2">
              Waiting for all players to submit their hints...
            </p>
          ) : r.messages.length === 0 ? (
            <p className="text-sm text-textMuted italic py-2">No messages submitted.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {r.messages.map((m, idx) => (
                <div
                  key={`${m.playerId}-${idx}`}
                  className="bg-darkBg/60 border border-borderSubtle/60 rounded-xl p-3 flex flex-col gap-1 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-textMain">{m.name}</span>
                    <span className="text-[10px] text-textMuted font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-textMain/90 break-words font-sans">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
