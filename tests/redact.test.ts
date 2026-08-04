import { describe, expect, it } from 'vitest';
import { buildClientState } from '../lib/redact';
import { DbPlayer, DbRoom } from '../lib/types';

describe('SECRET-LEAK RULE Redaction', () => {
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

  it('should NEVER include imposter_player_id, imposter_card, or token hashes in serialized JSON for crewmate during round phase', () => {
    const clientState = buildClientState(room, players, [], [], 'player-1');
    const jsonString = JSON.stringify(clientState);

    expect(clientState.you.card).toBe('Knight');
    expect(jsonString).not.toContain('Mini P.E.K.K.A');
    expect(jsonString).not.toContain('player-3');
    expect(jsonString).not.toContain('secret-hash');
    expect(clientState.reveal).toBeNull();
  });

  it('should NEVER include imposter_player_id or imposter_card in serialized JSON for crewmate during voting phase', () => {
    const votingRoom = { ...room, phase: 'voting' as const };
    const clientState = buildClientState(votingRoom, players, [], [], 'player-1');
    const jsonString = JSON.stringify(clientState);

    expect(clientState.you.card).toBe('Knight');
    expect(jsonString).not.toContain('Mini P.E.K.K.A');
    expect(jsonString).not.toContain('player-3');
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
