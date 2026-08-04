import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { SupabaseStore } from '@/lib/store/supabase';
import { isSnapshotUnchanged } from '@/lib/store/compare';
import { playAgain } from '@/lib/engine';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '@/lib/types';

describe('Store Interface Parity & Mutation Tests', () => {
  it('MemoryStore and SupabaseStore should expose identical method signatures', () => {
    const memory = MemoryStore.getInstance();
    const supabase = new SupabaseStore();

    const requiredMethods = [
      'createRoom',
      'joinRoom',
      'getRoomByCode',
      'getRoomVersionAndPlayer',
      'mutateRoom',
      'updatePlayerLastSeen',
    ];

    for (const method of requiredMethods) {
      expect(typeof (memory as any)[method]).toBe('function');
      expect(typeof (supabase as any)[method]).toBe('function');
    }
  });

  it('isSnapshotUnchanged helper accurately detects changed vs unchanged snapshots', () => {
    const room: DbRoom = {
      id: 'r1',
      code: 'TEST1',
      phase: 'lobby',
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
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    const players: DbPlayer[] = [
      {
        id: 'p1',
        room_id: 'r1',
        token_hash: 'th1',
        name: 'Leader',
        is_leader: true,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      },
    ];

    const snapshot = { room, players, messages: [], votes: [] };

    // Exact identical snapshot -> true
    expect(isSnapshotUnchanged(snapshot, room, players, [], [])).toBe(true);

    // Modified player score -> false
    const modifiedPlayers = [{ ...players[0], score: 10 }];
    expect(isSnapshotUnchanged(snapshot, room, modifiedPlayers, [], [])).toBe(false);

    // Modified phase -> false
    const modifiedRoom = { ...room, phase: 'round' as const };
    expect(isSnapshotUnchanged(snapshot, modifiedRoom, players, [], [])).toBe(false);
  });

  it('MemoryStore handles no-op mutate, version bump, and stale message/vote deletions', async () => {
    const store = MemoryStore.getInstance();
    store.reset();

    // 1. Create Room & Join
    const { room } = await store.createRoom('PARITY', 'th-leader', 'Leader');
    await store.joinRoom('PARITY', 'th-p2', 'Player 2');
    await store.joinRoom('PARITY', 'th-p3', 'Player 3');

    const snapInitial = await store.getRoomByCode('PARITY');
    const version0 = snapInitial!.room.version;

    // 2. Add message & vote via mutateRoom
    await store.mutateRoom('PARITY', 'th-leader', (snap) => {
      const msg: DbMessage = {
        id: 'm1',
        room_id: snap.room.id,
        match_number: snap.room.match_number,
        round_number: 1,
        player_id: snap.players[0].id,
        body: 'Hint 1',
        created_at: new Date().toISOString(),
      };
      const vote: DbVote = {
        id: 'v1',
        room_id: snap.room.id,
        match_number: snap.room.match_number,
        voter_id: snap.players[0].id,
        target_id: snap.players[1].id,
        created_at: new Date().toISOString(),
      };
      return {
        room: { ...snap.room, phase: 'reveal', version: snap.room.version + 1 },
        players: snap.players,
        messages: [msg],
        votes: [vote],
      };
    });

    const snapWithData = await store.getRoomByCode('PARITY');
    expect(snapWithData?.messages.length).toBe(1);
    expect(snapWithData?.votes.length).toBe(1);
    const version1 = snapWithData!.room.version;
    expect(version1).toBeGreaterThan(version0);

    // 3. Perform No-Op mutateRoom
    const { snapshot: snapNoOp } = await store.mutateRoom('PARITY', 'th-leader', (snap) => ({
      room: snap.room,
      players: snap.players,
      messages: snap.messages,
      votes: snap.votes,
    }));
    expect(snapNoOp.room.version).toBe(version1); // Version unchanged!

    // 4. Play Again (resets messages and votes to [])
    await store.mutateRoom('PARITY', 'th-leader', (snap) =>
      playAgain(snap.room, snap.players)
    );

    const snapReset = await store.getRoomByCode('PARITY');
    expect(snapReset?.room.phase).toBe('lobby');
    expect(snapReset?.messages.length).toBe(0); // Stale messages deleted!
    expect(snapReset?.votes.length).toBe(0); // Stale votes deleted!
  });
});
