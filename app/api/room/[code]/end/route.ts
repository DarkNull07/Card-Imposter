import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, handleRouteError, jsonError } from '@/lib/api';
import { hashToken } from '@/lib/hash';
import { buildClientState } from '@/lib/redact';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const token = extractPlayerToken(req);
    if (!token) {
      return jsonError('BAD_REQUEST', 'Missing x-player-token header');
    }

    const rateCheck = checkRateLimit(token, 'mutate');
    if (!rateCheck.allowed) {
      return jsonError('RATE_LIMITED', undefined, rateCheck.retryAfterSeconds);
    }

    const code = params.code.toUpperCase();
    const tokenHash = hashToken(token);
    const store = getStore();

    const { snapshot, actingPlayer } = await store.mutateRoom(code, tokenHash, (snap, player) => {
      if (!player) {
        throw new Error('NOT_A_PLAYER');
      }
      if (!player.is_leader) {
        throw new Error('NOT_LEADER');
      }

      return {
        room: {
          ...snap.room,
          phase: 'ended',
          version: snap.room.version + 1,
          last_activity_at: new Date().toISOString(),
        },
        players: snap.players,
        messages: snap.messages,
        votes: snap.votes,
      };
    });

    const state = buildClientState(
      snapshot.room,
      snapshot.players,
      snapshot.messages,
      snapshot.votes,
      actingPlayer!.id
    );

    return NextResponse.json(
      { state },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return handleRouteError(err);
  }
}
