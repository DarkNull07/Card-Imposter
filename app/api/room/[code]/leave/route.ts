import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, handleRouteError, jsonError } from '@/lib/api';
import { removePlayer } from '@/lib/engine';
import { hashToken } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    let token = extractPlayerToken(req);

    // Fallback for sendBeacon: check query param ?token= or body { token }
    if (!token) {
      token = req.nextUrl.searchParams.get('token');
    }
    if (!token) {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.token === 'string') {
        token = body.token.trim();
      }
    }

    if (!token) {
      return jsonError('BAD_REQUEST', 'Missing player token');
    }

    const rateCheck = checkRateLimit(token, 'mutate');
    if (!rateCheck.allowed) {
      return jsonError('RATE_LIMITED', undefined, rateCheck.retryAfterSeconds);
    }

    const code = params.code.toUpperCase();
    const tokenHash = hashToken(token);
    const store = getStore();

    await store.mutateRoom(code, tokenHash, (snap, player) => {
      if (!player) {
        return snap;
      }
      const now = new Date().toISOString();
      const updatedPlayers = snap.players.map((p) =>
        p.id === player.id ? { ...p, last_seen_at: new Date(Date.now() - 60000).toISOString() } : p
      );
      return {
        room: {
          ...snap.room,
          version: snap.room.version + 1,
          last_activity_at: now,
        },
        players: updatedPlayers,
        messages: snap.messages,
        votes: snap.votes,
      };
    });

    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return handleRouteError(err);
  }
}
