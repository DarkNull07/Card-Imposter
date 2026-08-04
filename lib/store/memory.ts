import crypto from 'crypto';
import { MAX_PLAYERS } from '../config';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '../types';
import { RoomSnapshot, Store } from './index';

export class MemoryStore implements Store {
  private static instance: MemoryStore;

  private rooms = new Map<string, DbRoom>(); // id -> DbRoom
  private roomCodes = new Map<string, string>(); // code -> id
  private players = new Map<string, DbPlayer>(); // id -> DbPlayer
  private messages = new Map<string, DbMessage>(); // id -> DbMessage
  private votes = new Map<string, DbVote>(); // id -> DbVote

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  public reset(): void {
    this.rooms.clear();
    this.roomCodes.clear();
    this.players.clear();
    this.messages.clear();
    this.votes.clear();
  }

  async getRoomByCode(code: string): Promise<RoomSnapshot | null> {
    const roomId = this.roomCodes.get(code.toUpperCase());
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playersList = Array.from(this.players.values())
      .filter((p) => p.room_id === roomId)
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

    const messagesList = Array.from(this.messages.values())
      .filter((m) => m.room_id === roomId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const votesList = Array.from(this.votes.values()).filter((v) => v.room_id === roomId);

    return {
      room: { ...room },
      players: playersList.map((p) => ({ ...p })),
      messages: messagesList.map((m) => ({ ...m })),
      votes: votesList.map((v) => ({ ...v })),
    };
  }

  async createRoom(
    code: string,
    leaderTokenHash: string,
    leaderName: string
  ): Promise<{ room: DbRoom; player: DbPlayer }> {
    const uppercaseCode = code.toUpperCase();
    if (this.roomCodes.has(uppercaseCode)) {
      throw new Error('CONFLICT_RETRY');
    }

    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();

    const room: DbRoom = {
      id: roomId,
      code: uppercaseCode,
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
      created_at: now,
      last_activity_at: now,
    };

    const player: DbPlayer = {
      id: crypto.randomUUID(),
      room_id: roomId,
      token_hash: leaderTokenHash,
      name: leaderName.trim(),
      is_leader: true,
      is_spectator: false,
      is_eliminated: false,
      score: 0,
      joined_at: now,
      last_seen_at: now,
    };

    this.rooms.set(roomId, room);
    this.roomCodes.set(uppercaseCode, roomId);
    this.players.set(player.id, player);

    return { room, player };
  }

  async joinRoom(
    code: string,
    tokenHash: string,
    name: string
  ): Promise<{ room: DbRoom; player: DbPlayer }> {
    const snapshot = await this.getRoomByCode(code);
    if (!snapshot) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const { room, players } = snapshot;

    // Check room TTL (12h)
    const lastActivityMs = new Date(room.last_activity_at).getTime();
    if (Date.now() - lastActivityMs > 12 * 60 * 60 * 1000) {
      throw new Error('ROOM_EXPIRED');
    }

    // Rejoin check
    const existingPlayer = players.find((p) => p.token_hash === tokenHash);
    if (existingPlayer) {
      const now = new Date().toISOString();
      const updatedPlayer: DbPlayer = {
        ...existingPlayer,
        name: name.trim(),
        last_seen_at: now,
      };
      this.players.set(existingPlayer.id, updatedPlayer);
      return { room, player: updatedPlayer };
    }

    // Room capacity check
    if (players.length >= MAX_PLAYERS) {
      throw new Error('ROOM_FULL');
    }

    // Deduplicate name
    let finalName = name.trim();
    const existingNames = new Set(players.map((p) => p.name.toLowerCase()));
    if (existingNames.has(finalName.toLowerCase())) {
      let count = 2;
      while (existingNames.has(`${finalName.toLowerCase()} (${count})`)) {
        count++;
      }
      finalName = `${finalName} (${count})`;
    }

    const now = new Date().toISOString();
    const isSpectator = room.phase !== 'lobby';

    const newPlayer: DbPlayer = {
      id: crypto.randomUUID(),
      room_id: room.id,
      token_hash: tokenHash,
      name: finalName,
      is_leader: false,
      is_spectator: isSpectator,
      is_eliminated: false,
      score: 0,
      joined_at: now,
      last_seen_at: now,
    };

    this.players.set(newPlayer.id, newPlayer);

    // Update room last activity & version
    const updatedRoom: DbRoom = {
      ...room,
      version: room.version + 1,
      last_activity_at: now,
    };
    this.rooms.set(room.id, updatedRoom);

    return { room: updatedRoom, player: newPlayer };
  }

  async mutateRoom(
    code: string,
    tokenHash: string | null,
    mutationFn: (
      snapshot: RoomSnapshot,
      actingPlayer: DbPlayer | null
    ) => { room: DbRoom; players: DbPlayer[]; messages: DbMessage[]; votes: DbVote[] }
  ): Promise<{ snapshot: RoomSnapshot; actingPlayer: DbPlayer | null }> {
    const maxRetries = 5;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const snapshot = await this.getRoomByCode(code);
      if (!snapshot) {
        throw new Error('ROOM_NOT_FOUND');
      }

      const actingPlayer = tokenHash
        ? snapshot.players.find((p) => p.token_hash === tokenHash) || null
        : null;

      const initialVersion = snapshot.room.version;
      const result = mutationFn(snapshot, actingPlayer);

      // Optimistic lock check
      const currentRoom = this.rooms.get(snapshot.room.id);
      if (!currentRoom || currentRoom.version !== initialVersion) {
        if (attempt < maxRetries) {
          const jitter = Math.floor(25 + Math.random() * 50);
          await new Promise((res) => setTimeout(res, jitter));
          continue;
        } else {
          throw new Error('CONFLICT_RETRY');
        }
      }

      // Save state
      this.rooms.set(result.room.id, result.room);

      // Sync players
      const currentRoomPlayers = Array.from(this.players.values()).filter(
        (p) => p.room_id === result.room.id
      );
      const nextPlayerIds = new Set(result.players.map((p) => p.id));
      for (const p of currentRoomPlayers) {
        if (!nextPlayerIds.has(p.id)) {
          this.players.delete(p.id);
        }
      }
      for (const p of result.players) {
        this.players.set(p.id, p);
      }

      // Sync messages
      for (const m of result.messages) {
        this.messages.set(m.id, m);
      }

      // Sync votes
      for (const v of result.votes) {
        this.votes.set(v.id, v);
      }

      const updatedSnapshot = await this.getRoomByCode(code);
      const updatedActingPlayer = actingPlayer
        ? updatedSnapshot?.players.find((p) => p.id === actingPlayer.id) || null
        : null;

      return { snapshot: updatedSnapshot!, actingPlayer: updatedActingPlayer };
    }

    throw new Error('CONFLICT_RETRY');
  }

  async updatePlayerLastSeen(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (player) {
      this.players.set(playerId, {
        ...player,
        last_seen_at: new Date().toISOString(),
      });
    }
  }
}
