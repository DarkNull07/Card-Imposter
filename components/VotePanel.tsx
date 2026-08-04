import React, { useState } from 'react';
import { PlayerState, RoundState, VotingState } from '../lib/types';
import { Transcript } from './Transcript';

interface VotePanelProps {
  rounds: RoundState[];
  players: PlayerState[];
  voting: VotingState | null;
  currentPlayerId: string;
  hasVoted: boolean;
  onVote: (targetPlayerId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const VotePanel: React.FC<VotePanelProps> = ({
  rounds,
  players,
  voting,
  currentPlayerId,
  hasVoted,
  onVote,
  disabled = false,
  loading = false,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<PlayerState | null>(null);

  const activeCandidates = players.filter((p) => !p.is_spectator && !p.is_eliminated);

  const handleConfirmVote = () => {
    if (selectedCandidate) {
      onVote(selectedCandidate.playerId);
      setSelectedCandidate(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Both rounds transcript on top */}
      <Transcript rounds={rounds} />

      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-accent">
            Vote to Eliminate the Imposter
          </h3>
          {voting && (
            <span className="text-xs font-mono font-bold text-textMuted bg-darkBg px-3 py-1 rounded-full border border-borderSubtle">
              {voting.votesCast} of {voting.votesNeeded} votes in
            </span>
          )}
        </div>

        {hasVoted ? (
          <div className="bg-darkBg/60 border border-success/30 rounded-xl p-4 text-center flex flex-col items-center gap-1">
            <span className="text-success text-xl font-bold">✓ Vote Locked In</span>
            <p className="text-xs text-textMuted">
              Waiting for remaining votes or timer expiry...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-textMuted">
              Select the player you suspect is the Imposter:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeCandidates.map((p) => {
                const isSelf = p.playerId === currentPlayerId;
                const isSelected = selectedCandidate?.playerId === p.playerId;

                return (
                  <button
                    key={p.playerId}
                    onClick={() => setSelectedCandidate(p)}
                    disabled={isSelf || disabled || loading}
                    className={`min-h-[48px] px-4 py-3 rounded-xl border flex items-center justify-between font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-accent ${
                      isSelf
                        ? 'opacity-40 bg-darkBg border-borderSubtle cursor-not-allowed text-textMuted'
                        : isSelected
                        ? 'bg-accent border-accent text-white font-bold shadow-md'
                        : 'bg-darkBg hover:bg-darkBg/80 border-borderSubtle text-textMain'
                    }`}
                  >
                    <span>
                      {p.name} {isSelf ? '(You)' : ''}
                    </span>
                    {isSelected && <span>✓ Selected</span>}
                  </button>
                );
              })}
            </div>

            {/* Vote confirmation modal step */}
            {selectedCandidate && (
              <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-accent/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                <p className="text-sm font-semibold text-textMain">
                  Cast vote for <span className="text-accent font-bold">{selectedCandidate.name}</span>?
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="flex-1 sm:flex-initial min-h-[40px] px-4 py-2 text-xs font-semibold text-textMuted hover:text-white bg-darkBg rounded-lg border border-borderSubtle transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmVote}
                    disabled={loading}
                    className="flex-1 sm:flex-initial min-h-[40px] px-5 py-2 text-xs font-bold text-white bg-accent hover:bg-accent/90 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {loading ? 'Confirming...' : 'Confirm Vote'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
