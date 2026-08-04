import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, jsonError } from '@/lib/api';
import { hashToken } from '@/lib/hash';
import { buildClientState } from '@/lib/redact';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';
import { joinRoomSchema } from '@/lib/validation';

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
    const parseResult = joinRoomSchema.safeParse(json);
    if (!parseResult.success) {
      return jsonError('BAD_REQUEST', parseResult.error.errors[0]?.message);
    }

    const { name } = parseResult.data;
    const tokenHash = hashToken(token);
    const store = getStore();

    const { player } = await store.joinRoom(code, tokenHash, name);
    const snapshot = await store.getRoomByCode(code);
    if (!snapshot) {
      return jsonError('ROOM_NOT_FOUND');
    }

    const state = buildClientState(snapshot.room, snapshot.players, snapshot.messages, snapshot.votes, player.id);

    return NextResponse.json(
      { playerId: player.id, state },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err.message?.startsWith('SUPABASE_ENV_MISSING')) {
      return jsonError('INTERNAL', err.message);
    }
    return jsonError(err.message || 'INTERNAL');
  }
}
