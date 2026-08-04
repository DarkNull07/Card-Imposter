import crypto from 'crypto';
import { CARD_PAIRS } from './cards';
import {
  MIN_PLAYERS,
  ROUND_SECONDS,
  TOTAL_ROUNDS,
  VOTE_SECONDS,
} from './config';
import { DbMessage, DbPlayer, DbRoom, DbVote } from './types';

export interface EngineResult {
  room: DbRoom;
  players: DbPlayer[];
  messages: DbMessage[];
  votes: DbVote[];
}

export function advanceIfExpired(
  room: DbRoom,
  players: DbPlayer[],
  messages: DbMessage[],
  votes: DbVote[],
  now: Date = new Date()
): EngineResult {
  // Only advance active phases (round or voting)
  if (room.phase !== 'round' && room.phase !== 'voting') {
    return { room, players, messages, votes };
  }

  if (!room.phase_ends_at) {
    return { room, players, messages, votes };
  }

  const expiryMs = new Date(room.phase_ends_at).getTime();
  if (now.getTime() < expiryMs) {
    return { room, players, messages, votes };
  }

  let nextRoom = { ...room };
  let nextMessages = [...messages];
  let nextVotes = [...votes];

  const activeAlivePlayers = players.filter((p) => !p.is_spectator && !p.is_eliminated);

  if (room.phase === 'round') {
    const currentRoundMessages = nextMessages.filter(
      (m) => m.match_number === room.match_number && m.round_number === room.round_number
    );

    // Auto-submit "(no message)" for missing players
    for (const player of activeAlivePlayers) {
      const hasSubmitted = currentRoundMessages.some((m) => m.player_id === player.id);
      if (!hasSubmitted) {
        nextMessages.push({
          id: crypto.randomUUID(),
          room_id: room.id,
          match_number: room.match_number,
          round_number: room.round_number,
          player_id: player.id,
          body: '(no message)',
          created_at: now.toISOString(),
        });
      }
    }

    if (room.round_number < TOTAL_ROUNDS) {
      nextRoom.round_number += 1;
      nextRoom.phase_ends_at = new Date(now.getTime() + ROUND_SECONDS * 1000).toISOString();
    } else {
      nextRoom.phase = 'voting';
      nextRoom.phase_ends_at = new Date(now.getTime() + VOTE_SECONDS * 1000).toISOString();
    }
    nextRoom.version += 1;
    nextRoom.last_activity_at = now.toISOString();
    return { room: nextRoom, players, messages: nextMessages, votes: nextVotes };
  } else if (room.phase === 'voting') {
    const currentMatchVotes = nextVotes.filter((v) => v.match_number === room.match_number);

    // Auto-abstain for missing voters
    for (const player of activeAlivePlayers) {
      const hasVoted = currentMatchVotes.some((v) => v.voter_id === player.id);
      if (!hasVoted) {
        nextVotes.push({
          id: crypto.randomUUID(),
          room_id: room.id,
          match_number: room.match_number,
          voter_id: player.id,
          target_id: null,
          created_at: now.toISOString(),
        });
      }
    }

    return resolveVoting(nextRoom, players, nextVotes);
  }

  return { room: nextRoom, players, messages: nextMessages, votes: nextVotes };
}

export function startMatch(
  room: DbRoom,
  players: DbPlayer[],
  now: Date = new Date()
): { room: DbRoom; players: DbPlayer[] } {
  if (room.phase !== 'lobby') {
    throw new Error('WRONG_PHASE');
  }

  const activePlayers = players.filter((p) => !p.is_spectator);
  if (activePlayers.length < MIN_PLAYERS) {
    throw new Error('NOT_ENOUGH_PLAYERS');
  }

  // Select random pair index avoiding room.last_pair_index
  let pairIndex = crypto.randomInt(0, CARD_PAIRS.length);
  if (room.last_pair_index !== null && CARD_PAIRS.length > 1) {
    while (pairIndex === room.last_pair_index) {
      pairIndex = crypto.randomInt(0, CARD_PAIRS.length);
    }
  }

  const pair = CARD_PAIRS[pairIndex];
  const flip = crypto.randomInt(0, 2) === 1;
  const crewCard = flip ? pair[0] : pair[1];
  const imposterCard = flip ? pair[1] : pair[0];

  // Pick imposter player uniformly at random
  const imposterIndex = crypto.randomInt(0, activePlayers.length);
  const imposterPlayer = activePlayers[imposterIndex];

  const nextRoom: DbRoom = {
    ...room,
    phase: 'round',
    round_number: 1,
    match_number: room.match_number + 1,
    crew_card: crewCard,
    imposter_card: imposterCard,
    imposter_player_id: imposterPlayer.id,
    eliminated_player_id: null,
    outcome: null,
    phase_ends_at: new Date(now.getTime() + ROUND_SECONDS * 1000).toISOString(),
    last_pair_index: pairIndex,
    version: room.version + 1,
    last_activity_at: now.toISOString(),
  };

  return { room: nextRoom, players };
}

export function submitMessage(
  room: DbRoom,
  players: DbPlayer[],
  messages: DbMessage[],
  votes: DbVote[],
  playerId: string,
  roundNumber: number,
  body: string,
  now: Date = new Date()
): EngineResult {
  if (room.phase !== 'round') {
    throw new Error('WRONG_PHASE');
  }

  if (roundNumber !== room.round_number) {
    throw new Error('BAD_REQUEST');
  }

  const player = players.find((p) => p.id === playerId);
  if (!player || player.is_spectator) {
    throw new Error('SPECTATOR_FORBIDDEN');
  }

  if (player.is_eliminated) {
    throw new Error('ELIMINATED_FORBIDDEN');
  }

  const existingMessage = messages.find(
    (m) =>
      m.match_number === room.match_number &&
      m.round_number === room.round_number &&
      m.player_id === playerId
  );
  if (existingMessage) {
    throw new Error('ALREADY_SUBMITTED');
  }

  const trimmedBody = body.trim().replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
  if (!trimmedBody) {
    throw new Error('BAD_REQUEST');
  }

  const newMessage: DbMessage = {
    id: crypto.randomUUID(),
    room_id: room.id,
    match_number: room.match_number,
    round_number: room.round_number,
    player_id: playerId,
    body: trimmedBody,
    created_at: now.toISOString(),
  };

  const nextMessages = [...messages, newMessage];
  const activeAlivePlayers = players.filter((p) => !p.is_spectator && !p.is_eliminated);

  const currentRoundMessages = nextMessages.filter(
    (m) => m.match_number === room.match_number && m.round_number === room.round_number
  );

  let nextRoom = { ...room, version: room.version + 1, last_activity_at: now.toISOString() };

  // If all active alive players submitted, advance phase
  if (currentRoundMessages.length >= activeAlivePlayers.length) {
    if (room.round_number < TOTAL_ROUNDS) {
      nextRoom.round_number += 1;
      nextRoom.phase_ends_at = new Date(now.getTime() + ROUND_SECONDS * 1000).toISOString();
    } else {
      nextRoom.phase = 'voting';
      nextRoom.phase_ends_at = new Date(now.getTime() + VOTE_SECONDS * 1000).toISOString();
    }
  }

  return { room: nextRoom, players, messages: nextMessages, votes };
}

export function castVote(
  room: DbRoom,
  players: DbPlayer[],
  messages: DbMessage[],
  votes: DbVote[],
  voterId: string,
  targetId: string,
  now: Date = new Date()
): EngineResult {
  if (room.phase !== 'voting') {
    throw new Error('WRONG_PHASE');
  }

  const voter = players.find((p) => p.id === voterId);
  if (!voter || voter.is_spectator) {
    throw new Error('SPECTATOR_FORBIDDEN');
  }

  if (voter.is_eliminated) {
    throw new Error('ELIMINATED_FORBIDDEN');
  }

  if (voterId === targetId) {
    throw new Error('SELF_VOTE');
  }

  const target = players.find((p) => p.id === targetId);
  if (!target || target.is_spectator || target.is_eliminated) {
    throw new Error('BAD_REQUEST');
  }

  const existingVote = votes.find(
    (v) => v.match_number === room.match_number && v.voter_id === voterId
  );
  if (existingVote) {
    throw new Error('ALREADY_VOTED');
  }

  const newVote: DbVote = {
    id: crypto.randomUUID(),
    room_id: room.id,
    match_number: room.match_number,
    voter_id: voterId,
    target_id: targetId,
    created_at: now.toISOString(),
  };

  const nextVotes = [...votes, newVote];
  const activeAlivePlayers = players.filter((p) => !p.is_spectator && !p.is_eliminated);
  const currentMatchVotes = nextVotes.filter((v) => v.match_number === room.match_number);

  let nextRoom = { ...room, version: room.version + 1, last_activity_at: now.toISOString() };

  if (currentMatchVotes.length >= activeAlivePlayers.length) {
    return resolveVoting(nextRoom, players, nextVotes);
  }

  return { room: nextRoom, players, messages, votes: nextVotes };
}

export function resolveVoting(
  room: DbRoom,
  players: DbPlayer[],
  votes: DbVote[]
): EngineResult {
  const currentMatchVotes = votes.filter((v) => v.match_number === room.match_number);

  // Tally votes per candidate
  const tallyMap = new Map<string, number>();
  for (const v of currentMatchVotes) {
    if (v.target_id) {
      tallyMap.set(v.target_id, (tallyMap.get(v.target_id) || 0) + 1);
    }
  }

  let maxVotes = 0;
  let topCandidates: string[] = [];

  for (const [candidateId, count] of tallyMap.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [candidateId];
    } else if (count === maxVotes) {
      topCandidates.push(candidateId);
    }
  }

  let eliminatedPlayerId: string | null = null;
  if (maxVotes > 0 && topCandidates.length === 1) {
    eliminatedPlayerId = topCandidates[0];
  } // tie or 0 votes => nobody eliminated

  const outcome: 'crew' | 'imposter' =
    eliminatedPlayerId === room.imposter_player_id ? 'crew' : 'imposter';

  // Update scores & elimination status
  const nextPlayers = players.map((p) => {
    let nextScore = p.score;
    if (!p.is_spectator) {
      if (outcome === 'crew' && p.id !== room.imposter_player_id) {
        nextScore += 1;
      } else if (outcome === 'imposter' && p.id === room.imposter_player_id) {
        nextScore += 3;
      }
    }
    return {
      ...p,
      score: nextScore,
      is_eliminated: p.id === eliminatedPlayerId,
    };
  });

  const nextRoom: DbRoom = {
    ...room,
    phase: 'reveal',
    phase_ends_at: null,
    eliminated_player_id: eliminatedPlayerId,
    outcome,
    version: room.version + 1,
    last_activity_at: new Date().toISOString(),
  };

  return { room: nextRoom, players: nextPlayers, messages: [], votes };
}

export function playAgain(
  room: DbRoom,
  players: DbPlayer[],
  now: Date = new Date()
): EngineResult {
  if (room.phase !== 'reveal') {
    throw new Error('WRONG_PHASE');
  }

  // Promote spectators and reset elimination status
  const nextPlayers = players.map((p) => ({
    ...p,
    is_spectator: false,
    is_eliminated: false,
  }));

  const nextRoom: DbRoom = {
    ...room,
    phase: 'lobby',
    round_number: 0,
    crew_card: null,
    imposter_card: null,
    imposter_player_id: null,
    eliminated_player_id: null,
    outcome: null,
    phase_ends_at: null,
    version: room.version + 1,
    last_activity_at: now.toISOString(),
  };

  return { room: nextRoom, players: nextPlayers, messages: [], votes: [] };
}

export function removePlayer(
  room: DbRoom,
  players: DbPlayer[],
  messages: DbMessage[],
  votes: DbVote[],
  playerId: string,
  now: Date = new Date()
): EngineResult {
  const remainingPlayers = players.filter((p) => p.id !== playerId);

  if (remainingPlayers.length === 0) {
    return {
      room: {
        ...room,
        phase: 'ended',
        phase_ends_at: null,
        version: room.version + 1,
        last_activity_at: now.toISOString(),
      },
      players: [],
      messages,
      votes,
    };
  }

  // Transfer leadership if needed
  let updatedPlayers = remainingPlayers;
  const targetPlayer = players.find((p) => p.id === playerId);
  if (targetPlayer?.is_leader && updatedPlayers.length > 0) {
    // Leadership transfers to earliest-joined connected player (or earliest joined overall)
    const connectedPlayers = updatedPlayers.filter((p) => {
      const lastSeenMs = new Date(p.last_seen_at).getTime();
      return (now.getTime() - lastSeenMs) / 1000 <= 45;
    });

    const candidates = connectedPlayers.length > 0 ? connectedPlayers : updatedPlayers;
    candidates.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
    const newLeaderId = candidates[0].id;

    updatedPlayers = updatedPlayers.map((p) => ({
      ...p,
      is_leader: p.id === newLeaderId,
    }));
  }

  let nextRoom = { ...room, version: room.version + 1, last_activity_at: now.toISOString() };

  // Check phase conditions after departure
  const activeAlivePlayers = updatedPlayers.filter((p) => !p.is_spectator && !p.is_eliminated);

  if (nextRoom.phase === 'round') {
    const currentRoundMessages = messages.filter(
      (m) => m.match_number === nextRoom.match_number && m.round_number === nextRoom.round_number
    );
    if (activeAlivePlayers.length > 0 && currentRoundMessages.length >= activeAlivePlayers.length) {
      if (nextRoom.round_number < TOTAL_ROUNDS) {
        nextRoom.round_number += 1;
        nextRoom.phase_ends_at = new Date(now.getTime() + ROUND_SECONDS * 1000).toISOString();
      } else {
        nextRoom.phase = 'voting';
        nextRoom.phase_ends_at = new Date(now.getTime() + VOTE_SECONDS * 1000).toISOString();
      }
    }
  } else if (nextRoom.phase === 'voting') {
    const currentMatchVotes = votes.filter((v) => v.match_number === nextRoom.match_number);
    if (activeAlivePlayers.length > 0 && currentMatchVotes.length >= activeAlivePlayers.length) {
      return resolveVoting(nextRoom, updatedPlayers, votes);
    }
  }

  return { room: nextRoom, players: updatedPlayers, messages, votes };
}
