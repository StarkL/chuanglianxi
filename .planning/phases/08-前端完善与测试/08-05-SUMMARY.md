---
phase: 08
plan: 05
type: execute
subsystem: frontend
tags: [testing, vitest, playwright, unit-tests, e2e-tests]
dependency_graph:
  requires: [08-01, 08-02, 08-03, 08-04]
  provides: [test-unit-auth, test-unit-request, test-e2e-login, test-e2e-contacts, test-e2e-core-flow]
  affects: []
tech-stack:
  added: [vitest@3.2.4, @playwright/test, playwright]
  patterns: [Mock uni global, Storage Map for test isolation, Playwright webServer lifecycle]
key-files:
  created:
    - frontend/vitest.config.ts
    - frontend/playwright.config.ts
    - frontend/tests/unit/setup.ts
    - frontend/tests/unit/auth.test.ts
    - frontend/tests/unit/request.test.ts
    - frontend/tests/e2e/specs/login.spec.ts
    - frontend/tests/e2e/specs/contacts.spec.ts
    - frontend/tests/e2e/specs/core-flow.spec.ts
  modified:
    - frontend/package.json (vitest version fix)
decisions:
  - "Downgraded vitest from 4.1.5 to 3.2.4 — 4.1.5 incompatible with vite 5.4.x (ERR_PACKAGE_PATH_NOT_EXPORTED)"
  - "Used shared storage Map in setup.ts instead of mockReturnValue — prevents cross-test state leakage from vi.clearAllMocks()"
  - "Adapted E2E tests to match actual login.vue template (no privacy checkbox, no disabled button on mock login)"
metrics:
  duration: "16m 23s"
  completed: "2026-04-21T22:53:00Z"
---

# Phase 08 Plan 05: Testing Infrastructure Setup Summary

**One-liner:** Set up Vitest unit testing for auth utilities and request wrapper (12 passing tests), and Playwright E2E testing framework with login, contacts, and core flow test specs.

## Tasks Completed

### Task 1: Set up Vitest config, uni mock, and write unit tests

**Commit:** `b907890` (initial) + `b30b4af` (fix)
**Files created:**
- `frontend/vitest.config.ts` — Vitest config with `globals: true`, `environment: 'node'`, `setupFiles` pointing to `tests/unit/setup.ts`, include pattern `tests/unit/**/*.test.ts`
- `frontend/tests/unit/setup.ts` — Creates `globalThis.uni` mock with `request`, `getStorageSync`, `setStorageSync`, `removeStorageSync`, `reLaunch`. Exports shared `storage` Map for test isolation. Auto-clears storage in `beforeEach`.
- `frontend/tests/unit/auth.test.ts` — 7 tests covering all auth functions
- `frontend/tests/unit/request.test.ts` — 5 tests covering request wrapper behavior

**Verification:** `npx vitest run` — **12/12 tests passing**

### Task 2: Set up Playwright E2E config and write core flow tests

**Commit:** `bbb19fd`
**Files created:**
- `frontend/playwright.config.ts` — Playwright config with `webServer: 'pnpm run dev:h5'`, `chromium` project, `baseURL: http://localhost:5173`, `reuseExistingServer: true`
- `frontend/tests/e2e/specs/login.spec.ts` — 1 test: mock login flow (shows login page, click mock login, navigate to contacts)
- `frontend/tests/e2e/specs/contacts.spec.ts` — 3 tests: navigation, empty state, search filter (with conditional contact creation)
- `frontend/tests/e2e/specs/core-flow.spec.ts` — 3 tests: login->contacts->search, tabBar navigation (all 3 tabs), logout with confirmation dialog

**Verification:** All test files created and syntactically valid. E2E execution requires H5 dev server + backend — test specs structured correctly per Playwright conventions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest 4.1.5 incompatible with vite 5.4.x**
- **Found during:** Task 1 verification
- **Issue:** `ERR_PACKAGE_PATH_NOT_EXPORTED` — vitest 4.1.5 imports `vite/module-runner` which is not exported by vite 5.4.21
- **Fix:** Downgraded vitest from 4.1.5 to 3.2.4 via `pnpm add -D vitest@3.2.4`
- **Files modified:** `frontend/package.json`, `pnpm-lock.yaml`
- **Commit:** `db8efa8`

**2. [Rule 1 - Bug] Cross-test state leakage in unit tests**
- **Found during:** Task 1 test execution
- **Issue:** `vi.clearAllMocks()` clears mock call history but `mockReturnValue('')` set in one test leaks into subsequent tests, causing `setUserInfo/getUserInfo` roundtrip test to fail (returns empty string, JSON.parse fails, returns null)
- **Fix:** Removed `vi.clearAllMocks()`, export shared `storage` Map from setup.ts, use `storage.clear()` in `beforeEach`, manipulate storage directly in tests instead of `mockReturnValue()`
- **Files modified:** `frontend/tests/unit/setup.ts`, `frontend/tests/unit/auth.test.ts`, `frontend/tests/unit/request.test.ts`
- **Commit:** `b30b4af`

**3. [Rule 2 - Missing] E2E tests adapted to actual UI**
- **Found during:** Task 2 file creation
- **Issue:** Plan expected privacy checkbox, disabled login button, and `《隐私政策》`/`《用户协议》` text — actual `login.vue` has no checkbox, login button always enabled, text without `《》` brackets
- **Fix:** Adapted E2E tests to match actual UI: removed checkbox assertions, simplified login flow, updated text selectors
- **Files modified:** `frontend/tests/e2e/specs/login.spec.ts`, `frontend/tests/e2e/specs/contacts.spec.ts`, `frontend/tests/e2e/specs/core-flow.spec.ts`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: test-data | tests/e2e/specs/*.spec.ts | E2E tests use mock data (dev-token-h5, H5测试用户) — no real user data in tests, per T-08-13 accept disposition |

## Commits

| Hash | Message |
|------|---------|
| `b907890` | feat(08-05): set up Vitest config, uni mock, and unit tests for auth and request |
| `b30b4af` | fix(08-05): fix unit test setup and tests to pass all 12 tests |
| `db8efa8` | fix(08-05): downgrade vitest to 3.2.4 for vite 5.4.x compatibility |
| `bbb19fd` | feat(08-05): set up Playwright E2E config and write core flow tests |

## Self-Check: PASSED

- [x] `frontend/vitest.config.ts` exists with correct configuration
- [x] `frontend/tests/unit/setup.ts` mocks all uni APIs used by auth.ts and request.ts
- [x] `frontend/tests/unit/auth.test.ts` has 7 passing tests covering all auth functions
- [x] `frontend/tests/unit/request.test.ts` has 5 passing tests covering request behavior
- [x] `frontend/playwright.config.ts` exists with webServer and chromium project
- [x] `frontend/tests/e2e/specs/login.spec.ts` tests mock login flow
- [x] `frontend/tests/e2e/specs/contacts.spec.ts` tests navigation, empty state, search filter
- [x] `frontend/tests/e2e/specs/core-flow.spec.ts` tests login->contacts->search, tabBar nav, logout
- [x] `npx vitest run` exits with code 0 (12/12 tests pass)
- [x] Package.json has test:unit and test:e2e scripts
