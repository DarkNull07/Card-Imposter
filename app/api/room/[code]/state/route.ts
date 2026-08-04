import { extractPlayerToken, handleRouteError, jsonError, jsonStateResponse } from '@/lib/api';
import { advanceIfExpired } from '@/lib/engine';
import { hashToken } from '@/lib/hash';
import { buildClientState } from '@/lib/redact';
import { getStore } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const token = extractPlayerToken(req);
    if (!token) {
      return jsonError('NOT_A_PLAYER', 'Player token header required');
    }

    const code = params.code.toUpperCase();
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const sinceVersion = sinceParam !== null ? parseInt(sinceParam, 10) : null;
    const tokenHash = hashToken(token);

    const store = getStore();

    // Fast path: cheap room version & player membership query
    if (sinceVersion !== null && !isNaN(sinceVersion)) {
      const meta = await store.getRoomVersionAndPlayer(code, tokenHash);

      if (!meta || !meta.roomExists) {
        return jsonError('ROOM_NOT_FOUND', 'Room does not exist');
      }

      if (!meta.isMember) {
        return jsonError('NOT_A_PLAYER', 'You are not in this room');
      }

      const isTimerExpired =
        (meta.phase === 'round' || meta.phase === 'voting') &&
        meta.phase_ends_at !== null &&
        new Date(meta.phase_ends_at).getTime() <= Date.now();

      if (!isTimerExpired && meta.version === sinceVersion) {
        return new NextResponse(null, {
          status: 204,
          headers: NO_CACHE_HEADERS,
        });
      }
    }

    // Full path: fetch room snapshot
    let snapshot = await store.getRoomByCode(code);

    if (!snapshot) {
      return jsonError('ROOM_NOT_FOUND', 'Room does not exist');
    }

    const requestingPlayer = snapshot.players.find((p) => p.token_hash === tokenHash);

    if (!requestingPlayer) {
      return jsonError('NOT_A_PLAYER', 'You are not in this room');
    }

    // Update presence (throttled to 10s)
    await store.updatePlayerLastSeen(requestingPlayer.id);

    // Timer engine: only advance active phases (round or voting) when timer is expired
    const isTimerExpired =
      (snapshot.room.phase === 'round' || snapshot.room.phase === 'voting') &&
      snapshot.room.phase_ends_at !== null &&
      new Date(snapshot.room.phase_ends_at).getTime() <= Date.now();

    if (isTimerExpired) {
      const mutated = await store.mutateRoom(code, null, (snap) =>
        advanceIfExpired(snap.room, snap.players, snap.messages, snap.votes, new Date())
      );
      snapshot = mutated.snapshot;
    }

    // Re-check since version after potential timer mutation
    if (sinceVersion !== null && !isNaN(sinceVersion) && snapshot.room.version === sinceVersion) {
      return new NextResponse(null, {
        status: 204,
        headers: NO_CACHE_HEADERS,
      });
    }

    // Return full client state
    const clientState = buildClientState(
      snapshot.room,
      snapshot.players,
      snapshot.messages,
      snapshot.votes,
      requestingPlayer.id
    );

    return jsonStateResponse({ state: clientState });
  } catch (err: any) {
    return handleRouteError(err);
  }
}
