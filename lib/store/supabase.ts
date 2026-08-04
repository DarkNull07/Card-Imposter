import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { MAX_PLAYERS } from '../config';
import { DbMessage, DbPlayer, DbRoom, DbVote } from '../types';
import { RoomSnapshot, Store } from './index';
import { isSnapshotUnchanged } from './compare';

export class SupabaseStore implements Store {
  private client: SupabaseClient | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      this.client = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('SUPABASE_ENV_MISSING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }
    return this.client;
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
    const supabase = this.getClient();
    const uppercaseCode = code.toUpperCase();

    const { data: room } = await supabase
      .from('rooms')
      .select('id, version, phase_ends_at, phase')
      .eq('code', uppercaseCode)
      .single();

    if (!room) return null;

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('token_hash', tokenHash)
      .single();

    return {
      roomExists: true,
      isMember: !!player,
      version: room.version,
      phase_ends_at: room.phase_ends_at,
      phase: room.phase,
    };
  }

  async getRoomByCode(code: string): Promise<RoomSnapshot | null> {
    const supabase = this.getClient();
    const uppercaseCode = code.toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', uppercaseCode)
      .single();

    if (roomError || !room) {
      return null;
    }

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });

    // Issue 4: Filter messages and votes to the room's current match_number
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', room.id)
      .eq('match_number', room.match_number)
      .order('created_at', { ascending: true });

    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', room.id)
      .eq('match_number', room.match_number);

    return {
      room: room as DbRoom,
      players: (players || []) as DbPlayer[],
      messages: (messages || []) as DbMessage[],
      votes: (votes || []) as DbVote[],
    };
  }

  async createRoom(
    code: string,
    leaderTokenHash: string,
    leaderName: string
  ): Promise<{ room: DbRoom; player: DbPlayer }> {
    const supabase = this.getClient();
    const uppercaseCode = code.toUpperCase();
    const now = new Date().toISOString();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code: uppercaseCode,
        phase: 'lobby',
        round_number: 0,
        match_number: 0,
        version: 1,
        created_at: now,
        last_activity_at: now,
      })
      .select('*')
      .single();

    if (roomError || !room) {
      if (roomError?.code === '23505') {
        throw new Error('CONFLICT_RETRY');
      }
      throw new Error(`CREATE_ROOM_FAILED: ${roomError?.message}`);
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        token_hash: leaderTokenHash,
        name: leaderName.trim(),
        is_leader: true,
        is_spectator: false,
        is_eliminated: false,
        score: 0,
        joined_at: now,
        last_seen_at: now,
      })
      .select('*')
      .single();

    if (playerError || !player) {
      throw new Error(`CREATE_LEADER_FAILED: ${playerError?.message}`);
    }

    return { room: room as DbRoom, player: player as DbPlayer };
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
    const supabase = this.getClient();
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

      // Skip database write and version bump when mutation result is unchanged
      if (isSnapshotUnchanged(snapshot, result.room, result.players, result.messages, result.votes)) {
        return { snapshot, actingPlayer };
      }

      const nextVersion = result.room.version > initialVersion ? result.room.version : initialVersion + 1;
      const updatedRoomObj = {
        ...result.room,
        version: nextVersion,
        last_activity_at: new Date().toISOString(),
      };

      const { data: updatedRoomRows, error: updateError } = await supabase
        .from('rooms')
        .update({
          phase: updatedRoomObj.phase,
          round_number: updatedRoomObj.round_number,
          crew_card: updatedRoomObj.crew_card,
          imposter_card: updatedRoomObj.imposter_card,
          imposter_player_id: updatedRoomObj.imposter_player_id,
          eliminated_player_id: updatedRoomObj.eliminated_player_id,
          outcome: updatedRoomObj.outcome,
          phase_ends_at: updatedRoomObj.phase_ends_at,
          match_number: updatedRoomObj.match_number,
          last_pair_index: updatedRoomObj.last_pair_index,
          version: updatedRoomObj.version,
          last_activity_at: updatedRoomObj.last_activity_at,
        })
        .eq('id', snapshot.room.id)
        .eq('version', initialVersion)
        .select('*');

      if (updateError || !updatedRoomRows || updatedRoomRows.length === 0) {
        if (attempt < maxRetries) {
          const jitter = Math.floor(25 + Math.random() * 50);
          await new Promise((res) => setTimeout(res, jitter));
          continue;
        } else {
          throw new Error('CONFLICT_RETRY');
        }
      }

      // Sync players
      const nextPlayerIds = new Set(result.players.map((p) => p.id));
      for (const p of snapshot.players) {
        if (!nextPlayerIds.has(p.id)) {
          await supabase.from('players').delete().eq('id', p.id);
        }
      }
      for (const p of result.players) {
        await supabase.from('players').upsert({
          id: p.id,
          room_id: p.room_id,
          token_hash: p.token_hash,
          name: p.name,
          is_leader: p.is_leader,
          is_spectator: p.is_spectator,
          is_eliminated: p.is_eliminated,
          score: p.score,
          joined_at: p.joined_at,
          last_seen_at: p.last_seen_at,
        });
      }

      // Sync messages (Issue 4: Delete stale messages from database)
      const nextMessageIds = new Set(result.messages.map((m) => m.id));
      for (const m of snapshot.messages) {
        if (!nextMessageIds.has(m.id)) {
          await supabase.from('messages').delete().eq('id', m.id);
        }
      }
      for (const m of result.messages) {
        await supabase.from('messages').upsert({
          id: m.id,
          room_id: m.room_id,
          match_number: m.match_number,
          round_number: m.round_number,
          player_id: m.player_id,
          body: m.body,
          created_at: m.created_at,
        });
      }

      // Sync votes (Issue 4: Delete stale votes from database)
      const nextVoteIds = new Set(result.votes.map((v) => v.id));
      for (const v of snapshot.votes) {
        if (!nextVoteIds.has(v.id)) {
          await supabase.from('votes').delete().eq('id', v.id);
        }
      }
      for (const v of result.votes) {
        await supabase.from('votes').upsert({
          id: v.id,
          room_id: v.room_id,
          match_number: v.match_number,
          voter_id: v.voter_id,
          target_id: v.target_id,
          created_at: v.created_at,
        });
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
    const supabase = this.getClient();
    // Issue 5a: Only write last_seen_at if it is > 10 seconds stale
    const { data: player } = await supabase
      .from('players')
      .select('last_seen_at')
      .eq('id', playerId)
      .single();

    if (player && player.last_seen_at) {
      const diffMs = Date.now() - new Date(player.last_seen_at).getTime();
      if (diffMs < 10000) {
        return;
      }
    }

    await supabase
      .from('players')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', playerId);
  }
}
