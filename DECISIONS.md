# Architectural and Technical Decisions

## [V2 Phase 1] - Dependency Audit & Security Triage
- **Dependency Audit Findings**: `npm audit` reported 10 vulnerabilities (3 moderate, 6 high, 1 critical).
- **Triage Assessment**:
  1. `esbuild` (moderate): Development-only dependency imported via `vitest`. Unreachable in production runtime.
  2. `glob` (high): Development-only dependency imported via `eslint-config-next`. Unreachable in production runtime.
  3. `postcss` (high): Build-time CSS compilation tool. Unreachable in production runtime.
  4. `next` (high): Next.js 14.2.35 framework advisories. Upgrading to Next 16.x requires a breaking major framework migration (`npm audit fix --force`).
- **Decision**: Avoid breaking framework upgrades (`npm audit fix --force` forbidden per Amendment 3). Retain Next 14.2.35 for stability, as all high/critical dev tool advisories are unreachable in production client/server code.

## [V2 Phase 1] - Presence & Identity Model
- **Sticky Identity**: Removed player hard deletion on `POST /leave` (pagehide beacon/tab unload). `leave/route.ts` now marks player `last_seen_at` as stale while preserving player row, token, score, and active spectator state for seamless refresh/re-join.
- **Leadership Failover**: Implemented `reconcileLeadership` in `lib/engine.ts` and `app/api/room/[code]/state/route.ts`. When host `last_seen_at` exceeds `DISCONNECT_GRACE_SECONDS` (45s), leadership automatically transfers to the earliest-joined connected player.
- **Transcript Preservation**: Updated `resolveVoting` in `lib/engine.ts` to preserve match hint messages in room state during reveal phase.

## [V2 Phase 1] - Test Tooling & DOM Environment
- Added devDependencies `happy-dom`, `@testing-library/react`, and `@testing-library/user-event`.
- Created `vitest.config.ts` configuring `environment: 'happy-dom'` and path aliases. Excluded Playwright E2E tests (`tests/e2e/**`) from Vitest runner.
- Rewrote `tests/regression/p1-5-countdown-expire.test.ts` to import and render the real `<Countdown />` React component with fake timers, verifying real `onExpire` invocation count.
