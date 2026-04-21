---
phase: 08
plan: 01
subsystem: frontend
tags: [setup, h5, vite, wot-design-uni, theme]
dependency_graph:
  requires: []
  provides:
    - H5 dev server with proxy to backend
    - wot-design-uni component library
    - WeChat green global theme
    - H5 mock login for browser development
  affects:
    - All subsequent frontend plans (UI component migration)
tech_stack:
  added: [wot-design-uni@1.14.0, @dcloudio/uni-h5, vitest@4.1.5, playwright@1.59.1, jsdom]
  patterns: [conditional compilation (#ifdef), theme provider pattern, Vite proxy]
key_files:
  created:
    - frontend/.env.development
  modified:
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/src/App.vue
    - frontend/src/pages.json
    - frontend/src/pages/login/login.vue
    - frontend/src/utils/request.ts
decisions:
  - Used ESM interop workaround for vite-plugin-uni default export
  - Kept existing MP-WEIXIN login flow intact behind #ifdef MP-WEIXIN
  - Changed request.ts BASE_URL fallback from full URL to /api prefix
metrics:
  duration: ~15min
  completed: 2026-04-21
---

# Phase 08 Plan 01: H5 Setup, wot-design-uni, Vite Proxy, and Theme

## One-liner

Set up H5 compilation target with wot-design-uni component library, Vite dev proxy to backend, and WeChat green global theme.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install dependencies, configure H5 compilation and Vite proxy | 2bf65d5 | package.json, vite.config.ts, .env.development, request.ts |
| 2 | Configure easycom auto-import and apply WeChat green theme | 2305130 | pages.json, App.vue, login.vue |
| (fix) | Fix vite-plugin-uni ESM interop for dev:h5 | f78eedb | vite.config.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vite-plugin-uni ESM interop issue**
- **Found during:** Task 1 verification (dev:h5 startup test)
- **Issue:** `import uni from '@dcloudio/vite-plugin-uni'` did not resolve to the default export function; `uni()` threw "uni is not a function"
- **Fix:** Added ESM interop workaround: `import _uni from ...; const uni = _uni.default || _uni`
- **Files modified:** frontend/vite.config.ts
- **Commit:** f78eedb

**2. [Rule 3 - Blocking] File edits lost during pnpm install**
- **Found during:** Task 1 script addition
- **Issue:** package.json scripts and vite.config.ts changes were lost when pnpm operations triggered a linter that rewrote files
- **Fix:** Used sed and heredoc for final writes after all pnpm operations completed
- **Files modified:** frontend/package.json, frontend/vite.config.ts, .env.development, request.ts
- **Commit:** 2bf65d5

## Auth Gates

None.

## Verification Results

- [x] pnpm install succeeds without errors
- [x] pnpm run dev:h5 starts Vite dev server at http://localhost:5173/ (verified with 8s timeout)
- [x] pages.json validates as JSON
- [x] wot-design-uni package directory exists in node_modules
- [x] @dcloudio/uni-ui removed from dependencies
- [x] wot-design-uni@1.14.0 installed in dependencies
- [x] @dcloudio/uni-h5 installed in devDependencies
- [x] dev:h5 and build:h5 scripts exist
- [x] vite.config.ts has server.proxy with /api -> localhost:3000
- [x] .env.development exists with VITE_API_URL=/api
- [x] request.ts BASE_URL uses /api as default
- [x] easycom pattern configured in pages.json
- [x] wd-config-provider wraps App.vue with #07c160 theme
- [x] Login page has #ifdef H5 mock login button

## Known Stubs

None. All configured features are fully wired and functional.

## Threat Flags

No new threat surface beyond what the plan's threat model already covers:
- T-08-01 (H5 mock login): Mitigated via `#ifdef H5` conditional compilation
- T-08-02 (Vite dev proxy): Accepted, local-only
- T-08-03 (H5 build deployment): Documented; needs .env.production template in future plan

## Self-Check: PASSED

- [x] Commit 2bf65d5 exists: feat(08-01): install wot-design-uni, configure H5 compilation, Vite proxy, and theme
- [x] Commit 2305130 exists: feat(08-01): configure easycom auto-import, WeChat green theme, and H5 mock login
- [x] Commit f78eedb exists: fix(08-01): fix vite-plugin-uni ESM interop for dev:h5
- [x] All created files exist on disk
