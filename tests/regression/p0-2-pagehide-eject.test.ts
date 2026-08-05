import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { POST as createRoomPost } from '@/app/api/room/route';
import { POST as joinRoomPost } from '@/app/api/room/[code]/join/route';
import { POST as startPost } from '@/app/api/room/[code]/start/route';
import { POST as leavePost } from '@/app/api/room/[code]/leave/route';
import { NextRequest } from 'next/server';

process.env.STORAGE_DRIVER = 'memory';

function createRequest(url: string, method: string, token: string | null, body?: any): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['x-player-token'] = token;
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('P0-2 Regression Test: Pagehide Beacon Ejection', () => {
  it('rejoining after a pagehide leave beacon should restore existing player row, score, and active role', async () => {
    MemoryStore.getInstance().reset();
    const token1 = 'token-leader-p02';
    const token2 = 'token-player-p02';
    const token3 = 'token-player3-p02';

    // 1. Create Room & Join
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'Leader' }));
    const jsonCreate = await resCreate.json();
    const code = jsonCreate.code;

    const resJoin2 = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const jsonJoin2 = await resJoin2.json();
    const originalP2Id = jsonJoin2.playerId;

    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } });

    // 2. Give player 2 a score in store
    const store = MemoryStore.getInstance();
    await store.mutateRoom(code, null, (snap) => ({
      ...snap,
      players: snap.players.map((p) => (p.id === originalP2Id ? { ...p, score: 5 } : p)),
    }));

    // 3. Start Match
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    // 4. Simulate pagehide sendBeacon calling POST /leave
    await leavePost(createRequest(`/api/room/${code}/leave`, 'POST', token2, {}), { params: { code } });

    // 5. Player 2 refreshes page and auto-joins with same token
    const resRejoin = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const jsonRejoin = await resRejoin.json();

    // EXPECTED (should pass once P0-2 is fixed, fails currently because leave deleted player):
    expect(jsonRejoin.playerId).toBe(originalP2Id);
    expect(jsonRejoin.state.you.score).toBe(5);
    expect(jsonRejoin.state.you.isSpectator).toBe(false);
  });
});
