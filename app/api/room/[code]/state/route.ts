import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, jsonError } from '@/lib/api';
import { advanceIfExpired } from '@/lib/engine';
import { hashToken } from '@/lib/hash';
import { buildClientState } from '@/lib/redact';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractPlayerToken(req);
    if (!token) {
      return jsonError('BAD_REQUEST', 'Missing x-player-token header');
    }

    const rateCheck = checkRateLimit(token, 'poll');
    if (!rateCheck.allowed) {
      return jsonError('RATE_LIMITED', undefined, rateCheck.retryAfterSeconds);
    }

    const code = params.code.toUpperCase();
    const tokenHash = hashToken(token);
    const store = getStore();

    const sinceParam = req.nextUrl.searchParams.get('since');
    const sinceVersion = sinceParam !== null ? parseInt(sinceParam, 10) : null;

    // Mutate room lazily to process timer expiries and update presence
    const now = new Date();
    const { snapshot, actingPlayer } = await store.mutateRoom(code, tokenHash, (snap, player) => {
      const advanced = advanceIfExpired(snap.room, snap.players, snap.messages, snap.votes, now);
      return advanced;
    });

    if (!actingPlayer) {
      return jsonError('NOT_A_PLAYER');
    }

    // Update player's last_seen_at
    await store.updatePlayerLastSeen(actingPlayer.id);

    // If version is unchanged, return 204 No Content
    if (sinceVersion !== null && !isNaN(sinceVersion) && snapshot.room.version === sinceVersion) {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const state = buildClientState(snapshot.room, snapshot.players, snapshot.messages, snapshot.votes, actingPlayer.id, now);

    return NextResponse.json(
      { state },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err.message?.startsWith('SUPABASE_ENV_MISSING')) {
      return jsonError('INTERNAL', err.message);
    }
    return jsonError(err.message || 'INTERNAL');
  }
}
