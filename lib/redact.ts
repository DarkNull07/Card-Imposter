import { DISCONNECT_GRACE_SECONDS, TOTAL_ROUNDS } from './config';
import {
  ClientRoomState,
  DbMessage,
  DbPlayer,
  DbRoom,
  DbVote,
  PlayerState,
  RevealState,
  RoundState,
  VoteTallyItem,
  YouState,
} from './types';

export function buildClientState(
  room: DbRoom,
  players: DbPlayer[],
  messages: DbMessage[],
  votes: DbVote[],
  requestingPlayerId: string,
  now: Date = new Date()
): ClientRoomState {
  const nowMs = now.getTime();

  const youPlayer = players.find((p) => p.id === requestingPlayerId);
  if (!youPlayer) {
    throw new Error('NOT_A_PLAYER');
  }

  // Active non-spectator alive players at match start
  const activeAlivePlayers = players.filter((p) => !p.is_spectator && !p.is_eliminated);

  // Card determination
  let myCard: string | null = null;
  if (room.phase === 'round' || room.phase === 'voting' || room.phase === 'reveal') {
    if (!youPlayer.is_spectator) {
      if (youPlayer.id === room.imposter_player_id) {
        myCard = room.imposter_card;
      } else {
        myCard = room.crew_card;
      }
    }
  }

  // Current round status
  const currentRoundMessages = messages.filter(
    (m) => m.match_number === room.match_number && m.round_number === room.round_number
  );
  const myCurrentMessage = currentRoundMessages.find((m) => m.player_id === youPlayer.id);

  const currentMatchVotes = votes.filter((v) => v.match_number === room.match_number);
  const myVote = currentMatchVotes.find((v) => v.voter_id === youPlayer.id);

  const youState: YouState = {
    playerId: youPlayer.id,
    name: youPlayer.name,
    isLeader: youPlayer.is_leader,
    isSpectator: youPlayer.is_spectator,
    isEliminated: youPlayer.is_eliminated,
    card: myCard,
    hasSubmittedThisRound: !!myCurrentMessage,
    myMessageThisRound: myCurrentMessage ? myCurrentMessage.body : null,
    hasVoted: !!myVote,
  };

  // Players list
  const playersState: PlayerState[] = players.map((p) => {
    const lastSeenMs = new Date(p.last_seen_at).getTime();
    const connected = (nowMs - lastSeenMs) / 1000 <= DISCONNECT_GRACE_SECONDS;

    const pRoundMessage = currentRoundMessages.find((m) => m.player_id === p.id);
    const pVote = currentMatchVotes.find((v) => v.voter_id === p.id);

    return {
      playerId: p.id,
      name: p.name,
      isLeader: p.is_leader,
      isSpectator: p.is_spectator,
      isEliminated: p.is_eliminated,
      connected,
      score: p.score,
      hasSubmittedThisRound: !!pRoundMessage,
      hasVoted: !!pVote,
    };
  });

  // Rounds status
  const roundsState: RoundState[] = [];
  const maxRoundsToInclude = room.phase === 'lobby' ? 0 : Math.max(1, room.round_number);

  for (let r = 1; r <= maxRoundsToInclude; r++) {
    const rMessages = messages.filter(
      (m) => m.match_number === room.match_number && m.round_number === r
    );

    // Revealed if all alive active players submitted, or if phase is voting/reveal, or past round
    let revealed = false;
    if (r < room.round_number || room.phase === 'voting' || room.phase === 'reveal') {
      revealed = true;
    } else {
      revealed = activeAlivePlayers.length > 0 && rMessages.length >= activeAlivePlayers.length;
    }

    roundsState.push({
      roundNumber: r,
      revealed,
      messages: revealed
        ? rMessages.map((m) => {
            const author = players.find((p) => p.id === m.player_id);
            return {
              playerId: m.player_id,
              name: author ? author.name : 'Unknown',
              body: m.body,
              createdAt: m.created_at,
            };
          })
        : [],
    });
  }

  // Voting state
  let votingInfo = null;
  if (room.phase === 'voting' || room.phase === 'reveal') {
    votingInfo = {
      votesCast: currentMatchVotes.length,
      votesNeeded: activeAlivePlayers.length,
    };
  }

  // Reveal state
  let revealInfo: RevealState | null = null;
  if (room.phase === 'reveal') {
    const imposter = players.find((p) => p.id === room.imposter_player_id);
    const eliminated = players.find((p) => p.id === room.eliminated_player_id);

    const tallyMap = new Map<string, { targetName: string; voters: string[] }>();
    const abstains: string[] = [];

    // Initialize tally map for all active players
    for (const p of players) {
      if (!p.is_spectator) {
        tallyMap.set(p.id, { targetName: p.name, voters: [] });
      }
    }

    for (const v of currentMatchVotes) {
      const voter = players.find((p) => p.id === v.voter_id);
      const voterName = voter ? voter.name : 'Unknown';

      if (v.target_id) {
        const item = tallyMap.get(v.target_id);
        if (item) {
          item.voters.push(voterName);
        }
      } else {
        abstains.push(voterName);
      }
    }

    const tally: VoteTallyItem[] = Array.from(tallyMap.entries()).map(([targetPlayerId, item]) => ({
      targetPlayerId,
      targetName: item.targetName,
      votes: item.voters.length,
      voters: item.voters,
    }));

    revealInfo = {
      imposterPlayerId: room.imposter_player_id || '',
      imposterName: imposter ? imposter.name : 'Unknown',
      crewCard: room.crew_card || '',
      imposterCard: room.imposter_card || '',
      eliminatedPlayerId: room.eliminated_player_id,
      eliminatedName: eliminated ? eliminated.name : null,
      outcome: (room.outcome as 'crew' | 'imposter') || 'imposter',
      tally,
      abstains,
    };
  }

  return {
    code: room.code,
    version: room.version,
    phase: room.phase,
    roundNumber: room.round_number,
    totalRounds: TOTAL_ROUNDS,
    matchNumber: room.match_number,
    serverTime: now.toISOString(),
    phaseEndsAt: room.phase_ends_at,
    you: youState,
    players: playersState,
    rounds: roundsState,
    voting: votingInfo,
    reveal: revealInfo,
  };
}
