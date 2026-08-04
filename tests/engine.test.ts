import { describe, expect, it } from 'vitest';
import {
  advanceIfExpired,
  playAgain,
  removePlayer,
  resolveVoting,
  startMatch,
  submitMessage,
} from '@/lib/engine';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '@/lib/types';

function createMockRoom(overrides?: Partial<DbRoom>): DbRoom {
  return {
    id: 'room-1',
    code: 'K7QMR',
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
    version: 0,
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPlayers(count: number): DbPlayer[] {
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    room_id: 'room-1',
    token_hash: `hash-${i + 1}`,
    name: `Player ${i + 1}`,
    is_leader: i === 0,
    is_spectator: false,
    is_eliminated: false,
    score: 0,
    joined_at: new Date(Date.now() + i * 1000).toISOString(),
    last_seen_at: now,
  }));
}

describe('Game Engine - Pure Functions', () => {
  it('should start match with 3 players and pick exactly 1 imposter with different cards', () => {
    const room = createMockRoom();
    const players = createMockPlayers(3);

    const result = startMatch(room, players);

    expect(result.room.phase).toBe('round');
    expect(result.room.round_number).toBe(1);
    expect(result.room.match_number).toBe(1);
    expect(result.room.crew_card).toBeTruthy();
    expect(result.room.imposter_card).toBeTruthy();
    expect(result.room.crew_card).not.toBe(result.room.imposter_card);
    expect(result.room.imposter_player_id).toBeTruthy();
    expect(players.some((p) => p.id === result.room.imposter_player_id)).toBe(true);
  });

  it('should start match with 12 players and assign exactly 1 imposter', () => {
    const room = createMockRoom();
    const players = createMockPlayers(12);

    const result = startMatch(room, players);

    expect(result.room.phase).toBe('round');
    expect(players.some((p) => p.id === result.room.imposter_player_id)).toBe(true);
  });

  it('should enforce one hint message per player per round and advance round when all submit', () => {
    const room = createMockRoom();
    const players = createMockPlayers(3);

    const started = startMatch(room, players);
    let currentRoom = started.room;
    let messages: DbMessage[] = [];
    let votes: DbVote[] = [];

    // Player 1 submits
    let sub = submitMessage(currentRoom, players, messages, votes, 'player-1', 1, 'Fast melee fighter');
    messages = sub.messages;
    currentRoom = sub.room;
    expect(currentRoom.round_number).toBe(1);

    // Player 1 double submission fails
    expect(() => submitMessage(currentRoom, players, messages, votes, 'player-1', 1, 'Second hint')).toThrow(
      'ALREADY_SUBMITTED'
    );

    // Player 2 submits
    sub = submitMessage(currentRoom, players, messages, votes, 'player-2', 1, 'Swordsman');
    messages = sub.messages;
    currentRoom = sub.room;
    expect(currentRoom.round_number).toBe(1);

    // Player 3 submits -> advances to Round 2!
    sub = submitMessage(currentRoom, players, messages, votes, 'player-3', 1, 'Armor wearing');
    messages = sub.messages;
    currentRoom = sub.room;
    expect(currentRoom.round_number).toBe(2);
    expect(currentRoom.phase).toBe('round');
  });

  it('should auto-submit (no message) on timer expiry during round', () => {
    const room = createMockRoom({
      phase: 'round',
      round_number: 1,
      match_number: 1,
      phase_ends_at: new Date(Date.now() - 1000).toISOString(),
    });
    const players = createMockPlayers(3);
    const messages: DbMessage[] = [];
    const votes: DbVote[] = [];

    const expired = advanceIfExpired(room, players, messages, votes, new Date());

    expect(expired.messages.length).toBe(3);
    expect(expired.messages.every((m) => m.body === '(no message)')).toBe(true);
    expect(expired.room.round_number).toBe(2);
  });

  // --- SPECIFIC TIE & VOTE RESOLUTION CASES ---

  it('(a) 4 players, 2-2 vote split -> eliminated_player_id is null, outcome is imposter, imposter gets +3', () => {
    const room = createMockRoom({
      phase: 'voting',
      match_number: 1,
      imposter_player_id: 'player-4',
      crew_card: 'Knight',
      imposter_card: 'Mini P.E.K.K.A',
    });
    const players = createMockPlayers(4);
    // Player 1 & 2 vote for Player 3; Player 3 & 4 vote for Player 1 (2-2 split)
    const votes: DbVote[] = [
      { id: 'v1', room_id: 'room-1', match_number: 1, voter_id: 'player-1', target_id: 'player-3', created_at: '' },
      { id: 'v2', room_id: 'room-1', match_number: 1, voter_id: 'player-2', target_id: 'player-3', created_at: '' },
      { id: 'v3', room_id: 'room-1', match_number: 1, voter_id: 'player-3', target_id: 'player-1', created_at: '' },
      { id: 'v4', room_id: 'room-1', match_number: 1, voter_id: 'player-4', target_id: 'player-1', created_at: '' },
    ];

    const result = resolveVoting(room, players, votes);

    expect(result.room.phase).toBe('reveal');
    expect(result.room.eliminated_player_id).toBeNull(); // Tied vote -> nobody eliminated
    expect(result.room.outcome).toBe('imposter');

    // Imposter (player-4) gets +3 points; crewmates get 0
    expect(result.players.find((p) => p.id === 'player-4')?.score).toBe(3);
    expect(result.players.find((p) => p.id === 'player-1')?.score).toBe(0);
    expect(result.players.find((p) => p.id === 'player-2')?.score).toBe(0);
    expect(result.players.find((p) => p.id === 'player-3')?.score).toBe(0);
  });

  it('(b) 4 players, 2-1-1 vote split -> 2-vote player is eliminated, outcome correct', () => {
    const room = createMockRoom({
      phase: 'voting',
      match_number: 1,
      imposter_player_id: 'player-2',
      crew_card: 'Knight',
      imposter_card: 'Mini P.E.K.K.A',
    });
    const players = createMockPlayers(4);
    // Player 1 & 3 vote for Player 2 (2 votes); Player 2 votes for 1 (1 vote); Player 4 votes for 3 (1 vote)
    const votes: DbVote[] = [
      { id: 'v1', room_id: 'room-1', match_number: 1, voter_id: 'player-1', target_id: 'player-2', created_at: '' },
      { id: 'v2', room_id: 'room-1', match_number: 1, voter_id: 'player-2', target_id: 'player-1', created_at: '' },
      { id: 'v3', room_id: 'room-1', match_number: 1, voter_id: 'player-3', target_id: 'player-2', created_at: '' },
      { id: 'v4', room_id: 'room-1', match_number: 1, voter_id: 'player-4', target_id: 'player-3', created_at: '' },
    ];

    const result = resolveVoting(room, players, votes);

    expect(result.room.phase).toBe('reveal');
    expect(result.room.eliminated_player_id).toBe('player-2'); // Player 2 had 2 votes -> eliminated!
    expect(result.room.outcome).toBe('crew'); // Imposter was player-2 -> crew win!

    expect(result.players.find((p) => p.id === 'player-1')?.score).toBe(1);
    expect(result.players.find((p) => p.id === 'player-3')?.score).toBe(1);
    expect(result.players.find((p) => p.id === 'player-4')?.score).toBe(1);
    expect(result.players.find((p) => p.id === 'player-2')?.score).toBe(0);
  });

  it('(c) All players abstain via timer expiry -> nobody eliminated, imposter wins', () => {
    const room = createMockRoom({
      phase: 'voting',
      match_number: 1,
      imposter_player_id: 'player-3',
      crew_card: 'Knight',
      imposter_card: 'Mini P.E.K.K.A',
    });
    const players = createMockPlayers(3);
    // All 3 players abstain (target_id = null)
    const votes: DbVote[] = [
      { id: 'v1', room_id: 'room-1', match_number: 1, voter_id: 'player-1', target_id: null, created_at: '' },
      { id: 'v2', room_id: 'room-1', match_number: 1, voter_id: 'player-2', target_id: null, created_at: '' },
      { id: 'v3', room_id: 'room-1', match_number: 1, voter_id: 'player-3', target_id: null, created_at: '' },
    ];

    const result = resolveVoting(room, players, votes);

    expect(result.room.phase).toBe('reveal');
    expect(result.room.eliminated_player_id).toBeNull(); // Nobody eliminated
    expect(result.room.outcome).toBe('imposter');
    expect(result.players.find((p) => p.id === 'player-3')?.score).toBe(3);
  });

  it('(d) 3 players, 2-1 split where imposter gets 2 votes -> imposter eliminated, outcome is crew, crewmates +1', () => {
    const room = createMockRoom({
      phase: 'voting',
      match_number: 1,
      imposter_player_id: 'player-3',
      crew_card: 'Knight',
      imposter_card: 'Mini P.E.K.K.A',
    });
    const players = createMockPlayers(3);
    // Player 1 & 2 vote for Player 3 (imposter); Player 3 votes for Player 1
    const votes: DbVote[] = [
      { id: 'v1', room_id: 'room-1', match_number: 1, voter_id: 'player-1', target_id: 'player-3', created_at: '' },
      { id: 'v2', room_id: 'room-1', match_number: 1, voter_id: 'player-2', target_id: 'player-3', created_at: '' },
      { id: 'v3', room_id: 'room-1', match_number: 1, voter_id: 'player-3', target_id: 'player-1', created_at: '' },
    ];

    const result = resolveVoting(room, players, votes);

    expect(result.room.phase).toBe('reveal');
    expect(result.room.eliminated_player_id).toBe('player-3');
    expect(result.room.outcome).toBe('crew');

    expect(result.players.find((p) => p.id === 'player-1')?.score).toBe(1);
    expect(result.players.find((p) => p.id === 'player-2')?.score).toBe(1);
    expect(result.players.find((p) => p.id === 'player-3')?.score).toBe(0);
  });

  it('should transfer leadership to earliest joined connected player when leader leaves', () => {
    const room = createMockRoom();
    const players = createMockPlayers(3); // player-1 is leader

    const result = removePlayer(room, players, [], [], 'player-1');

    expect(result.players.length).toBe(2);
    expect(result.players.some((p) => p.id === 'player-1')).toBe(false);
    expect(result.players.find((p) => p.id === 'player-2')?.is_leader).toBe(true);
  });

  it('should promote spectators to normal players on playAgain', () => {
    const room = createMockRoom({ phase: 'reveal' });
    const players = createMockPlayers(3);
    players[2].is_spectator = true;

    const result = playAgain(room, players);

    expect(result.room.phase).toBe('lobby');
    expect(result.players.every((p) => !p.is_spectator)).toBe(true);
  });

  it('should immediately advance phase if departure leaves remaining players with all submissions complete', () => {
    const room = createMockRoom({ phase: 'round', round_number: 1, match_number: 1 });
    const players = createMockPlayers(3);
    const messages: DbMessage[] = [
      { id: 'm1', room_id: 'room-1', match_number: 1, round_number: 1, player_id: 'player-1', body: 'hint 1', created_at: '' },
      { id: 'm2', room_id: 'room-1', match_number: 1, round_number: 1, player_id: 'player-2', body: 'hint 2', created_at: '' },
    ];

    // player-3 leaves without submitting. Remaining 2 players have both submitted.
    const result = removePlayer(room, players, messages, [], 'player-3');

    expect(result.room.round_number).toBe(2); // Immediately advanced to Round 2!
  });
});
