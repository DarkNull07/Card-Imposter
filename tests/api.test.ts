import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { POST as createRoomPost } from '@/app/api/room/route';
import { POST as joinRoomPost } from '@/app/api/room/[code]/join/route';
import { GET as stateGet } from '@/app/api/room/[code]/state/route';
import { POST as startPost } from '@/app/api/room/[code]/start/route';
import { POST as messagePost } from '@/app/api/room/[code]/message/route';
import { POST as votePost } from '@/app/api/room/[code]/vote/route';
import { POST as againPost } from '@/app/api/room/[code]/again/route';
import { POST as endPost } from '@/app/api/room/[code]/end/route';
import { POST as leavePost } from '@/app/api/room/[code]/leave/route';
import { NextRequest, NextResponse } from 'next/server';

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

async function expectStatus(res: NextResponse, expectedStatus: number): Promise<any> {
  const text = await res.text();
  let json: any = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (res.status !== expectedStatus) {
    console.error(`Expected status ${expectedStatus} but received ${res.status}. Body:`, JSON.stringify(json));
  }
  expect(res.status).toBe(expectedStatus);
  return json;
}

describe('API Route Handlers - Integration Tests', () => {
  beforeEach(() => {
    MemoryStore.getInstance().reset();
  });

  it('1. Full Match Success Flow (create, join, start, 2 rounds, vote, reveal, play again, leave)', async () => {
    const token1 = 'token-leader-1111';
    const token2 = 'token-player-2222';
    const token3 = 'token-player-3333';

    // Create Room
    const reqCreate = createRequest('/api/room', 'POST', token1, { name: 'LeaderBob' });
    const resCreate = await createRoomPost(reqCreate);
    const jsonCreate = await expectStatus(resCreate, 201);
    const code = jsonCreate.code;
    const p1Id = jsonCreate.playerId;
    expect(code).toHaveLength(5);

    // Join Player 2 & 3
    const reqJoin2 = createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'PlayerTwo' });
    const resJoin2 = await joinRoomPost(reqJoin2, { params: { code } });
    const jsonJoin2 = await expectStatus(resJoin2, 200);
    const p2Id = jsonJoin2.playerId;

    const reqJoin3 = createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'PlayerThree' });
    const resJoin3 = await joinRoomPost(reqJoin3, { params: { code } });
    const jsonJoin3 = await expectStatus(resJoin3, 200);
    const p3Id = jsonJoin3.playerId;

    // Poll state
    const reqPoll = createRequest(`/api/room/${code}/state`, 'GET', token1);
    const resPoll = await stateGet(reqPoll, { params: { code } });
    const jsonPoll = await expectStatus(resPoll, 200);
    expect(jsonPoll.state.players).toHaveLength(3);

    // Start Game
    const reqStart = createRequest(`/api/room/${code}/start`, 'POST', token1, {});
    const resStart = await startPost(reqStart, { params: { code } });
    const jsonStart = await expectStatus(resStart, 200);
    expect(jsonStart.state.phase).toBe('round');
    expect(jsonStart.state.roundNumber).toBe(1);

    // Submit Round 1 hints
    await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 1, body: 'Hint 1' }), { params: { code } }), 200);
    await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 1, body: 'Hint 2' }), { params: { code } }), 200);
    const jsonMsg3 = await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 1, body: 'Hint 3' }), { params: { code } }), 200);
    expect(jsonMsg3.state.roundNumber).toBe(2);

    // Submit Round 2 hints
    await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 2, body: 'R2 Hint 1' }), { params: { code } }), 200);
    await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 2, body: 'R2 Hint 2' }), { params: { code } }), 200);
    const jsonMsg3_r2 = await expectStatus(await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 2, body: 'R2 Hint 3' }), { params: { code } }), 200);
    expect(jsonMsg3_r2.state.phase).toBe('voting');

    // Cast votes
    await expectStatus(await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p3Id }), { params: { code } }), 200);
    await expectStatus(await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token2, { targetPlayerId: p3Id }), { params: { code } }), 200);
    const jsonVoteLast = await expectStatus(await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token3, { targetPlayerId: p2Id }), { params: { code } }), 200);

    expect(jsonVoteLast.state.phase).toBe('reveal');
    expect(jsonVoteLast.state.reveal.eliminatedPlayerId).toBe(p3Id);

    // Play Again
    const resAgain = await againPost(createRequest(`/api/room/${code}/again`, 'POST', token1, {}), { params: { code } });
    const jsonAgain = await expectStatus(resAgain, 200);
    expect(jsonAgain.state.phase).toBe('lobby');

    // Leave
    const resLeave = await leavePost(createRequest(`/api/room/${code}/leave`, 'POST', token2, {}), { params: { code } });
    expect(resLeave.status).toBe(204);
  });

  it('2. Multi-client Join Version Bump Test: Player A polls version 1, Player B joins, Player A poll returns 200 OK with 2 players', async () => {
    const tokenA = 'token-client-a';
    const tokenB = 'token-client-b';

    // Player A creates party
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', tokenA, { name: 'PlayerA' }));
    const jsonCreate = await expectStatus(resCreate, 201);
    const code = jsonCreate.code;

    // Player A initial state poll (no since parameter -> version 1)
    const reqPoll1 = createRequest(`/api/room/${code}/state`, 'GET', tokenA);
    const resPoll1 = await stateGet(reqPoll1, { params: { code } });
    const jsonPoll1 = await expectStatus(resPoll1, 200);
    const version1 = jsonPoll1.state.version;
    expect(jsonPoll1.state.players).toHaveLength(1);

    // Player A long-polls with ?since=version1 -> returns 204 No Content
    const reqPoll24 = createRequest(`/api/room/${code}/state?since=${version1}`, 'GET', tokenA);
    const resPoll24 = await stateGet(reqPoll24, { params: { code } });
    expect(resPoll24.status).toBe(204);

    // Player B joins the party
    const reqJoinB = createRequest(`/api/room/${code}/join`, 'POST', tokenB, { name: 'PlayerB' });
    const resJoinB = await joinRoomPost(reqJoinB, { params: { code } });
    await expectStatus(resJoinB, 200);

    // Player A long-polls again with ?since=version1 -> MUST return 200 OK with 2 players!
    const reqPollUpdated = createRequest(`/api/room/${code}/state?since=${version1}`, 'GET', tokenA);
    const resPollUpdated = await stateGet(reqPollUpdated, { params: { code } });
    const jsonPollUpdated = await expectStatus(resPollUpdated, 200);
    expect(jsonPollUpdated.state.players).toHaveLength(2);
    expect(jsonPollUpdated.state.version).toBeGreaterThan(version1);
  });

  it('3. Assert ROOM_NOT_FOUND (404)', async () => {
    const req = createRequest('/api/room/NOPE5/join', 'POST', 'token-dummy', { name: 'Player' });
    const res = await joinRoomPost(req, { params: { code: 'NOPE5' } });
    const json = await expectStatus(res, 404);
    expect(json.error).toBe('ROOM_NOT_FOUND');
  });

  it('4. Assert NOT_ENOUGH_PLAYERS (409)', async () => {
    const token = 'token-leader';
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token, { name: 'Leader' }));
    const jsonCreate = await expectStatus(resCreate, 201);
    const code = jsonCreate.code;

    // Try starting with only 1 player
    const resStart = await startPost(createRequest(`/api/room/${code}/start`, 'POST', token, {}), { params: { code } });
    const jsonStart = await expectStatus(resStart, 409);
    expect(jsonStart.error).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('5. Assert NOT_LEADER (403)', async () => {
    const token1 = 'token-leader';
    const token2 = 'token-joiner';
    const resCreate = await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'Leader' }));
    const { code } = await expectStatus(resCreate, 201);
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'Player2' }), { params: { code } });

    // Non-leader starts
    const resStart = await startPost(createRequest(`/api/room/${code}/start`, 'POST', token2, {}), { params: { code } });
    const json = await expectStatus(resStart, 403);
    expect(json.error).toBe('NOT_LEADER');
  });

  it('6. Assert SELF_VOTE (400)', async () => {
    const token1 = 'token-leader';
    const token2 = 'token-p2';
    const token3 = 'token-p3';

    const { code, playerId: p1Id } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } });
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    // Advance to voting phase by completing 2 rounds of messages
    for (let r = 1; r <= 2; r++) {
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: r, body: 'h1' }), { params: { code } });
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: r, body: 'h2' }), { params: { code } });
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: r, body: 'h3' }), { params: { code } });
    }

    // P1 votes for P1 -> SELF_VOTE (400)
    const resVote = await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p1Id }), { params: { code } });
    const json = await expectStatus(resVote, 400);
    expect(json.error).toBe('SELF_VOTE');
  });

  it('7. Assert ALREADY_SUBMITTED (409)', async () => {
    const token1 = 'token-p1';
    const token2 = 'token-p2';
    const token3 = 'token-p3';

    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } });
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 1, body: 'Hint 1' }), { params: { code } });

    // P1 submits second message in round 1 -> ALREADY_SUBMITTED (409)
    const resSub2 = await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 1, body: 'Hint 1 duplicate' }), { params: { code } });
    const json = await expectStatus(resSub2, 409);
    expect(json.error).toBe('ALREADY_SUBMITTED');
  });

  it('8. Assert ALREADY_VOTED (409)', async () => {
    const token1 = 'token-p1';
    const token2 = 'token-p2';
    const token3 = 'token-p3';

    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);
    const { playerId: p2Id } = await expectStatus(await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } }), 200);
    const { playerId: p3Id } = await expectStatus(await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } }), 200);
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    for (let r = 1; r <= 2; r++) {
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token1, { round: r, body: 'h1' }), { params: { code } });
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token2, { round: r, body: 'h2' }), { params: { code } });
      await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token3, { round: r, body: 'h3' }), { params: { code } });
    }

    // P1 votes for P2
    await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p2Id }), { params: { code } });

    // P1 votes again -> ALREADY_VOTED (409)
    const resVote2 = await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p3Id }), { params: { code } });
    const json = await expectStatus(resVote2, 409);
    expect(json.error).toBe('ALREADY_VOTED');
  });

  it('9. Assert WRONG_PHASE (409)', async () => {
    const token1 = 'token-p1';
    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);

    // Try voting in lobby phase -> WRONG_PHASE (409)
    const resVote = await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: '00000000-0000-0000-0000-000000000000' }), { params: { code } });
    const json = await expectStatus(resVote, 409);
    expect(json.error).toBe('WRONG_PHASE');
  });

  it('10. Assert NOT_A_PLAYER (403)', async () => {
    const token1 = 'token-p1';
    const tokenUnregistered = 'token-stranger';
    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);

    // Unregistered token polls state
    const res = await stateGet(createRequest(`/api/room/${code}/state`, 'GET', tokenUnregistered), { params: { code } });
    const json = await expectStatus(res, 403);
    expect(json.error).toBe('NOT_A_PLAYER');
  });

  it('11. Assert SPECTATOR_FORBIDDEN (403)', async () => {
    const token1 = 'token-p1';
    const token2 = 'token-p2';
    const token3 = 'token-p3';
    const tokenSpec = 'token-spectator';

    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token1, { name: 'P1' })), 201);
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'P2' }), { params: { code } });
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'P3' }), { params: { code } });
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token1, {}), { params: { code } });

    // Join mid-game as spectator
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', tokenSpec, { name: 'Spectator' }), { params: { code } });

    // Spectator attempts hint submission -> SPECTATOR_FORBIDDEN (403)
    const resMsg = await messagePost(createRequest(`/api/room/${code}/message`, 'POST', tokenSpec, { round: 1, body: 'Sneaky hint' }), { params: { code } });
    const json = await expectStatus(resMsg, 403);
    expect(json.error).toBe('SPECTATOR_FORBIDDEN');
  });

  it('12. Assert BAD_REQUEST (400) on invalid payload sizes and empty trim', async () => {
    const token = 'token-p1';

    // 1. Name too long (>16 chars)
    const resLongName = await createRoomPost(createRequest('/api/room', 'POST', token, { name: 'SuperExtraLongNameExceeding16' }));
    const json1 = await expectStatus(resLongName, 400);
    expect(json1.error).toBe('BAD_REQUEST');

    // Create room for message testing
    const { code } = await expectStatus(await createRoomPost(createRequest('/api/room', 'POST', token, { name: 'P1' })), 201);
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', 'token-p2', { name: 'P2' }), { params: { code } });
    await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', 'token-p3', { name: 'P3' }), { params: { code } });
    await startPost(createRequest(`/api/room/${code}/start`, 'POST', token, {}), { params: { code } });

    // 2. Message empty after trim
    const resEmptyMsg = await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token, { round: 1, body: '   ' }), { params: { code } });
    const json2 = await expectStatus(resEmptyMsg, 400);
    expect(json2.error).toBe('BAD_REQUEST');

    // 3. Message too long (>140 chars)
    const longBody = 'A'.repeat(141);
    const resLongMsg = await messagePost(createRequest(`/api/room/${code}/message`, 'POST', token, { round: 1, body: longBody }), { params: { code } });
    const json3 = await expectStatus(resLongMsg, 400);
    expect(json3.error).toBe('BAD_REQUEST');
  });
});
