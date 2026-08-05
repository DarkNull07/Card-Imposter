# Changelog

All notable changes to Card Imposter (V2 Overhaul) will be documented in this file.

## [V2 Phase 1] - Correctness and Security
- Added DOM test tooling (`happy-dom`, `@testing-library/react`, `@testing-library/user-event`) and `vitest.config.ts`.
- Rewrote `tests/regression/p1-5-countdown-expire.test.ts` to render real `<Countdown />` component with fake timers.
- Fixed `Countdown.tsx` `onExpire` double-trigger by enforcing single invocation per `phaseEndsAt` via `hasFiredRef`.
- Fixed `P0-2`: Preserved player row in `leave/route.ts` on pagehide/refresh for sticky identity and score/role retention on re-join.
- Fixed `P0-3`: Preserved match hint messages in `resolveVoting` return snapshot so reveal state retains full transcript.
- Fixed `P0-4`: Implemented `reconcileLeadership` auto-failover to earliest-joined connected player when host `last_seen_at` > 45s stale.
- Fixed `isSnapshotUnchanged` helper in `lib/store/compare.ts` to track `last_seen_at` mutations.
- Triaged dependency audit findings (10 advisories) and recorded non-breaking decisions in `DECISIONS.md`.
- Verified 100% green test suite (10 test files, 45 tests passing).

## [V2 Phase 0] - Baseline and Safety Net
- Created branch `v2-overhaul`.
- Verified baseline quality gates (0 lint warnings/errors, 0 type errors, 41 passing tests, clean Next.js 14 production build).
- Documented 3-player happy path game flow reference.
- Added regression test suite in `tests/regression/` with 4 dedicated failing tests reproducing:
  - `P0-2`: Pagehide beacon ejecting player and resetting score/role on reload.
  - `P0-3`: Hint transcript deletion at reveal phase.
  - `P0-4`: Disconnected leader deadlocking room without auto-failover.
  - `P1-5`: Countdown timer `onExpire` calling multiple times in a loop at 0s.
- Created `CHANGELOG.md` and `AGENT_LOG.md`.
