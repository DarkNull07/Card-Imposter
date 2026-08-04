import { describe, expect, it } from 'vitest';
import { CARD_PAIRS } from '@/lib/cards';
import { startMatch } from '@/lib/engine';
import { DbPlayer, DbRoom } from '@/lib/types';

describe('Card Pool & Pair Selection Engine Tests', () => {
  it('1. The pool contains at least 60 pairs', () => {
    expect(CARD_PAIRS.length).toBeGreaterThanOrEqual(60);
  });

  it('2. Every pair has exactly two distinct non-empty strings', () => {
    for (const pair of CARD_PAIRS) {
      expect(pair).toHaveLength(2);
      expect(typeof pair[0]).toBe('string');
      expect(typeof pair[1]).toBe('string');
      expect(pair[0].trim().length).toBeGreaterThan(0);
      expect(pair[1].trim().length).toBeGreaterThan(0);
      expect(pair[0]).not.toBe(pair[1]);
    }
  });

  it('3. No duplicate pairs exist, in either order', () => {
    const seen = new Set<string>();
    for (const [cardA, cardB] of CARD_PAIRS) {
      const key1 = `${cardA.toLowerCase()}::${cardB.toLowerCase()}`;
      const key2 = `${cardB.toLowerCase()}::${cardA.toLowerCase()}`;
      expect(seen.has(key1)).toBe(false);
      expect(seen.has(key2)).toBe(false);
      seen.add(key1);
    }
  });

  it('4. Over 200 simulated selections for the same room, the same pair index is never selected twice consecutively', () => {
    let mockRoom: DbRoom = {
      id: 'r1',
      code: 'TEST60',
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

    const mockPlayers: DbPlayer[] = [
      { id: 'p1', room_id: 'r1', token_hash: 'th1', name: 'Leader', is_leader: true, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
      { id: 'p2', room_id: 'r1', token_hash: 'th2', name: 'P2', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
      { id: 'p3', room_id: 'r1', token_hash: 'th3', name: 'P3', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
    ];

    let lastIndex: number | null = null;

    for (let i = 0; i < 200; i++) {
      const result = startMatch(mockRoom, mockPlayers);
      expect(result.room.last_pair_index).not.toBeNull();
      expect(result.room.last_pair_index).not.toBe(lastIndex);
      lastIndex = result.room.last_pair_index;

      // Transition back to lobby for next simulated match
      mockRoom = {
        ...result.room,
        phase: 'lobby',
      };
    }
  });

  it('5. Over 200 simulated selections, both orientations of a pair occur (imposter is not always given the same side)', () => {
    const mockRoom: DbRoom = {
      id: 'r1',
      code: 'TEST60',
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

    const mockPlayers: DbPlayer[] = [
      { id: 'p1', room_id: 'r1', token_hash: 'th1', name: 'Leader', is_leader: true, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
      { id: 'p2', room_id: 'r1', token_hash: 'th2', name: 'P2', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
      { id: 'p3', room_id: 'r1', token_hash: 'th3', name: 'P3', is_leader: false, is_spectator: false, is_eliminated: false, score: 0, joined_at: '', last_seen_at: '' },
    ];

    let imposterGotFirstInPairCount = 0;
    let imposterGotSecondInPairCount = 0;

    for (let i = 0; i < 200; i++) {
      const result = startMatch(mockRoom, mockPlayers);
      const pairIndex = result.room.last_pair_index!;
      const pair = CARD_PAIRS[pairIndex];

      if (result.room.imposter_card === pair[0]) {
        imposterGotFirstInPairCount++;
      } else {
        imposterGotSecondInPairCount++;
      }
    }

    expect(imposterGotFirstInPairCount).toBeGreaterThan(0);
    expect(imposterGotSecondInPairCount).toBeGreaterThan(0);
  });
});
