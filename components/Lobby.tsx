import React, { useState } from 'react';
import { MIN_PLAYERS } from '../lib/config';
import { PlayerState } from '../lib/types';
import { PlayerList } from './PlayerList';
import { RulesDialog } from './RulesDialog';
import { Scoreboard } from './Scoreboard';

interface LobbyProps {
  code: string;
  players: PlayerState[];
  currentPlayerId: string;
  isLeader: boolean;
  isSpectator: boolean;
  onStartGame: () => void;
  onLeaveParty: () => void;
  onKickPlayer: (playerId: string) => void;
  loading?: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  code,
  players,
  currentPlayerId,
  isLeader,
  isSpectator,
  onStartGame,
  onLeaveParty,
  onKickPlayer,
  loading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const activePlayersCount = players.filter((p) => !p.is_spectator).length;
  const canStart = isLeader && activePlayersCount >= MIN_PLAYERS;

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/party/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Spectator Banner */}
      {isSpectator && (
        <div className="w-full bg-purple-950/50 border border-purple-500/40 rounded-2xl p-4 text-center">
          <p className="text-purple-300 font-semibold text-sm">
            🎉 You joined mid-game! You&apos;ll join the next match as an active player.
          </p>
        </div>
      )}

      {/* Party Code & Copy Link Header */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-6 flex flex-col items-center gap-3 text-center shadow-lg">
        <span className="text-xs uppercase tracking-widest font-semibold text-textMuted">
          Party Code
        </span>
        <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-accent">
          {code}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleCopyLink}
            className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-darkBg border border-borderSubtle text-textMain hover:border-accent transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <span>{copied ? '✓ Copied Link!' : '📋 Copy Party Link'}</span>
          </button>
          <button
            onClick={() => setRulesOpen(true)}
            className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-darkBg border border-borderSubtle text-textMuted hover:text-white transition focus:outline-none focus:ring-2 focus:ring-accent"
          >
            ❓ How to Play
          </button>
        </div>
      </div>

      {/* Player List */}
      <PlayerList
        players={players}
        currentPlayerId={currentPlayerId}
        isLeader={isLeader}
        phase="lobby"
        onKick={onKickPlayer}
      />

      {/* Scoreboard */}
      <Scoreboard players={players} />

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3">
        {isLeader && (
          <div className="flex flex-col gap-1">
            <button
              onClick={onStartGame}
              disabled={!canStart || loading}
              className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {loading ? 'Starting...' : 'Start Game'}
            </button>
            {!canStart && (
              <p className="text-xs text-amber-400 text-center mt-1">
                Need at least {MIN_PLAYERS} active players to start (currently {activePlayersCount}).
              </p>
            )}
          </div>
        )}

        <button
          onClick={onLeaveParty}
          className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-danger bg-danger/10 hover:bg-danger/20 border border-danger/30 transition focus:outline-none focus:ring-2 focus:ring-danger"
        >
          Leave Party
        </button>
      </div>

      {/* Rules Dialog */}
      <RulesDialog isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
};
