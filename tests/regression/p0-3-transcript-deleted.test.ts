import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { POST as createRoomPost } from '@/app/api/room/route';
import { POST as joinRoomPost } from '@/app/api/room/[code]/join/route';
import { POST as startPost } from '@/app/api/room/[code]/start/route';
import { POST as messagePost } from '@/app/api/room/[code]/message/route';
import { POST as votePost } from '@/app/api/room/[code]/vote/route';
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

describe('P0-3 Regression Test: Hint Transcript Deletion at Reveal', () => {
  it('hints submitted during round phase must be preserved and visible in reveal state', async () => {
    MemoryStore.getInstance().reset();
    const token1 = 'token-p03-1';
    const token2 = 'token-p03-2';
    const token3 = 'token-p03-3';

    // 1. Create Room & Join
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' }));
    const { code } = await resCreate.json();
    const resJoin2 = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    const { playerId: p2Id } = await resJoin2.json();
    const resJoin3 = await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } });
    const { playerId: p3Id } = await resJoin3.json();

    // 2. Start match & submit hints for Round 1 & Round 2
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 1, body: 'Hint 1-1' }), { params: { code } });
    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 1, body: 'Hint 1-2' }), { params: { code } });
    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 1, body: 'Hint 1-3' }), { params: { code } });

    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 2, body: 'Hint 2-1' }), { params: { code } });
    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 2, body: 'Hint 2-2' }), { params: { code } });
    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 2, body: 'Hint 2-3' }), { params: { code } });

    // 3. Vote to enter reveal phase
    await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p3Id }), { params: { code } });
    await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token2, { targetPlayerId: p3Id }), { params: { code } });
    const resVote3 = await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token3, { targetPlayerId: p2Id }), { params: { code } });
    const jsonVote3 = await resVote3.json();

    expect(jsonVote3.state.phase).toBe('reveal');

    // 4. Check state in reveal phase
    const resState = await stateGet(createRequest(`/api/room/${code}/state`, 'GET', token1), { params: { code } });
    const jsonState = await resState.json();

    // EXPECTED: rounds messages should be preserved (6 total messages across 2 rounds)
    const totalMessagesInRounds = jsonState.state.rounds.reduce(
      (acc: number, r: any) => acc + (r.messages ? r.messages.length : 0),
      0
    );
    expect(totalMessagesInRounds).toBe(6);
  });
});
