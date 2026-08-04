import React from 'react';
import { PlayerState, RevealState } from '@/lib/types';
import { Scoreboard } from './Scoreboard';

interface RevealPanelProps {
  reveal: RevealState;
  players: PlayerState[];
  isLeader: boolean;
  leaderName: string;
  onPlayAgain: () => void;
  onEndParty: () => void;
  loading?: boolean;
}

export const RevealPanel: React.FC<RevealPanelProps> = ({
  reveal,
  players,
  isLeader,
  leaderName,
  onPlayAgain,
  onEndParty,
  loading = false,
}) => {
  const isCrewWin = reveal.outcome === 'crew';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Winner Banner */}
      <div
        className={`w-full rounded-2xl p-6 text-center border shadow-xl flex flex-col items-center gap-2 animate-fadeIn ${
          isCrewWin
            ? 'bg-gradient-to-br from-green-950/80 to-darkSurface border-success/40 text-success'
            : 'bg-gradient-to-br from-red-950/80 to-darkSurface border-danger/40 text-danger'
        }`}
      >
        <span className="text-xs uppercase tracking-widest font-extrabold opacity-80">
          Match Result
        </span>
        <h2 className="text-3xl sm:text-4xl font-black tracking-wide">
          {isCrewWin ? 'CREW WINS!' : 'IMPOSTER WINS!'}
        </h2>
        <p className="text-sm font-medium text-textMain/90 mt-1">
          {reveal.eliminatedName ? (
            <>
              <span className="font-bold text-white">{reveal.eliminatedName}</span> was eliminated!
            </>
          ) : (
            'Nobody was eliminated due to a vote tie!'
          )}
        </p>
        <p className="text-xs text-textMuted">
          The Imposter was <span className="font-bold text-amber-400">{reveal.imposterName}</span>
        </p>
      </div>

      {/* Cards side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col items-center text-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-textMuted">
            Crew Card
          </span>
          <span className="text-xl font-extrabold text-accent">{reveal.crewCard}</span>
        </div>
        <div className="bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col items-center text-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-textMuted">
            Imposter Card
          </span>
          <span className="text-xl font-extrabold text-danger">{reveal.imposterCard}</span>
        </div>
      </div>

      {/* Vote Breakdown */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
          Vote Breakdown
        </h3>
        <div className="flex flex-col gap-2">
          {reveal.tally.map((item) => (
            <div
              key={item.targetPlayerId}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-darkBg/50 border border-borderSubtle/50 text-sm gap-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-textMain">{item.targetName}</span>
                <span className="text-xs font-mono font-bold text-accent bg-darkBg px-2 py-0.5 rounded">
                  {item.votes} {item.votes === 1 ? 'vote' : 'votes'}
                </span>
              </div>
              <span className="text-xs text-textMuted">
                Voters: {item.voters.length > 0 ? item.voters.join(', ') : 'None'}
              </span>
            </div>
          ))}

          {reveal.abstains.length > 0 && (
            <div className="p-3 rounded-xl bg-darkBg/30 border border-borderSubtle/30 text-xs text-textMuted flex items-center justify-between">
              <span>Abstained (Timer expired):</span>
              <span className="font-medium text-textMain">{reveal.abstains.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Updated Scoreboard */}
      <Scoreboard players={players} />

      {/* Next Match Controls */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
        {isLeader ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onPlayAgain}
              disabled={loading}
              className="flex-1 min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {loading ? 'Starting...' : 'Play Again'}
            </button>
            <button
              onClick={onEndParty}
              disabled={loading}
              className="min-h-[44px] px-5 py-3 rounded-xl font-bold text-danger bg-danger/10 hover:bg-danger/20 border border-danger/30 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-danger"
            >
              End Party
            </button>
          </div>
        ) : (
          <p className="text-sm text-textMuted text-center py-2 animate-pulse">
            Waiting for <span className="text-white font-bold">{leaderName}</span> to start the next match...
          </p>
        )}
      </div>
    </div>
  );
};
