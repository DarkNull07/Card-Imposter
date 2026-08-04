'use me';
'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ConnectionBadge } from '../../../components/ConnectionBadge';
import { Lobby } from '../../../components/Lobby';
import { RevealPanel } from '../../../components/RevealPanel';
import { RoundPanel } from '../../../components/RoundPanel';
import { Toaster } from '../../../components/Toaster';
import { VotePanel } from '../../../components/VotePanel';
import { usePoll } from '../../../lib/usePoll';

export default function PartyPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params.code as string) || '';
  const code = rawCode.toUpperCase();

  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // Initialize identity and auto-join
  useEffect(() => {
    let token = localStorage.getItem('cardimposter.playerToken');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('cardimposter.playerToken', token);
    }
    setPlayerToken(token);

    const name = localStorage.getItem('cardimposter.displayName') || '';
    setDisplayName(name);

    if (code) {
      localStorage.setItem('cardimposter.lastCode', code);
    }

    const autoJoin = async () => {
      if (!name) {
        // Redirect to home if name is not set
        router.push(`/?code=${code}`);
        return;
      }

      try {
        const res = await fetch(`/api/room/${code}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': token,
          },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || 'Failed to join party');
        }
      } catch (err: any) {
        setToastError(err.message || 'Failed to join party');
      } finally {
        setJoining(false);
      }
    };

    autoJoin();
  }, [code, router]);

  // Main polling hook
  const { state, error: pollError, connectionStatus, clockOffsetMs, refreshState } = usePoll(
    code,
    playerToken,
    !joining
  );

  // Send leave beacon on pagehide
  useEffect(() => {
    if (!code || !playerToken) return;

    const handlePageHide = () => {
      const url = `/api/room/${code}/leave?token=${encodeURIComponent(playerToken)}`;
      try {
        navigator.sendBeacon(url);
      } catch {
        // Fallback
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [code, playerToken]);

  // Combined error handling
  const activeError = toastError || pollError;

  const handleStartGame = async () => {
    if (!playerToken) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/start`, {
        method: 'POST',
        headers: { 'x-player-token': playerToken },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to start game');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to start game');
    } fontFinally: {
      setActionLoading(false);
    }
  };

  const handleLeaveParty = async () => {
    if (!playerToken) return;
    try {
      await fetch(`/api/room/${code}/leave`, {
        method: 'POST',
        headers: { 'x-player-token': playerToken },
      });
    } catch {
      // Ignore leave errors
    } finally {
      router.push('/');
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!playerToken) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': playerToken,
        },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to kick player');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to kick player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitHint = async (body: string) => {
    if (!playerToken || !state) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': playerToken,
        },
        body: JSON.stringify({ round: state.roundNumber, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to submit hint');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to submit hint');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCastVote = async (targetPlayerId: string) => {
    if (!playerToken) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': playerToken,
        },
        body: JSON.stringify({ targetPlayerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to cast vote');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to cast vote');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    if (!playerToken) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/again`, {
        method: 'POST',
        headers: { 'x-player-token': playerToken },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to start next match');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to start next match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndParty = async () => {
    if (!playerToken) return;
    setActionLoading(true);
    setToastError(null);
    try {
      const res = await fetch(`/api/room/${code}/end`, {
        method: 'POST',
        headers: { 'x-player-token': playerToken },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to end party');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to end party');
    } finally {
      setActionLoading(false);
    }
  };

  if (joining || !state) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-textMuted">Connecting to party {code}...</p>
      </div>
    );
  }

  const leaderPlayer = state.players.find((p) => p.isLeader);
  const leaderName = leaderPlayer ? leaderPlayer.name : 'the leader';

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Navigation Bar */}
      <div className="w-full flex items-center justify-between bg-darkSurface border border-borderSubtle rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-black text-lg text-accent tracking-widest">{code}</span>
          <ConnectionBadge status={connectionStatus} />
        </div>
        <button
          onClick={handleLeaveParty}
          className="text-xs font-semibold text-textMuted hover:text-danger px-3 py-1.5 rounded-lg border border-borderSubtle hover:border-danger/40 transition"
        >
          Leave
        </button>
      </div>

      {/* State Machine Phase Views */}
      {state.phase === 'lobby' && (
        <Lobby
          code={state.code}
          players={state.players}
          currentPlayerId={state.you.playerId}
          isLeader={state.you.isLeader}
          isSpectator={state.you.isSpectator}
          onStartGame={handleStartGame}
          onLeaveParty={handleLeaveParty}
          onKickPlayer={handleKickPlayer}
          loading={actionLoading}
        />
      )}

      {state.phase === 'round' && (
        <RoundPanel
          roundNumber={state.roundNumber}
          totalRounds={state.totalRounds}
          phaseEndsAt={state.phaseEndsAt}
          clockOffsetMs={clockOffsetMs}
          cardName={state.you.card}
          isSpectator={state.you.isSpectator}
          hasSubmitted={state.you.hasSubmittedThisRound}
          myMessage={state.you.myMessageThisRound}
          players={state.players}
          rounds={state.rounds}
          onSubmitHint={handleSubmitHint}
          disabled={state.you.isSpectator || state.you.isEliminated}
          loading={actionLoading}
        />
      )}

      {state.phase === 'voting' && (
        <VotePanel
          rounds={state.rounds}
          players={state.players}
          voting={state.voting}
          currentPlayerId={state.you.playerId}
          hasVoted={state.you.hasVoted}
          onVote={handleCastVote}
          disabled={state.you.isSpectator || state.you.isEliminated}
          loading={actionLoading}
        />
      )}

      {state.phase === 'reveal' && state.reveal && (
        <RevealPanel
          reveal={state.reveal}
          players={state.players}
          isLeader={state.you.isLeader}
          leaderName={leaderName}
          onPlayAgain={handlePlayAgain}
          onEndParty={handleEndParty}
          loading={actionLoading}
        />
      )}

      {state.phase === 'ended' && (
        <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl font-black text-white">Party Ended</h2>
          <p className="text-sm text-textMuted">The host has closed this party session.</p>
          <button
            onClick={() => router.push('/')}
            className="min-h-[44px] px-6 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 transition"
          >
            Return to Home
          </button>
        </div>
      )}

      {/* Error Toaster */}
      <Toaster message={activeError} onDismiss={() => setToastError(null)} />
    </div>
  );
}
