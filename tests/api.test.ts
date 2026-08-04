import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../lib/store/memory';
import { POST as createRoomPost } from '../app/api/room/route';
import { POST as joinRoomPost } from '../app/api/room/[code]/join/route';
import { GET as stateGet } from '../app/api/room/[code]/state/route';
import { POST as startPost } from '../app/api/room/[code]/start/route';
import { POST as messagePost } from '../app/api/room/[code]/message/route';
import { POST as votePost } from '../app/api/room/[code]/vote/route';
import { POST as againPost } from '../app/api/room/[code]/again/route';
import { POST as endPost } from '../app/api/room/[code]/end/route';
import { POST as leavePost } from '../app/api/room/[code]/leave/route';
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

describe('API Route Handlers - Integration Tests', () => {
  beforeEach(() => {
    MemoryStore.getInstance().reset();
  });

  it('should create room, join players, start match, submit messages, vote, and reveal winner', async () => {
    const token1 = 'token-leader-1111';
    const token2 = 'token-player-2222';
    const token3 = 'token-player-3333';

    // 1. Create Room
    const reqCreate = createRequest('/api/room', 'POST', token1, { name: 'LeaderBob' });
    const resCreate = await createRoomPost(reqCreate);
    expect(resCreate.status).toBe(201);
    const jsonCreate = await resCreate.json();
    const code = jsonCreate.code;
    expect(code).toHaveLength(5);

    // 2. Join Player 2 & 3
    const reqJoin2 = createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'PlayerTwo' });
    const resJoin2 = await joinRoomPost(reqJoin2, { params: { code } });
    expect(resJoin2.status).toBe(200);

    const reqJoin3 = createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'PlayerThree' });
    const resJoin3 = await joinRoomPost(reqJoin3, { params: { code } });
    expect(resJoin3.status).toBe(200);

    // 3. Poll state
    const reqPoll = createRequest(`/api/room/${code}/state`, 'GET', token1);
    const resPoll = await stateGet(reqPoll, { params: { code } });
    expect(resPoll.status).toBe(200);
    const jsonPoll = await resPoll.json();
    expect(jsonPoll.state.players).toHaveLength(3);

    // 4. Start Game
    const reqStart = createRequest(`/api/room/${code}/start`, 'POST', token1, {});
    const resStart = await startPost(reqStart, { params: { code } });
    expect(resStart.status).toBe(200);
    const jsonStart = await resStart.json();
    expect(jsonStart.state.phase).toBe('round');
    expect(jsonStart.state.roundNumber).toBe(1);

    // 5. Non-leader start attempt fails with NOT_LEADER
    const reqStartBad = createRequest(`/api/room/${code}/start`, 'POST', token2, {});
    const resStartBad = await startPost(reqStartBad, { params: { code } });
    expect(resStartBad.status).toBe(403);

    // 6. Submit messages for Round 1
    const reqMsg1 = createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 1, body: 'Hint 1' });
    await messagePost(reqMsg1, { params: { code } });

    const reqMsg2 = createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 1, body: 'Hint 2' });
    await messagePost(reqMsg2, { params: { code } });

    const reqMsg3 = createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 1, body: 'Hint 3' });
    const resMsg3 = await messagePost(reqMsg3, { params: { code } });
    const jsonMsg3 = await resMsg3.json();
    expect(jsonMsg3.state.roundNumber).toBe(2); // Advanced to round 2!

    // 7. Submit messages for Round 2
    const reqMsg1_r2 = createRequest(`/api/room/${code}/message`, 'POST', token1, { round: 2, body: 'R2 Hint 1' });
    await messagePost(reqMsg1_r2, { params: { code } });

    const reqMsg2_r2 = createRequest(`/api/room/${code}/message`, 'POST', token2, { round: 2, body: 'R2 Hint 2' });
    await messagePost(reqMsg2_r2, { params: { code } });

    const reqMsg3_r2 = createRequest(`/api/room/${code}/message`, 'POST', token3, { round: 2, body: 'R2 Hint 3' });
    const resMsg3_r2 = await messagePost(reqMsg3_r2, { params: { code } });
    const jsonMsg3_r2 = await resMsg3_r2.json();
    expect(jsonMsg3_r2.state.phase).toBe('voting'); // Advanced to voting!

    // 8. Self vote fails with SELF_VOTE (400)
    const reqVoteSelf = createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: jsonCreate.playerId });
    const resVoteSelf = await votePost(reqVoteSelf, { params: { code } });
    expect(resVoteSelf.status).toBe(400);

    // 9. Cast votes
    const p2Id = (await (await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token2, { name: 'PlayerTwo' }), { params: { code } })).json()).playerId;
    const p3Id = (await (await joinRoomPost(createRequest(`/api/room/${code}/join`, 'POST', token3, { name: 'PlayerThree' }), { params: { code } })).json()).playerId;

    await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token1, { targetPlayerId: p3Id }), { params: { code } });
    await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token2, { targetPlayerId: p3Id }), { params: { code } });
    const resVoteLast = await votePost(createRequest(`/api/room/${code}/vote`, 'POST', token3, { targetPlayerId: p2Id }), { params: { code } });

    const jsonVoteLast = await resVoteLast.json();
    expect(jsonVoteLast.state.phase).toBe('reveal');
    expect(jsonVoteLast.state.reveal.eliminatedPlayerId).toBe(p3Id);

    // 10. Play Again resets to lobby
    const resAgain = await againPost(createRequest(`/api/room/${code}/again`, 'POST', token1, {}), { params: { code } });
    expect(resAgain.status).toBe(200);
    const jsonAgain = await resAgain.json();
    expect(jsonAgain.state.phase).toBe('lobby');

    // 11. Leave room
    const resLeave = await leavePost(createRequest(`/api/room/${code}/leave`, 'POST', token2, {}), { params: { code } });
    expect(resLeave.status).toBe(204);
  });
});
