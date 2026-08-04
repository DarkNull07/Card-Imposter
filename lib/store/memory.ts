import crypto from 'crypto';
import { MAX_PLAYERS } from '../config';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '../types';
import { RoomSnapshot, Store } from './index';
import { isSnapshotUnchanged } from './compare';

export class MemoryStore implements Store {
  private static instance: MemoryStore;

  private rooms: Map<string, DbRoom> = new Map();
  private players: Map<string, DbPlayer[]> = new Map();
  private messages: Map<string, DbMessage[]> = new Map();
  private votes: Map<string, DbVote[]> = new Map();

  private constructor() {}

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  public reset() {
    this.rooms.clear();
    this.players.clear();
    this.messages.clear();
    this.votes.clear();
  }

  async getRoomVersionAndPlayer(
    code: string,
    tokenHash: string
  ): Promise<{
    roomExists: boolean;
    isMember: boolean;
    version: number;
    phase_ends_at: string | null;
    phase: string;
  } | null> {
    const uppercaseCode = code.toUpperCase();
    const room = Array.from(this.rooms.values()).find((r) => r.code === uppercaseCode);
    if (!room) return null;

    const players = this.players.get(room.id) || [];
    const isMember = players.some((p) => p.token_hash === tokenHash);

    return {
      roomExists: true,
      isMember,
      version: room.version,
      phase_ends_at: room.phase_ends_at,
      phase: room.phase,
    };
  }

  async getRoomByCode(code: string): Promise<RoomSnapshot | null> {
    const uppercaseCode = code.toUpperCase();
    const room = Array.from(this.rooms.values()).find((r) => r.code === uppercaseCode);
    if (!room) return null;

    const players = (this.players.get(room.id) || []).slice().sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    // Issue 4: Filter messages and votes to the room's current match_number
    const messages = (this.messages.get(room.id) || [])
      .filter((m) => m.match_number === room.match_number)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const votes = (this.votes.get(room.id) || [])
      .filter((v) => v.match_number === room.match_number)
      .slice();

    return {
      room: { ...room },
      players: players.map((p) => ({ ...p })),
      messages: messages.map((m) => ({ ...m })),
      votes: votes.map((v) => ({ ...v })),
    };
  }

  async createRoom(
    code: string,
    leaderTokenHash: string,
    leaderName: string
  ): Promise<{ room: DbRoom; player: DbPlayer }> {
    const uppercaseCode = code.toUpperCase();
    const existing = await this.getRoomByCode(uppercaseCode);
    if (existing) {
      throw new Error('CONFLICT_RETRY');
    }

    const roomId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
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
      version: 1,
      created_at: now,
      last_activity_at: now,
    };

    const leader: DbPlayer = {
      id: playerId,
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
    this.players.set(roomId, [leader]);
    this.messages.set(roomId, []);
    this.votes.set(roomId, []);

    return { room, player: leader };
  }

  async joinRoom(
    code: string,
    tokenHash: string,
    name: string
  ): Promise<{ room: DbRoom; player: DbPlayer }> {
    let joinedPlayer: DbPlayer | null = null;

    const { snapshot } = await this.mutateRoom(code, tokenHash, (snap) => {
      const { room, players } = snap;

      const lastActivityMs = new Date(room.last_activity_at).getTime();
      if (Date.now() - lastActivityMs > 12 * 60 * 60 * 1000) {
        throw new Error('ROOM_EXPIRED');
      }

      const now = new Date().toISOString();

      const existingPlayer = players.find((p) => p.token_hash === tokenHash);
      if (existingPlayer) {
        joinedPlayer = {
          ...existingPlayer,
          name: name.trim(),
          last_seen_at: now,
        };

        const updatedPlayers = players.map((p) => (p.id === existingPlayer.id ? joinedPlayer! : p));

        return {
          room: {
            ...room,
            version: room.version + 1,
            last_activity_at: now,
          },
          players: updatedPlayers,
          messages: snap.messages,
          votes: snap.votes,
        };
      }

      if (players.length >= MAX_PLAYERS) {
        throw new Error('ROOM_FULL');
      }

      let finalName = name.trim();
      const existingNames = new Set(players.map((p) => p.name.toLowerCase()));
      if (existingNames.has(finalName.toLowerCase())) {
        let count = 2;
        while (existingNames.has(`${finalName.toLowerCase()} (${count})`)) {
          count++;
        }
        finalName = `${finalName} (${count})`;
      }

      const isSpectator = room.phase !== 'lobby';

      joinedPlayer = {
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

      return {
        room: {
          ...room,
          version: room.version + 1,
          last_activity_at: now,
        },
        players: [...players, joinedPlayer],
        messages: snap.messages,
        votes: snap.votes,
      };
    });

    return { room: snapshot.room, player: joinedPlayer! };
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

      // Skip store update and version bump when mutation result is unchanged
      if (isSnapshotUnchanged(snapshot, result.room, result.players, result.messages, result.votes)) {
        return { snapshot, actingPlayer };
      }

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

      const nextVersion = result.room.version > initialVersion ? result.room.version : initialVersion + 1;
      const nextRoom: DbRoom = {
        ...result.room,
        version: nextVersion,
        last_activity_at: new Date().toISOString(),
      };

      this.rooms.set(nextRoom.id, nextRoom);
      this.players.set(nextRoom.id, result.players.map((p) => ({ ...p })));
      // Keep overall stored list in memory map, or replace with next messages/votes
      const currentMsgs = (this.messages.get(nextRoom.id) || []).filter((m) => m.match_number !== nextRoom.match_number);
      this.messages.set(nextRoom.id, [...currentMsgs, ...result.messages]);

      const currentVotes = (this.votes.get(nextRoom.id) || []).filter((v) => v.match_number !== nextRoom.match_number);
      this.votes.set(nextRoom.id, [...currentVotes, ...result.votes]);

      const updatedSnapshot = await this.getRoomByCode(code);
      const updatedActingPlayer = actingPlayer
        ? updatedSnapshot?.players.find((p) => p.id === actingPlayer.id) || null
        : null;

      return { snapshot: updatedSnapshot!, actingPlayer: updatedActingPlayer };
    }

    throw new Error('CONFLICT_RETRY');
  }

  async updatePlayerLastSeen(playerId: string): Promise<void> {
    for (const [roomId, playerList] of this.players.entries()) {
      const idx = playerList.findIndex((p) => p.id === playerId);
      if (idx !== -1) {
        const player = playerList[idx];
        const diffMs = Date.now() - new Date(player.last_seen_at).getTime();
        // Issue 5a: Only update last_seen_at if it is > 10 seconds stale
        if (diffMs >= 10000) {
          playerList[idx].last_seen_at = new Date().toISOString();
        }
        break;
      }
    }
  }
}
