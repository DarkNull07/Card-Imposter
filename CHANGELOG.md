# Changelog

All notable changes to Card Imposter (V2 Overhaul) will be documented in this file.

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
