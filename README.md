# CARD IMPOSTER ⚔️

A complete, production-ready, multiplayer social-deduction browser game in the style of **Spyfall**, themed on Clash Royale card names.

Built with **Next.js (App Router)**, **TypeScript strict mode**, **Tailwind CSS**, **Supabase Postgres** (with in-memory fallback store driver for local testing/offline dev), and resilient **HTTP polling**.

---

## 📖 How to Play

1. **Create or Join a Party**: One player creates a party and receives a 5-character party code (e.g. `K7QMR`). Others join using the code.
2. **Secret Card Assignment**: When the leader starts the game (requires at least 3 players), everyone gets a Clash Royale card name. All crew members get the **SAME** card; exactly **ONE** Imposter gets a **DIFFERENT** but thematically confusable card!
3. **Round 1 & Round 2 Hints**: In each round, write a short hint (max 140 chars) about your card. Hints remain hidden until all alive players submit.
4. **Voting**: Discuss and vote to eliminate the Imposter. Self-votes are forbidden. Plurality vote wins (ties mean nobody is eliminated).
5. **Outcome & Scoring**:
   - **Crew Win (+1 point each)**: Imposter is eliminated.
   - **Imposter Win (+3 points)**: Crewmate is eliminated or on a tie vote.
   - The leader can press **Play Again** to start the next match with persistent scores and promoted spectators!

---

## 🚀 Quick Start (Local Development)

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

For local development without Supabase, set:
```env
STORAGE_DRIVER=memory
```

For Supabase deployment, set:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STORAGE_DRIVER=supabase
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Setup & Database Migration

1. Create a new project at [Supabase Dashboard](https://database.new).
2. Go to **Project Settings -> API** and copy the `URL` and `service_role secret` key (never expose `service_role` to the browser!).
3. Execute the database migration using either method:
   - **SQL Editor**: Copy the contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) into the Supabase SQL Editor and click **Run**.
   - **Supabase CLI**:
     ```bash
     supabase link --project-ref your-project-ref
     supabase db push
     ```

---

## 🧪 Running Tests

- **Linting & Typechecking**:
  ```bash
  npm run lint
  npm run typecheck
  ```

- **Unit & Integration Tests** (Vitest):
  ```bash
  npm run test
  ```

- **End-to-End Tests** (Playwright multi-browser):
  ```bash
  npm run test:e2e
  ```

---

## 🌐 Deploying to Vercel

1. Install the Vercel CLI and log in:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. Link your repository and set environment variables:
   ```bash
   vercel link
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add STORAGE_DRIVER production
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 🛠️ Troubleshooting & API Error Codes

| Error Code | Status | Cause & Remediation |
| :--- | :---: | :--- |
| `BAD_REQUEST` | 400 | Invalid payload, malformed parameter, or self-vote attempt. Check input fields. |
| `NAME_TAKEN` | 409 | Name collision in party. The server auto-deduplicates names with `(2)`, `(3)`. |
| `ROOM_NOT_FOUND` | 404 | Party code does not exist. Check party code spelling. |
| `ROOM_FULL` | 409 | Party has reached max capacity of 30 players. |
| `ROOM_EXPIRED` | 410 | Party has been inactive for more than 12 hours. |
| `NOT_LEADER` | 403 | Non-leader player attempted leader-only action (start, kick, play again, end). |
| `NOT_A_PLAYER` | 403 | Requesting player is not a registered member of the room. |
| `WRONG_PHASE` | 409 | Action attempted during wrong game phase (e.g. submitting hint during voting). |
| `ALREADY_SUBMITTED` | 409 | Player already submitted a hint message for the current round. |
| `ALREADY_VOTED` | 409 | Player already cast a vote for the current match. |
| `NOT_ENOUGH_PLAYERS` | 409 | Attempted to start match with fewer than 3 active players. |
| `SELF_VOTE` | 400 | Player attempted to vote for themselves. |
| `SPECTATOR_FORBIDDEN` | 403 | Mid-game spectator attempted to submit hint or vote. |
| `ELIMINATED_FORBIDDEN` | 403 | Eliminated player attempted to submit hint or vote. |
| `RATE_LIMITED` | 429 | Rate limit exceeded (>30 mutations/min or >120 polls/min). Check `Retry-After`. |
| `CONFLICT_RETRY` | 409 | Optimistic lock collision during high concurrency. Retry request. |
| `INTERNAL` | 500 | Unexpected server error or missing Supabase environment variables. |
