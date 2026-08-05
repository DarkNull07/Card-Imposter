# Agent Log

=== PHASE 0 REPORT ===
STATUS: COMPLETE
BRANCH: v2-overhaul
COMMIT: 781de4f phase-0: baseline setup and regression test suite

A. REQUIREMENT LEDGER
ID | requirement (first six words) | DONE / UNVERIFIED / PARTIAL / SKIPPED / DEFERRED / N-A | evidence
P0.1 | Create branch v2-overhaul | DONE | git branch v2-overhaul (exit 0)
P0.2 | Run npm ci, then full gate | DONE | npm ci (exit 0), npm run lint (exit 0), npm run typecheck (exit 0), npm run test (exit 0), npm run build (exit 0)
P0.3 | Record baseline metrics | DONE | 41 Vitest tests pass, route / 2.23kB / 89.5kB, route /party/[code] 8.39kB / 95.7kB
P0.4 | Play one full 3-player match | SKIPPED | Requires human browser testing; programmatically verified via Vitest integration flow tests/api.test.ts (Test 1)
P0.5 | Add tests/regression/ failing tests P0-2 | DONE | tests/regression/p0-2-pagehide-eject.test.ts fails (received new ID 'cac54c27...' instead of '3da44100...')
P0.6 | Add tests/regression/ failing tests P0-3 | DONE | tests/regression/p0-3-transcript-deleted.test.ts fails (expected 6 messages in reveal state, received 0)
P0.7 | Add tests/regression/ failing tests P0-4 | DONE | tests/regression/p0-4-leader-disconnect.test.ts fails (expected isLeader true for connected P2, received false)
P0.8 | Add tests/regression/ failing tests P1-5 | DONE | tests/regression/p1-5-countdown-expire.test.ts fails (expected expireCallCount 1, received 4)
P0.9 | Add CHANGELOG.md | DONE | CHANGELOG.md created at repo root

B. FILES CHANGED
Verbatim `git show --stat HEAD` output:
commit 781de4f90d40fa41eb59b5be2df02e77eacbd864
Author: DarkNull07 <darknull07@gmail.com>
Date:   Wed Aug 5 20:55:33 2026 +0530

    phase-0: baseline setup and regression test suite

 AGENT_LOG.md                                     | 314 +++++++++++++++++++++++
 CHANGELOG.md                                     |  14 +
 tests/regression/p0-2-pagehide-eject.test.ts     |  61 +++++
 tests/regression/p0-3-transcript-deleted.test.ts |  68 +++++
 tests/regression/p0-4-leader-disconnect.test.ts  |  52 ++++
 tests/regression/p1-5-countdown-expire.test.ts   |  42 +++
 6 files changed, 551 insertions(+)

Verbatim `git status --porcelain` output:
(empty - working tree clean)

NEW files:
- AGENT_LOG.md - Persistent log of phase reports and agent activity.
- CHANGELOG.md - Tracks version changes and phase progress.
- tests/regression/p0-2-pagehide-eject.test.ts - Reproduces P0-2 player ejection on reload.
- tests/regression/p0-3-transcript-deleted.test.ts - Reproduces P0-3 hint transcript wipe at reveal.
- tests/regression/p0-4-leader-disconnect.test.ts - Reproduces P0-4 leader disconnect deadlock.
- tests/regression/p1-5-countdown-expire.test.ts - Reproduces P1-5 countdown onExpire loop.

DELETED files:
- None.

C. COMMANDS RUN
1. Command: `git checkout -b v2-overhaul`
   Exit code: 0
   Terminal output:
   Switched to a new branch 'v2-overhaul'

2. Command: `npm ci`
   Exit code: 0
   Terminal output:
   npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
   npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
   npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
   npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

   added 440 packages, and audited 441 packages in 41s

   168 packages are looking for funding
     run `npm fund` for details

   10 vulnerabilities (3 moderate, 6 high, 1 critical)

   To address all issues (including breaking changes), run:
     npm audit fix --force

   Run `npm audit` for details.

3. Command: `npm run lint`
   Exit code: 0
   Terminal output:
   > card-imposter@1.0.0 lint
   > next lint

   ✔ No ESLint warnings or errors

4. Command: `npm run typecheck`
   Exit code: 0
   Terminal output:
   > card-imposter@1.0.0 typecheck
   > tsc --noEmit

5. Command: `npm run test` (baseline before regression tests)
   Exit code: 0
   Terminal output:
   > card-imposter@1.0.0 test
   > vitest run

   The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

    RUN  v2.1.9 D:/Desktop/Websites/Card Imposter

    ✓ tests/redact.test.ts (4 tests) 3ms
    ✓ tests/engine.test.ts (11 tests) 11ms
    ✓ tests/cards.test.ts (5 tests) 15ms
    ✓ tests/concurrency.test.ts (3 tests) 58ms
    ✓ tests/store-parity.test.ts (3 tests) 12ms
   stdout | tests/api.test.ts > API Route Handlers - Integration Tests > 1. Full Match Success Flow (create, join, start, 2 rounds, vote, reveal, play again, leave)
   [CARD IMPOSTER] Active Storage Driver: memory

    ✓ tests/api.test.ts (15 tests) 44ms

    Test Files  6 passed (6)
         Tests  41 passed (41)
      Start at  20:54:09
      Duration  2.09s (transform 400ms, setup 0ms, collect 997ms, tests 143ms, environment 1ms, prepare 1.04s)

6. Command: `npm run build`
   Exit code: 0
   Terminal output:
   > card-imposter@1.0.0 build
   > next build

     ▲ Next.js 14.2.35
     - Environments: .env.local, .env

      Creating an optimized production build ...
    ✓ Compiled successfully
      Linting and checking validity of types ...
      Collecting page data ...
      Generating static pages (0/4) ...
      Generating static pages (1/4) 
      Generating static pages (2/4) 
      Generating static pages (3/4) 
    ✓ Generating static pages (4/4)
      Finalizing page optimization ...
      Collecting build traces ...

   Route (app)                              Size     First Load JS
   ┌ ○ /                                    2.23 kB        89.5 kB
   ├ ○ /_not-found                          873 B          88.1 kB
   ├ ƒ /api/room                            0 B                0 B
   ├ ƒ /api/room/[code]/again               0 B                0 B
   ├ ƒ /api/room/[code]/end                 0 B                0 B
   ├ ƒ /api/room/[code]/join                0 B                0 B
   ├ ƒ /api/room/[code]/kick                0 B                0 B
   ├ ƒ /api/room/[code]/leave               0 B                0 B
   ├ ƒ /api/room/[code]/message             0 B                0 B
   ├ ƒ /api/room/[code]/start               0 B                0 B
   ├ ƒ /api/room/[code]/state               0 B                0 B
   ├ ƒ /api/room/[code]/vote                0 B                0 B
   └ ƒ /party/[code]                        8.39 kB        95.7 kB
   + First Load JS shared by all            87.3 kB
     ├ chunks/117-5949527e77b12dba.js       31.7 kB
     ├ chunks/fd9d1056-faca5e55fb7642b2.js  53.6 kB
     └ other shared chunks (total)          1.89 kB

   ○  (Static)   prerendered as static content
   ƒ  (Dynamic)  server-rendered on demand

7. Command: `npm run test` (with regression suite)
   Exit code: 1
   Terminal output:
   > card-imposter@1.0.0 test
   > vitest run

   The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

    RUN  v2.1.9 D:/Desktop/Websites/Card Imposter

    ❯ tests/regression/p1-5-countdown-expire.test.ts (1 test | 1 failed) 8ms
      × P1-5 Regression Test: Countdown onExpire Multiple Fires > onExpire callback should be called at most once per phaseEndsAt value when timer expires 7ms
        → expected 4 to be 1 // Object.is equality
    ✓ tests/redact.test.ts (4 tests) 4ms
    ✓ tests/engine.test.ts (11 tests) 8ms
    ✓ tests/cards.test.ts (5 tests) 14ms
    ✓ tests/concurrency.test.ts (3 tests) 94ms
    ✓ tests/store-parity.test.ts (3 tests) 13ms
   stdout | tests/regression/p0-4-leader-disconnect.test.ts > P0-4 Regression Test: Disconnected Leader Failover > should auto-transfer leadership to earliest-joined connected player when host last_seen_at is > 45s stale
   [CARD IMPOSTER] Active Storage Driver: memory

    ❯ tests/regression/p0-4-leader-disconnect.test.ts (1 test | 1 failed) 22ms
      × P0-4 Regression Test: Disconnected Leader Failover > should auto-transfer leadership to earliest-joined connected player when host last_seen_at is > 45s stale 21ms
        → expected false to be true // Object.is equality
   stdout | tests/regression/p0-2-pagehide-eject.test.ts > P0-2 Regression Test: Pagehide Beacon Ejection > rejoining after a pagehide leave beacon should restore existing player row, score, and active role
   [CARD IMPOSTER] Active Storage Driver: memory

    ❯ tests/regression/p0-2-pagehide-eject.test.ts (1 test | 1 failed) 21ms
      × P0-2 Regression Test: Pagehide Beacon Ejection > rejoining after a pagehide leave beacon should restore existing player row, score, and active role 21ms
        → expected 'cac54c27-467d-478f-8625-5fad098f80d4' to be '3da44100-e813-4d32-b865-0ccd8c51fd28' // Object.is equality
   stdout | tests/regression/p0-3-transcript-deleted.test.ts > P0-3 Regression Test: Hint Transcript Deletion at Reveal > hints submitted during round phase must be preserved and visible in reveal state
   [CARD IMPOSTER] Active Storage Driver: memory

    ❯ tests/regression/p0-3-transcript-deleted.test.ts (1 test | 1 failed) 25ms
      × P0-3 Regression Test: Hint Transcript Deletion at Reveal > hints submitted during round phase must be preserved and visible in reveal state 24ms
        → expected +0 to be 6 // Object.is equality
   stdout | tests/api.test.ts > API Route Handlers - Integration Tests > 1. Full Match Success Flow (create, join, start, 2 rounds, vote, reveal, play again, leave)
   [CARD IMPOSTER] Active Storage Driver: memory

    ✓ tests/api.test.ts (15 tests) 46ms

   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

    FAIL  tests/regression/p0-2-pagehide-eject.test.ts > P0-2 Regression Test: Pagehide Beacon Ejection > rejoining after a pagehide leave beacon should restore existing player row, score, and active role
   AssertionError: expected 'cac54c27-467d-478f-8625-5fad098f80d4' to be '3da44100-e813-4d32-b865-0ccd8c51fd28' // Object.is equality

   Expected: "3da44100-e813-4d32-b865-0ccd8c51fd28"
   Received: "cac54c27-467d-478f-8625-5fad098f80d4"

    ❯ tests/regression/p0-2-pagehide-eject.test.ts:57:33
        55| 
        56|     // EXPECTED (should pass once P0-2 is fixed, fails currently becau…
        57|     expect(jsonRejoin.playerId).toBe(originalP2Id);
          |                                 ^
        58|     expect(jsonRejoin.state.you.score).toBe(5);
        59|     expect(jsonRejoin.state.you.isSpectator).toBe(false);

   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

    FAIL  tests/regression/p0-3-transcript-deleted.test.ts > P0-3 Regression Test: Hint Transcript Deletion at Reveal > hints submitted during round phase must be preserved and visible in reveal state
   AssertionError: expected +0 to be 6 // Object.is equality

   - Expected
   + Received

   - 6
   + 0

    ❯ tests/regression/p0-3-transcript-deleted.test.ts:66:35
        64|       0
        65|     );
        66|     expect(totalMessagesInRounds).toBe(6);
          |                                   ^
        67|   });
        68| });

   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

    FAIL  tests/regression/p0-4-leader-disconnect.test.ts > P0-4 Regression Test: Disconnected Leader Failover > should auto-transfer leadership to earliest-joined connected player when host last_seen_at is > 45s stale
   AssertionError: expected false to be true // Object.is equality

   - Expected
   + Received

   - true
   + false

    ❯ tests/regression/p0-4-leader-disconnect.test.ts:49:31
        47|     const p1State = jsonState.state.players.find((p: any) => p.playerI…
        48| 
        49|     expect(p2State?.isLeader).toBe(true);
          |                               ^
        50|     expect(p1State?.isLeader).toBe(false);
        51|   });

   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

    FAIL  tests/regression/p1-5-countdown-expire.test.ts > P1-5 Regression Test: Countdown onExpire Multiple Fires > onExpire callback should be called at most once per phaseEndsAt value when timer expires
   AssertionError: expected 4 to be 1 // Object.is equality

   - Expected
   + Received

   - 1
   + 4

    ❯ tests/regression/p1-5-countdown-expire.test.ts:40:29
        38|     // EXPECTED: onExpire should fire exactly once for this phaseEndsA…
        39|     // CURRENT (UNFIXED): onExpire fires on initial call + 3 interval …
        40|     expect(expireCallCount).toBe(1);
          |                             ^
        41|   });
        42| });

   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

    Test Files  4 failed | 6 passed (10)
         Tests  4 failed | 41 passed (45)
      Start at  22:41:12
      Duration  1.67s (transform 467ms, setup 0ms, collect 2.30s, tests 254ms, environment 2ms, prepare 2.15s)

D. GATE RESULTS
lint PASS 0 errors, 0 warnings
typecheck PASS 0 errors
test FAIL (expected: 4 Phase-0 regression tests red, 41 baseline green)
build PASS / (2.23 kB, 89.5 kB) and /party/[code] (8.39 kB, 95.7 kB)
e2e NOT-RUN (scheduled for Phase 7)

E. DECISIONS
- Created dedicated regression test file per defect in `tests/regression/` to ensure isolated reproduction and clear test assertion signals.

F. DEVIATIONS
- Requirement P0.4 ("Play one full 3-player match") was set to SKIPPED because it requires human manual verification across 3 browser profiles; automated coverage was verified via Vitest integration suite (`tests/api.test.ts` Test 1).
- Requirement P0.2 evidence in the ledger was updated to include `npm ci` alongside quality gate commands.
- In `p1-5-countdown-expire.test.ts`, `Countdown` is a React component with a `useEffect` hook. Because the repository uses Vitest in Node environment without `jsdom`, `@testing-library/react`, or a DOM environment configured, rendering React components with hooks directly in Vitest Node environment throws `Invalid hook call`. Therefore, `p1-5-countdown-expire.test.ts` imports `Countdown` and tests the exact timer interval and `onExpire` callback logic used by the component.

G. NOT DONE
- Nothing.

H. RISKS
- `npm run test` currently exits with code 1 due to the 4 intentionally failing Phase 0 regression tests. Any CI pipeline checking exit status on `v2-overhaul` will report red until Phase 1 fixes all four defects and turns the regression suite green.

I. MANUAL VERIFICATION FOR THE HUMAN
1. Open three browser windows/profiles: Window 1 (Host), Window 2 (P2), Window 3 (P3).
2. Window 1: Navigate to `http://localhost:3000`, enter name "Host", click "Create party". Observe party code (e.g. `K7QMR`).
3. Window 2: Navigate to `http://localhost:3000`, enter name "P2", enter code `K7QMR`, click "Join party". Confirm P2 appears in Host's player list.
4. Window 3: Navigate to `http://localhost:3000`, enter name "P3", enter code `K7QMR`, click "Join party". Confirm P3 appears in player list.
5. Window 1: Click "Start Match". Observe phase transitions to `round`, round number 1, cards assigned.
6. Windows 1, 2, 3: Each player submits a hint for Round 1. Observe auto-advance to Round 2 upon 3rd submission.
7. Windows 1, 2, 3: Each player submits a hint for Round 2. Observe auto-advance to `voting` phase.
8. Windows 1, 2, 3: Cast votes. Observe transition to `reveal` phase when 3rd vote lands.
9. Window 1: Click "Play again". Observe transition back to `lobby` phase, scores preserved, cards reset.

J. NEXT PHASE
Preconditions: Receive user message `CONTINUE` to proceed to Phase 1 (Correctness and security fixes for P0-1 through P1-14).

=== END PHASE 0 REPORT ===
