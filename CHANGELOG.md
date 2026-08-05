# Changelog

All notable changes to Card Imposter (V2 Overhaul) will be documented in this file.

## [V2 Phase 1] - Correctness and Security
- Untracked `.env` from git (`git rm --cached .env`) and enforced `.gitignore` exclusion.
- Added DOM test tooling (`happy-dom`, `@testing-library/react`, `@testing-library/user-event`) and `vitest.config.ts`.
- Deleted dead unused form components `components/JoinForm.tsx` and `components/NameForm.tsx`.
- Created React error boundaries and Next.js app route handlers: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/party/[code]/error.tsx`, and `components/ErrorBoundary.tsx`.
- Implemented kick & ban persistence: `banned_token_hashes` recorded on `DbRoom` during `removePlayer`, blocking kicked players with `403 BANNED` response on re-join attempts.
- Fixed unbounded memory leak in `lib/rateLimit.ts` with sliding LRU and TTL bucket eviction sweep.
- Fixed `submitMessageSchema` in `lib/validation.ts` to use `TOTAL_ROUNDS` instead of hardcoded `.max(2)`.
- Removed `maximumScale: 1` from `app/layout.tsx` for WCAG 1.4.4 accessibility compliance.
- Fixed `isSnapshotUnchanged` polling performance in `lib/store/compare.ts` using derived 45s connection status threshold (achieving 100% 204 Not Modified efficiency).
- Added comprehensive unit test suite in `tests/unit/phase1.test.ts` (5 tests) and `tests/unit/polling-204.test.ts` (1 test).
- Reverted `tests/regression/p0-2-pagehide-eject.test.ts` assertions back to exact Phase 0 definitions while maintaining 100% GREEN test pass.
- Verified 100% green test suite (12 test files, 51 tests passing) and clean Next 14 production build.

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
