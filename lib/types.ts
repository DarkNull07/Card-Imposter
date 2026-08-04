export type Phase = 'lobby' | 'round' | 'voting' | 'reveal' | 'ended';
export type Outcome = 'crew' | 'imposter' | null;

export interface DbRoom {
  id: string;
  code: string;
  phase: Phase;
  round_number: number;
  crew_card: string | null;
  imposter_card: string | null;
  imposter_player_id: string | null;
  eliminated_player_id: string | null;
  outcome: Outcome;
  phase_ends_at: string | null;
  match_number: number;
  last_pair_index: number | null;
  version: number;
  created_at: string;
  last_activity_at: string;
}

export interface DbPlayer {
  id: string;
  room_id: string;
  token_hash: string;
  name: string;
  is_leader: boolean;
  is_spectator: boolean;
  is_eliminated: boolean;
  score: number;
  joined_at: string;
  last_seen_at: string;
}

export interface DbMessage {
  id: string;
  room_id: string;
  match_number: number;
  round_number: number;
  player_id: string;
  body: string;
  created_at: string;
}

export interface DbVote {
  id: string;
  room_id: string;
  match_number: number;
  voter_id: string;
  target_id: string | null;
  created_at: string;
}

// Client State DTOs
export interface YouState {
  playerId: string;
  name: string;
  isLeader: boolean;
  isSpectator: boolean;
  isEliminated: boolean;
  card: string | null;
  hasSubmittedThisRound: boolean;
  myMessageThisRound: string | null;
  hasVoted: boolean;
}

export interface PlayerState {
  playerId: string;
  name: string;
  isLeader: boolean;
  isSpectator: boolean;
  isEliminated: boolean;
  connected: boolean;
  score: number;
  hasSubmittedThisRound: boolean;
  hasVoted: boolean;
}

export interface RoundMessageState {
  playerId: string;
  name: string;
  body: string;
  createdAt: string;
}

export interface RoundState {
  roundNumber: number;
  revealed: boolean;
  messages: RoundMessageState[];
}

export interface VotingState {
  votesCast: number;
  votesNeeded: number;
}

export interface VoteTallyItem {
  targetPlayerId: string;
  targetName: string;
  votes: number;
  voters: string[];
}

export interface RevealState {
  imposterPlayerId: string;
  imposterName: string;
  crewCard: string;
  imposterCard: string;
  eliminatedPlayerId: string | null;
  eliminatedName: string | null;
  outcome: 'crew' | 'imposter';
  tally: VoteTallyItem[];
  abstains: string[];
}

export interface ClientRoomState {
  code: string;
  version: number;
  phase: Phase;
  roundNumber: number;
  totalRounds: number;
  matchNumber: number;
  serverTime: string;
  phaseEndsAt: string | null;
  you: YouState;
  players: PlayerState[];
  rounds: RoundState[];
  voting: VotingState | null;
  reveal: RevealState | null;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
