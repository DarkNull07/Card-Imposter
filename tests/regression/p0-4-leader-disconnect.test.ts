import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { POST as createRoomPost } from '@/app/api/room/route';
import { POST as joinRoomPost } from '@/app/api/room/[code]/join/route';
import { GET as stateGet } from '@/app/api/room/[code]/state/route';
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

describe('P0-4 Regression Test: Disconnected Leader Failover', () => {
  it('should auto-transfer leadership to earliest-joined connected player when host last_seen_at is > 45s stale', async () => {
    MemoryStore.getInstance().reset();
    const token1 = 'token-leader-p04';
    const token2 = 'token-player2-p04';

    // 1. Create Room (P1 is leader) & Join P2
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'Leader1' }));
    const { code, playerId: p1Id } = await resCreate.json();

    const resJoin2 = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const { playerId: p2Id } = await resJoin2.json();

    // 2. Age P1's last_seen_at by 60 seconds (simulating network crash / hidden tab without leave)
    const store = MemoryStore.getInstance();
    const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
    await store.mutateRoom(code, null, (snap) => ({
      ...snap,
      players: snap.players.map((p) => (p.id === p1Id ? { ...p, last_seen_at: sixtySecsAgo } : p)),
    }));

    // 3. P2 polls GET /state
    const resState = await stateGet(createRequest(`/api/room/${code}/state`, 'GET', token2), { params: { code } });
    const jsonState = await resState.json();

    // EXPECTED: Leadership should transfer to connected player P2
    const p2State = jsonState.state.players.find((p: any) => p.playerId === p2Id);
    const p1State = jsonState.state.players.find((p: any) => p.playerId === p1Id);

    expect(p2State?.isLeader).toBe(true);
    expect(p1State?.isLeader).toBe(false);
  });
});
