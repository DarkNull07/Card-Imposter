import React from 'react';
import { PlayerState } from '../lib/types';

interface PlayerListProps {
  players: PlayerState[];
  currentPlayerId: string;
  isLeader: boolean;
  phase: string;
  onKick?: (playerId: string) => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentPlayerId,
  isLeader,
  phase,
  onKick,
}) => {
  return (
    <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
          Players ({players.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {players.map((p) => {
          const isYou = p.playerId === currentPlayerId;

          return (
            <div
              key={p.playerId}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition ${
                isYou
                  ? 'bg-accent/10 border-accent/40 text-white font-medium'
                  : 'bg-darkBg/50 border-borderSubtle text-textMain'
              } ${!p.connected ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Connection dot */}
                <span
                  aria-label={p.connected ? 'Connected' : 'Disconnected'}
                  title={p.connected ? 'Connected' : 'Disconnected'}
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    p.connected ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-600'
                  }`}
                />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {p.name} {isYou ? '(You)' : ''}
                </span>
                {p.isLeader && (
                  <span title="Leader" className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                    👑 Leader
                  </span>
                )}
                {p.isSpectator && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                    Spectator
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-textMuted bg-darkBg px-2 py-1 rounded-lg">
                  {p.score} pts
                </span>
                {isLeader && phase === 'lobby' && !p.isLeader && !isYou && onKick && (
                  <button
                    onClick={() => onKick(p.playerId)}
                    title="Kick player"
                    className="min-h-[36px] px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-danger"
                  >
                    Kick
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
