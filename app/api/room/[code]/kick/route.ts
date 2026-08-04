import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, handleRouteError, jsonError } from '@/lib/api';
import { removePlayer } from '@/lib/engine';
import { hashToken } from '@/lib/hash';
import { buildClientState } from '@/lib/redact';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';
import { kickPlayerSchema } from '@/lib/validation';

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
    const json = await req.json().catch(() => ({}));
    const parseResult = kickPlayerSchema.safeParse(json);
    if (!parseResult.success) {
      return jsonError('BAD_REQUEST', parseResult.error.errors[0]?.message);
    }

    const { playerId } = parseResult.data;
    const tokenHash = hashToken(token);
    const store = getStore();

    const { snapshot, actingPlayer } = await store.mutateRoom(code, tokenHash, (snap, player) => {
      if (!player) {
        throw new Error('NOT_A_PLAYER');
      }
      if (!player.is_leader) {
        throw new Error('NOT_LEADER');
      }
      if (snap.room.phase !== 'lobby') {
        throw new Error('WRONG_PHASE');
      }

      return removePlayer(snap.room, snap.players, snap.messages, snap.votes, playerId);
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
