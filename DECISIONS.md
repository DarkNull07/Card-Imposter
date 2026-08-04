# CARD IMPOSTER - Architectural & Design Decisions

This document records all architectural decisions, design choices, and resolutions to any minor gaps encountered during the development of **CARD IMPOSTER**.

## 1. Stack & Architecture
- **Framework**: Next.js (latest App Router) with TypeScript in strict mode.
- **Styling**: Tailwind CSS exclusively. No external UI component libraries, no CSS-in-JS, no SCSS.
- **Package Manager**: npm, targeting Node 20.
- **Data Store**: Supabase Postgres via service key (`SUPABASE_SERVICE_ROLE_KEY`) with an abstract interface (`lib/store/index.ts`). A thread-safe, in-process memory store (`lib/store/memory.ts`) is used when `STORAGE_DRIVER=memory`.
- **Realtime Strategy**: HTTP polling every 1000 ms per visible client. Server responds with 204 No Content when `rooms.version` is unchanged. Polling pauses when `document.hidden` is true.

## 2. Authentication & Identity
- **Anonymous Token Authentication**: No accounts, passwords, or emails.
- Clients generate a persistent `playerToken` (`crypto.randomUUID()`) saved in `localStorage` under `cardimposter.playerToken`.
- API authorization uses the `x-player-token` request header.
- The server stores `sha256(playerToken)` as `token_hash` in the database to prevent raw token exposure.

## 3. Concurrency & State Mutation
- **Optimistic Locking**: Rooms track an integer `version` incremented on every state change.
- Database updates execute `UPDATE ... WHERE id = $1 AND version = $2`.
- On zero affected rows, the engine re-reads the room state and retries up to 5 times with 25–75 ms jitter. If all retries fail, it returns HTTP 409 `CONFLICT_RETRY`.

## 4. Timers & Expiring Phases
- Timers are lazily evaluated server-side. Each room holds `phase_ends_at`.
- On any state read/write, `advanceIfExpired(room)` checks expiry.
- On expiry:
  - `round`: Non-submitters auto-submit `(no message)`.
  - `voting`: Non-voters abstain (`target_id = null`).

## 5. Secret Isolation (Secret-Leak Rule)
- During `round` and `voting` phases, `lib/redact.ts` scrubs `imposter_player_id`, `imposter_card`, and other players' card assignments from the payload.
- A player receives only their own card assignment in `you.card`.
- Round hint messages are withheld from all players until the round is fully completed (`revealed: false` until all alive players have submitted).

## 6. Presence & Spectators
- Each state poll updates `players.last_seen_at`.
- Players with `last_seen_at` older than 45 seconds render with a greyed-out disconnect indicator.
- Mid-game joiners are assigned `is_spectator = true`, preventing submission and voting until promoted at the start of the next match via "Play again".
- `navigator.sendBeacon` triggers `POST /api/room/:code/leave` on `pagehide`. If the leader leaves, leadership transfers to the earliest-joined connected player. If a departure satisfies phase completion, transition occurs immediately.

## 7. Scoring & Elimination Rules
- Crew Win: +1 point to every crewmate (alive, eliminated, or non-spectator).
- Imposter Win: +3 points to the imposter.
- Plurality Voting: The player receiving the strictly highest vote count is eliminated. On a tie for top votes (or 0 votes cast), nobody is eliminated and the imposter wins.

## 8. Card Pairing & Randomization
- 55 Clash Royale card pairs defined in `lib/cards.ts`.
- Match start selects a pair index using `crypto.randomInt`, avoiding consecutive reuse of `last_pair_index`. Role assignment (crew vs imposter card) and imposter player selection are chosen uniformly at random.
