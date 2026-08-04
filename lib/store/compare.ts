import { DbMessage, DbPlayer, DbRoom, DbVote } from '../types';
import { RoomSnapshot } from './index';

export function isSnapshotUnchanged(
  before: RoomSnapshot,
  afterRoom: DbRoom,
  afterPlayers: DbPlayer[],
  afterMessages: DbMessage[],
  afterVotes: DbVote[]
): boolean {
  const rA = before.room;
  const rB = afterRoom;

  if (
    rA.id !== rB.id ||
    rA.code !== rB.code ||
    rA.phase !== rB.phase ||
    rA.round_number !== rB.round_number ||
    rA.crew_card !== rB.crew_card ||
    rA.imposter_card !== rB.imposter_card ||
    rA.imposter_player_id !== rB.imposter_player_id ||
    rA.eliminated_player_id !== rB.eliminated_player_id ||
    rA.outcome !== rB.outcome ||
    rA.phase_ends_at !== rB.phase_ends_at ||
    rA.match_number !== rB.match_number ||
    rA.last_pair_index !== rB.last_pair_index ||
    rA.created_at !== rB.created_at
  ) {
    return false;
  }

  if (before.players.length !== afterPlayers.length) return false;
  const sortedP1 = [...before.players].sort((a, b) => a.id.localeCompare(b.id));
  const sortedP2 = [...afterPlayers].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < sortedP1.length; i++) {
    const p1 = sortedP1[i];
    const p2 = sortedP2[i];
    if (
      p1.id !== p2.id ||
      p1.room_id !== p2.room_id ||
      p1.token_hash !== p2.token_hash ||
      p1.name !== p2.name ||
      p1.is_leader !== p2.is_leader ||
      p1.is_spectator !== p2.is_spectator ||
      p1.is_eliminated !== p2.is_eliminated ||
      p1.score !== p2.score ||
      p1.joined_at !== p2.joined_at
    ) {
      return false;
    }
  }

  if (before.messages.length !== afterMessages.length) return false;
  const sortedM1 = [...before.messages].sort((a, b) => a.id.localeCompare(b.id));
  const sortedM2 = [...afterMessages].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < sortedM1.length; i++) {
    const m1 = sortedM1[i];
    const m2 = sortedM2[i];
    if (
      m1.id !== m2.id ||
      m1.room_id !== m2.room_id ||
      m1.match_number !== m2.match_number ||
      m1.round_number !== m2.round_number ||
      m1.player_id !== m2.player_id ||
      m1.body !== m2.body ||
      m1.created_at !== m2.created_at
    ) {
      return false;
    }
  }

  if (before.votes.length !== afterVotes.length) return false;
  const sortedV1 = [...before.votes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedV2 = [...afterVotes].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < sortedV1.length; i++) {
    const v1 = sortedV1[i];
    const v2 = sortedV2[i];
    if (
      v1.id !== v2.id ||
      v1.room_id !== v2.room_id ||
      v1.match_number !== v2.match_number ||
      v1.voter_id !== v2.voter_id ||
      v1.target_id !== v2.target_id ||
      v1.created_at !== v2.created_at
    ) {
      return false;
    }
  }

  return true;
}
