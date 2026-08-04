import { extractPlayerToken, formatError } from '@/lib/api';
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
      return NextResponse.json(formatError('MISSING_TOKEN', 'Player token header required'), {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    const code = params.code.toUpperCase();
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const sinceVersion = sinceParam !== null ? parseInt(sinceParam, 10) : null;

    const store = getStore();

    // Issue 5b: Lightweight version check before fetching full snapshot
    if (sinceVersion !== null && !isNaN(sinceVersion)) {
      const roomVer = await store.getRoomVersion(code);
      if (!roomVer) {
        return NextResponse.json(formatError('ROOM_NOT_FOUND', 'Room does not exist'), {
          status: 404,
          headers: NO_CACHE_HEADERS,
        });
      }

      const isTimerExpired =
        roomVer.phase_ends_at !== null &&
        new Date(roomVer.phase_ends_at).getTime() <= Date.now();

      if (!isTimerExpired && roomVer.version === sinceVersion) {
        return new NextResponse(null, {
          status: 204,
          headers: NO_CACHE_HEADERS,
        });
      }
    }

    // Fetch full room snapshot
    let snapshot = await store.getRoomByCode(code);

    if (!snapshot) {
      return NextResponse.json(formatError('ROOM_NOT_FOUND', 'Room does not exist'), {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const tokenHash = hashToken(token);
    const requestingPlayer = snapshot.players.find((p) => p.token_hash === tokenHash);

    if (!requestingPlayer) {
      return NextResponse.json(formatError('NOT_A_PLAYER', 'You are not in this room'), {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    // Update presence (throttled to 10s)
    await store.updatePlayerLastSeen(requestingPlayer.id);

    // Issue 1: Restore timer engine (advanceIfExpired) in state route handler
    const isTimerExpired =
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

    return NextResponse.json({ state: clientState }, {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (err: any) {
    return NextResponse.json(formatError('INTERNAL_ERROR', err.message || 'Internal server error'), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
