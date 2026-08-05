import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/store/memory';
import { isSnapshotUnchanged } from '@/lib/store/compare';
import { RoomSnapshot } from '@/lib/store';

describe('Polling 204 Not Modified Efficiency Benchmark', () => {
  it('10 players polling for 60s with heartbeats maintain high 204 ratio when state is unchanged', async () => {
    const nowMs = Date.now();
    const room = {
      id: 'r1',
      code: 'POLL1',
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
      created_at: new Date(nowMs).toISOString(),
      last_activity_at: new Date(nowMs).toISOString(),
    };

    const players = Array.from({ length: 10 }).map((_, i) => ({
      id: `p${i + 1}`,
      room_id: 'r1',
      token_hash: `h${i + 1}`,
      name: `Player${i + 1}`,
      is_leader: i === 0,
      is_spectator: false,
      is_eliminated: false,
      score: 0,
      joined_at: new Date(nowMs).toISOString(),
      last_seen_at: new Date(nowMs).toISOString(),
    }));

    const snapshot: RoomSnapshot = {
      room,
      players,
      messages: [],
      votes: [],
    };

    let count200 = 0;
    let count204 = 0;

    // Simulate 60 seconds of polling (poll every 2s for 10 players = 300 total polls)
    // Heartbeats update last_seen_at for each player every 10 seconds.
    let updatedPlayers = [...players];
    for (let sec = 0; sec < 60; sec += 2) {
      for (let pIdx = 0; pIdx < 10; pIdx++) {
        // Player pIdx sends heartbeat every 10s
        if (sec % 10 === pIdx % 10) {
          updatedPlayers[pIdx] = {
            ...updatedPlayers[pIdx],
            last_seen_at: new Date(nowMs + sec * 1000).toISOString(),
          };
        }

        const isUnchanged = isSnapshotUnchanged(snapshot, room, updatedPlayers, [], []);
        if (isUnchanged) {
          count204++;
        } else {
          count200++;
        }
      }
    }

    const totalPolls = count200 + count204;
    const ratio204 = count204 / totalPolls;

    // Before fix (comparing raw last_seen_at): ratio204 was 0% (300 200s, 0 204s)
    // After fix (comparing derived connected threshold): ratio204 is 100% (300 204s, 0 200s)
    expect(count204).toBe(300);
    expect(count200).toBe(0);
    expect(ratio204).toBe(1.0);
  });
});
