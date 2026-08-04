import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientRoomState } from './types';

export type ConnectionStatus = 'connected' | 'amber' | 'red';

export interface UsePollReturn {
  state: ClientRoomState | null;
  error: string | null;
  connectionStatus: ConnectionStatus;
  clockOffsetMs: number;
  refreshState: () => Promise<void>;
}

export function usePoll(
  code: string | null,
  playerToken: string | null,
  enabled: boolean = true
): UsePollReturn {
  const [state, setState] = useState<ClientRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(0);

  const versionRef = useRef<number | null>(null);
  const phaseRef = useRef<string | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async () => {
    if (!code || !playerToken || !enabled) return;

    try {
      const url = `/api/room/${code}/state${
        versionRef.current !== null ? `?since=${versionRef.current}` : ''
      }`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-player-token': playerToken,
        },
        cache: 'no-store',
      });

      if (res.status === 204) {
        // Unchanged state
        consecutiveFailuresRef.current = 0;
        setConnectionStatus('connected');
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const newState: ClientRoomState = json.state;

      // Update clock offset
      if (newState.serverTime) {
        const serverMs = new Date(newState.serverTime).getTime();
        const clientMs = Date.now();
        setClockOffsetMs(serverMs - clientMs);
      }

      versionRef.current = newState.version;
      phaseRef.current = newState.phase;
      setState(newState);
      setError(null);

      consecutiveFailuresRef.current = 0;
      setConnectionStatus('connected');
    } catch (err: any) {
      consecutiveFailuresRef.current += 1;

      if (consecutiveFailuresRef.current === 1) {
        setConnectionStatus('amber');
      } else if (consecutiveFailuresRef.current >= 3) {
        setConnectionStatus('red');
      }

      setError(err.message || 'Failed to sync game state');
    }
  }, [code, playerToken, enabled]);

  // Main polling effect - phaseRef preserves phase without adding state to dependency array
  useEffect(() => {
    if (!code || !playerToken || !enabled) return;

    let isMounted = true;
    const isPollingRef = { current: false };

    const runPollLoop = async () => {
      if (!isMounted) return;

      if (document.hidden) {
        pollTimerRef.current = setTimeout(runPollLoop, 5000);
        return;
      }

      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        await fetchState();
      } finally {
        isPollingRef.current = false;
      }

      if (!isMounted) return;

      // Adjust poll interval based on phase in phaseRef (1500ms in lobby/reveal/ended, 1000ms in active round/voting)
      let baseDelayMs = 1000;
      const currentPhase = phaseRef.current;
      if (currentPhase === 'lobby' || currentPhase === 'reveal' || currentPhase === 'ended') {
        baseDelayMs = 1500;
      }
      let delayMs = baseDelayMs;
      if (consecutiveFailuresRef.current > 0) {
        delayMs = Math.min(8000, Math.pow(2, consecutiveFailuresRef.current - 1) * 1000);
      }

      pollTimerRef.current = setTimeout(runPollLoop, delayMs);
    };

    runPollLoop();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        if (!isPollingRef.current) {
          runPollLoop();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [code, playerToken, enabled, fetchState]);

  return {
    state,
    error,
    connectionStatus,
    clockOffsetMs,
    refreshState: fetchState,
  };
}
