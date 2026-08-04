'use client';

import { useParams, useRouter } from 'next/navigation';

import React, { useEffect, useState } from 'react';
import { ConnectionBadge } from '@/components/ConnectionBadge';
import { Lobby } from '@/components/Lobby';
import { RevealPanel } from '@/components/RevealPanel';
import { RoundPanel } from '@/components/RoundPanel';
import { Toaster } from '@/components/Toaster';
import { VotePanel } from '@/components/VotePanel';
import { usePoll } from '@/lib/usePoll';

export default function PartyPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params.code as string) || '';
  const code = rawCode.toUpperCase();

  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // Initialize identity and auto-join with timeout and error handling
  useEffect(() => {
    let token = localStorage.getItem('cardimposter.playerToken');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('cardimposter.playerToken', token);
    }
    setPlayerToken(token);

    const name = (localStorage.getItem('cardimposter.displayName') || '').trim();
    setDisplayName(name);

    if (code) {
      localStorage.setItem('cardimposter.lastCode', code);
    }

    // Fix (c): If no displayName exists, redirect immediately to /?code=CODE
    if (!name) {
      router.push(`/?code=${code}`);
      setJoining(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    // Fix (a): Initial fetch timeout (8 seconds)
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        controller.abort();
        setJoining(false);
        setTerminalError('Connection timed out while joining party. Please check your connection.');
      }
    }, 8000);

    const autoJoin = async () => {
      try {
        const res = await fetch(`/api/room/${code}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': token,
          },
          body: JSON.stringify({ name }),
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Fix (b): Handle 404 / 410 room non-existent or expired
          if (res.status === 404 || json.error === 'ROOM_NOT_FOUND') {
            setTerminalError('Party not found. Please check your party code or create a new one.');
            return;
          }
          if (json.error === 'ROOM_EXPIRED') {
            setTerminalError('Party expired. This session has timed out.');
            return;
          }
          // Fix (d): Surface actual error code in toast
          throw new Error(json.message || json.error || `Failed to join party (${res.status})`);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setToastError(err.message || 'Failed to join party');
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setJoining(false);
        }
      }
    };

    autoJoin();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [code, router]);

  // Main polling hook (disabled while initial joining is in progress)
  const { state, error: pollError, connectionStatus, clockOffsetMs, refreshState } = usePoll(
    code,
    playerToken,
    !joining && !terminalError
  );

  // Send leave beacon on pagehide
  useEffect(() => {
    if (!code || !playerToken) return;

    const handlePageHide = () => {
      const url = `/api/room/${code}/leave`;
      try {
        const blob = new Blob([JSON.stringify({ token: playerToken })], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to start game');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to start game');
    } finally {
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to kick player');
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to submit hint');
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to cast vote');
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to start next match');
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
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to end party');
      await refreshState();
    } catch (err: any) {
      setToastError(err.message || 'Failed to end party');
    } finally {
      setActionLoading(false);
    }
  };

  // Render Terminal Error View (Fix b & a)
  if (terminalError) {
    return (
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-8 text-center flex flex-col items-center gap-4 my-8 shadow-2xl animate-fadeIn">
        <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-black text-white">Party Not Found or Expired</h2>
        <p className="text-sm text-textMuted max-w-sm">{terminalError}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Retry Connection
          </button>
          <button
            onClick={() => router.push('/')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render Loading Spinner View
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
