import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { submitMessage } from '@/lib/engine';
import { CARD_PAIRS } from '@/lib/cards';

describe('Optimistic Locking Concurrency', () => {
  it('should handle simultaneous mutations with retries and persist both messages', async () => {
    const store = MemoryStore.getInstance();
    store.reset();

    const { room, player: leader } = await store.createRoom('K7QMR', 'hash-1', 'Leader');
    const { player: p2 } = await store.joinRoom('K7QMR', 'hash-2', 'Player 2');
    const { player: p3 } = await store.joinRoom('K7QMR', 'hash-3', 'Player 3');

    // Start match
    await store.mutateRoom('K7QMR', 'hash-1', (snap) => {
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

  it('should persist mutation and bump version when a player score changes with array length unchanged', async () => {
    const store = MemoryStore.getInstance();
    store.reset();

    const { room } = await store.createRoom('SCORE1', 'hash-1', 'Leader');
    await store.joinRoom('SCORE1', 'hash-2', 'Player 2');

    const snap1 = await store.getRoomByCode('SCORE1');
    const versionBefore = snap1!.room.version;

    // Mutate only player 1 score
    const { snapshot: snap2 } = await store.mutateRoom('SCORE1', 'hash-1', (snap) => {
      const nextPlayers = snap.players.map((p) =>
        p.token_hash === 'hash-1' ? { ...p, score: p.score + 1 } : p
      );
      return {
        room: snap.room,
        players: nextPlayers,
        messages: snap.messages,
        votes: snap.votes,
      };
    });

    expect(snap2.room.version).toBe(versionBefore + 1);
    const p1 = snap2.players.find((p) => p.token_hash === 'hash-1');
    expect(p1?.score).toBe(1);
  });

  it('should skip store write and NOT bump version for a genuinely identical snapshot (no-op)', async () => {
    const store = MemoryStore.getInstance();
    store.reset();

    await store.createRoom('NOOP1', 'hash-1', 'Leader');
    const snap1 = await store.getRoomByCode('NOOP1');
    const versionBefore = snap1!.room.version;

    // Execute no-op mutation (returns exact input snapshot)
    const { snapshot: snap2 } = await store.mutateRoom('NOOP1', 'hash-1', (snap) => ({
      room: snap.room,
      players: snap.players,
      messages: snap.messages,
      votes: snap.votes,
    }));

    expect(snap2.room.version).toBe(versionBefore); // Version NOT bumped!
  });
});
