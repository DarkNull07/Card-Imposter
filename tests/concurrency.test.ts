import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../lib/store/memory';
import { submitMessage } from '../lib/engine';

describe('Optimistic Locking Concurrency', () => {
  it('should handle simultaneous mutations with retries and persist both messages', async () => {
    const store = MemoryStore.getInstance();
    store.reset();

    const { room, player: leader } = await store.createRoom('K7QMR', 'hash-1', 'Leader');
    const { player: p2 } = await store.joinRoom('K7QMR', 'hash-2', 'Player 2');
    const { player: p3 } = await store.joinRoom('K7QMR', 'hash-3', 'Player 3');

    // Start match
    await store.mutateRoom('K7QMR', 'hash-1', (snap) => {
      const { CARD_PAIRS } = require('../lib/cards');
      return {
        room: {
          ...snap.room,
          phase: 'round',
          round_number: 1,
          match_number: 1,
          crew_card: 'Knight',
          imposter_card: 'Mini P.E.K.K.A',
          imposter_player_id: p3.id,
          version: snap.room.version + 1,
        },
        players: snap.players,
        messages: snap.messages,
        votes: snap.votes,
      };
    });

    // Simulate 2 simultaneous message submissions from leader and p2
    const task1 = store.mutateRoom('K7QMR', 'hash-1', (snap, player) =>
      submitMessage(snap.room, snap.players, snap.messages, snap.votes, player!.id, 1, 'Hint from leader')
    );

    const task2 = store.mutateRoom('K7QMR', 'hash-2', (snap, player) =>
      submitMessage(snap.room, snap.players, snap.messages, snap.votes, player!.id, 1, 'Hint from P2')
    );

    const [res1, res2] = await Promise.all([task1, task2]);

    expect(res1).toBeTruthy();
    expect(res2).toBeTruthy();

    const finalSnapshot = await store.getRoomByCode('K7QMR');
    expect(finalSnapshot?.messages.length).toBe(2);
    expect(finalSnapshot?.messages.some((m) => m.body === 'Hint from leader')).toBe(true);
    expect(finalSnapshot?.messages.some((m) => m.body === 'Hint from P2')).toBe(true);
  });
});
