import { NextRequest, NextResponse } from 'next/server';
import { extractPlayerToken, jsonError } from '@/lib/api';
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
      return removePlayer(snap.room, snap.players, snap.messages, snap.votes, player.id);
    });

    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    if (err.message?.startsWith('SUPABASE_ENV_MISSING')) {
      return jsonError('INTERNAL', err.message);
    }
    return jsonError(err.message || 'INTERNAL');
  }
}
