import React from 'react';
import { PlayerState, RoundState } from '@/lib/types';
import { CardReveal } from './CardReveal';
import { Countdown } from './Countdown';
import { MessageInput } from './MessageInput';
import { Transcript } from './Transcript';

interface RoundPanelProps {
  roundNumber: number;
  totalRounds: number;
  phaseEndsAt: string | null;
  clockOffsetMs: number;
  cardName: string | null;
  isSpectator: boolean;
  hasSubmitted: boolean;
  myMessage: string | null;
  players: PlayerState[];
  rounds: RoundState[];
  onSubmitHint: (body: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const RoundPanel: React.FC<RoundPanelProps> = ({
  roundNumber,
  totalRounds,
  phaseEndsAt,
  clockOffsetMs,
  cardName,
  isSpectator,
  hasSubmitted,
  myMessage,
  players,
  rounds,
  onSubmitHint,
  disabled = false,
  loading = false,
}) => {
  const activeAlivePlayers = players.filter((p) => !p.isSpectator && !p.isEliminated);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-white">
          Round {roundNumber} of {totalRounds}
        </h2>
        <Countdown phaseEndsAt={phaseEndsAt} clockOffsetMs={clockOffsetMs} />
      </div>

      {/* Secret Card Reveal Component */}
      <CardReveal cardName={cardName} isSpectator={isSpectator} />

      {/* Round 1 Transcript (visible during Round 2) */}
      {roundNumber > 1 && <Transcript rounds={rounds.filter((r) => r.roundNumber < roundNumber)} />}

      {/* Hint Input */}
      {!isSpectator && (
        <MessageInput
          onSubmit={onSubmitHint}
          hasSubmitted={hasSubmitted}
          myMessage={myMessage}
          disabled={disabled}
          loading={loading}
        />
      )}

      {/* Waiting List */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-textMuted">
          Submission Progress ({players.filter((p) => p.hasSubmittedThisRound).length} / {activeAlivePlayers.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {activeAlivePlayers.map((p) => (
            <div
              key={p.playerId}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                p.hasSubmittedThisRound
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-darkBg border-borderSubtle text-textMuted'
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span>{p.hasSubmittedThisRound ? '✓ Submitted' : '⏳ Waiting'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
