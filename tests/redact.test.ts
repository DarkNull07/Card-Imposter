import { describe, expect, it } from 'vitest';
import { buildClientState } from '@/lib/redact';
import { DbMessage, DbPlayer, DbRoom } from '@/lib/types';

describe('SECRET-LEAK RULE Redaction & Client State Formatting', () => {
  const room: DbRoom = {
    id: 'room-1',
    code: 'K7QMR',
    phase: 'round',
    round_number: 1,
    crew_card: 'Knight',
    imposter_card: 'Mini P.E.K.K.A',
    imposter_player_id: 'player-3',
    eliminated_player_id: null,
    outcome: null,
    phase_ends_at: null,
    match_number: 1,
    last_pair_index: 0,
    version: 1,
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  const players: DbPlayer[] = [
    {
      id: 'player-1',
      room_id: 'room-1',
      token_hash: 'secret-hash-1',
      name: 'Crewmate 1',
      is_leader: true,
      is_spectator: false,
      is_eliminated: false,
      score: 0,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    {
      id: 'player-2',
      room_id: 'room-1',
      token_hash: 'secret-hash-2',
      name: 'Crewmate 2',
      is_leader: false,
      is_spectator: false,
      is_eliminated: false,
      score: 0,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    {
      id: 'player-3',
      room_id: 'room-1',
      token_hash: 'secret-hash-3',
      name: 'Imposter Player',
      is_leader: false,
      is_spectator: false,
      is_eliminated: false,
      score: 0,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
  ];

  it('should format you.myMessageThisRound correctly (null before submitting, equals own message body after submitting)', () => {
    // 1. Before submitting
    const stateBefore = buildClientState(room, players, [], [], 'player-1');
    expect(stateBefore.you.hasSubmittedThisRound).toBe(false);
    expect(stateBefore.you.myMessageThisRound).toBeNull();

    // 2. After submitting
    const submittedMessages: DbMessage[] = [
      {
        id: 'msg-1',
        room_id: 'room-1',
        match_number: 1,
        round_number: 1,
        player_id: 'player-1',
        body: 'My secret melee hint',
        created_at: new Date().toISOString(),
      },
    ];

    const stateAfter = buildClientState(room, players, submittedMessages, [], 'player-1');
    expect(stateAfter.you.hasSubmittedThisRound).toBe(true);
    expect(stateAfter.you.myMessageThisRound).toBe('My secret melee hint');
  });

  it('should sanitize client state during round phase according to secret isolation rules', () => {
    const clientState = buildClientState(room, players, [], [], 'player-1');
    const jsonString = JSON.stringify(clientState);

    // (a) Imposter card string is absent from payload
    expect(jsonString).not.toContain('Mini P.E.K.K.A');

    // (b) No secret keys appear anywhere in serialized JSON
    expect(jsonString).not.toContain('imposterPlayerId');
    expect(jsonString).not.toContain('imposter_card');
    expect(jsonString).not.toContain('crew_card');
    expect(jsonString).not.toContain('token_hash');

    // (c) you.card equals requester's own card only
    expect(clientState.you.card).toBe('Knight');

    // (d) reveal is null
    expect(clientState.reveal).toBeNull();

    // (e) rounds[].messages is empty while revealed is false
    expect(clientState.rounds[0].revealed).toBe(false);
    expect(clientState.rounds[0].messages).toEqual([]);
  });

  it('should sanitize client state during voting phase according to secret isolation rules', () => {
    const votingRoom = { ...room, phase: 'voting' as const };
    const clientState = buildClientState(votingRoom, players, [], [], 'player-1');
    const jsonString = JSON.stringify(clientState);

    // (a) Imposter card string is absent
    expect(jsonString).not.toContain('Mini P.E.K.K.A');

    // (b) No secret keys appear anywhere
    expect(jsonString).not.toContain('imposterPlayerId');
    expect(jsonString).not.toContain('imposter_card');
    expect(jsonString).not.toContain('crew_card');
    expect(jsonString).not.toContain('token_hash');

    // (c) you.card equals requester's own card
    expect(clientState.you.card).toBe('Knight');

    // (d) reveal is null
    expect(clientState.reveal).toBeNull();
  });

  it('should reveal imposter identity and both cards only during reveal phase', () => {
    const revealRoom = {
      ...room,
      phase: 'reveal' as const,
      eliminated_player_id: 'player-3',
      outcome: 'crew' as const,
    };
    const clientState = buildClientState(revealRoom, players, [], [], 'player-1');

    expect(clientState.reveal).not.toBeNull();
    expect(clientState.reveal?.imposterPlayerId).toBe('player-3');
    expect(clientState.reveal?.imposterName).toBe('Imposter Player');
    expect(clientState.reveal?.crewCard).toBe('Knight');
    expect(clientState.reveal?.imposterCard).toBe('Mini P.E.K.K.A');
  });
});
