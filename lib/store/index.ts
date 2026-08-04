import { MemoryStore } from './memory';
import { SupabaseStore } from './supabase';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '../types';

export interface RoomSnapshot {
  room: DbRoom;
  players: DbPlayer[];
  messages: DbMessage[];
  votes: DbVote[];
}

export interface Store {
  createRoom(code: string, leaderTokenHash: string, leaderName: string): Promise<{ room: DbRoom; player: DbPlayer }>;
  getRoomByCode(code: string): Promise<RoomSnapshot | null>;
  getRoomVersionAndPlayer(
    code: string,
    tokenHash: string
  ): Promise<{
    roomExists: boolean;
    isMember: boolean;
    version: number;
    phase_ends_at: string | null;
    phase: string;
  } | null>;
  joinRoom(code: string, tokenHash: string, name: string): Promise<{ room: DbRoom; player: DbPlayer }>;
  mutateRoom(
    code: string,
    tokenHash: string | null,
    mutationFn: (
      snapshot: RoomSnapshot,
      actingPlayer: DbPlayer | null
    ) => { room: DbRoom; players: DbPlayer[]; messages: DbMessage[]; votes: DbVote[] }
  ): Promise<{ snapshot: RoomSnapshot; actingPlayer: DbPlayer | null }>;
  updatePlayerLastSeen(playerId: string): Promise<void>;
}

let loggedDriver = false;

export function getStore(): Store {
  const driver = process.env.STORAGE_DRIVER || 'supabase';
  if (!loggedDriver) {
    console.log(`[CARD IMPOSTER] Active Storage Driver: ${driver}`);
    loggedDriver = true;
  }

  if (driver === 'memory') {
    return MemoryStore.getInstance();
  } else {
    return new SupabaseStore();
  }
}

