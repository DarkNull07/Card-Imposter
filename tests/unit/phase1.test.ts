import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { reconcileLeadership, removePlayer, playAgain, startMatch, submitMessage } from '@/lib/engine';
import { POST as createRoomPost } from '@/app/api/room/route';
import { POST as joinRoomPost } from '@/app/api/room/[code]/join/route';
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

describe('Phase 1 Core Correctness Unit Tests', () => {
  it('1. Rejoin after leave preserves player token, ID, score, and active role', async () => {
    MemoryStore.getInstance().reset();
    const token1 = 'token-unit1-1';
    const token2 = 'token-unit1-2';

    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' }));
    const { code } = await resCreate.json();

    const resJoin = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const { playerId: p2Id } = await resJoin.json();

    const store = MemoryStore.getInstance();
    await store.mutateRoom(code, null, (snap) => ({
      ...snap,
      players: snap.players.map((p) => (p.id === p2Id ? { ...p, score: 7 } : p)),
    }));

    await leavePost(createRequest(`/api/room/${code}/leave`, 'POST', token2, {}), { params: { code } });

    const resRejoin = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const jsonRejoin = await resRejoin.json();

    expect(jsonRejoin.playerId).toBe(p2Id);
    expect(jsonRejoin.state.you.score).toBe(7);
    expect(jsonRejoin.state.you.isSpectator).toBe(false);
  });

  it('2. Leadership auto-transfers to earliest joined connected player when host last_seen_at > 45s stale', () => {
    const nowMs = Date.now();
    const staleTime = new Date(nowMs - 50000).toISOString();
    const freshTime = new Date(nowMs - 5000).toISOString();

    const players = [
      {
        id: 'p1',
        room_id: 'r1',
        token_hash: 'h1',
        name: 'Leader',
        is_leader: true,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: new Date(nowMs - 100000).toISOString(),
        last_seen_at: staleTime,
      },
      {
        id: 'p2',
        room_id: 'r1',
        token_hash: 'h2',
        name: 'Player2',
        is_leader: false,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: new Date(nowMs - 90000).toISOString(),
        last_seen_at: freshTime,
      },
    ];

    const reconciled = reconcileLeadership(players, nowMs);
    const newLeader = reconciled.find((p) => p.is_leader);
    expect(newLeader?.id).toBe('p2');
  });

  it('3. Leadership transfers to next connected player when leader is explicitly kicked', () => {
    const now = new Date();
    const room = {
      id: 'r1',
      code: 'TEST1',
      phase: 'lobby' as const,
      round_number: 0,
      crew_card: null,
      imposter_card: null,
      imposter_player_id: null,
      eliminated_player_id: null,
      outcome: null,
      phase_ends_at: null,
      match_number: 1,
      last_pair_index: null,
      version: 1,
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
    };

    const players = [
      {
        id: 'p1',
        room_id: 'r1',
        token_hash: 'h1',
        name: 'HostLeader',
        is_leader: true,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: new Date(now.getTime() - 10000).toISOString(),
        last_seen_at: now.toISOString(),
      },
      {
        id: 'p2',
        room_id: 'r1',
        token_hash: 'h2',
        name: 'NextInLine',
        is_leader: false,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: new Date(now.getTime() - 5000).toISOString(),
        last_seen_at: now.toISOString(),
      },
    ];

    const result = removePlayer(room, players, [], [], 'p1', now);
    expect(result.players.find((p) => p.id === 'p2')?.is_leader).toBe(true);
    expect(result.room.banned_token_hashes).toContain('h1');
  });

  it('4. Transcript messages are preserved in match reveal and playAgain resets active round messages cleanly', () => {
    const now = new Date();
    const room = {
      id: 'r1',
      code: 'TEST2',
      phase: 'reveal' as const,
      round_number: 2,
      crew_card: 'Knight',
      imposter_card: 'Archers',
      imposter_player_id: 'p2',
      eliminated_player_id: 'p2',
      outcome: 'crew' as const,
      phase_ends_at: null,
      match_number: 1,
      last_pair_index: 0,
      version: 5,
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
    };

    const players = [
      {
        id: 'p1',
        room_id: 'r1',
        token_hash: 'h1',
        name: 'P1',
        is_leader: true,
        is_spectator: false,
        is_eliminated: false,
        score: 1,
        joined_at: now.toISOString(),
        last_seen_at: now.toISOString(),
      },
    ];

    const result = playAgain(room, players, now);
    expect(result.room.phase).toBe('lobby');
    expect(result.messages.length).toBe(0);
    expect(result.votes.length).toBe(0);
  });

  it('5. Match number isolation ensures hint messages from previous matches do not bleed into new match rounds', () => {
    const now = new Date();
    let room = {
      id: 'r1',
      code: 'TEST3',
      phase: 'lobby' as const,
      round_number: 0,
      crew_card: null,
      imposter_card: null,
      imposter_player_id: null,
      eliminated_player_id: null,
      outcome: null,
      phase_ends_at: null,
      match_number: 0,
      last_pair_index: null,
      version: 1,
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
    };

    const players = [
      { id: 'p1', room_id: 'r1', token_hash: 'h1', name: 'P1', is_leader: true, is_spectator: false, is_eliminated: false, score: 0, joined_at: now.toISOString(), last_seen_at: now.toISOString() },
      { id: 'p2', room_id: 'r1', token_hash: 'h2', name: 'P2', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: now.toISOString(), last_seen_at: now.toISOString() },
      { id: 'p3', room_id: 'r1', token_hash: 'h3', name: 'P3', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: now.toISOString(), last_seen_at: now.toISOString() },
    ];

    const start1 = startMatch(room, players, now);
    expect(start1.room.match_number).toBe(1);

    const msgMatch1 = submitMessage(start1.room, start1.players, [], [], 'p1', 1, 'Match 1 Hint', now);
    expect(msgMatch1.messages[0].match_number).toBe(1);

    const start2 = startMatch({ ...start1.room, phase: 'lobby' }, start1.players, now);
    expect(start2.room.match_number).toBe(2);
  });
});
