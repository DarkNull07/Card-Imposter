import { extractPlayerToken, formatError } from '@/lib/api';
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
        status: 401,
        headers: NO_CACHE_HEADERS,
      });
    }

    const code = params.code.toUpperCase();
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const sinceVersion = sinceParam !== null ? parseInt(sinceParam, 10) : null;

    const store = getStore();
    const snapshot = await store.getRoomByCode(code);

    if (!snapshot) {
      return NextResponse.json(formatError('ROOM_NOT_FOUND', 'Room does not exist'), {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    const requestingPlayer = snapshot.players.find((p) => p.token_hash === tokenHash);

    if (!requestingPlayer) {
      return NextResponse.json(formatError('NOT_A_PLAYER', 'You are not in this room'), {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    // Update presence
    await store.updatePlayerLastSeen(requestingPlayer.id);

    // Long poll / version check (only if sinceVersion is valid and matches current room version)
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
