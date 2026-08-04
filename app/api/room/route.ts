import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, jsonError } from '@/lib/api';
import { hashToken } from '@/lib/hash';
import { generatePartyCode } from '@/lib/ids';
import { buildClientState } from '@/lib/redact';
import { checkRateLimit } from '@/lib/rateLimit';
import { getStore } from '@/lib/store';
import { createRoomSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = extractPlayerToken(req);
    if (!token) {
      return jsonError('BAD_REQUEST', 'Missing x-player-token header');
    }

    const rateCheck = checkRateLimit(token, 'mutate');
    if (!rateCheck.allowed) {
      return jsonError('RATE_LIMITED', undefined, rateCheck.retryAfterSeconds);
    }

    const json = await req.json().catch(() => ({}));
    const parseResult = createRoomSchema.safeParse(json);
    if (!parseResult.success) {
      return jsonError('BAD_REQUEST', parseResult.error.errors[0]?.message);
    }

    const { name } = parseResult.data;
    const tokenHash = hashToken(token);
    const store = getStore();

    let room;
    let player;
    let code = '';

    for (let i = 0; i < 5; i++) {
      code = generatePartyCode();
      try {
        const created = await store.createRoom(code, tokenHash, name);
        room = created.room;
        player = created.player;
        break;
      } catch (err: any) {
        if (err.message === 'CONFLICT_RETRY' && i < 4) {
          continue;
        }
        throw err;
      }
    }

    if (!room || !player) {
      return jsonError('CONFLICT_RETRY', 'Failed to generate a unique party code. Please try again.');
    }

    const snapshot = await store.getRoomByCode(code);
    if (!snapshot) {
      return jsonError('INTERNAL', 'Failed to retrieve room state');
    }

    const state = buildClientState(snapshot.room, snapshot.players, snapshot.messages, snapshot.votes, player.id);

    return NextResponse.json(
      { code, playerId: player.id, state },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err.message?.startsWith('SUPABASE_ENV_MISSING')) {
      return jsonError('INTERNAL', err.message);
    }
    return jsonError(err.message || 'INTERNAL');
  }
}
