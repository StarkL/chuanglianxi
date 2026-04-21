# Phase 08: 前端完善与测试 - Research

**Researched:** 2026-04-21
**Domain:** uni-app H5 compilation, wot-design-uni component library, Vitest + Playwright testing, WeChat mini-program audit compliance
**Confidence:** HIGH

## Summary

Phase 08 is the final phase before V1 launch. It encompasses four major work streams: (1) H5/PC compilation support so the team can develop in a browser instead of WeChat DevTools, (2) replacing all hand-written styles with wot-design-uni components, (3) adding unit tests (Vitest) and E2E tests (Playwright), and (4) preparing compliance pages for WeChat mini-program audit.

The current codebase has 12 registered pages in `pages.json`, all using hand-written CSS with inline styles. The token/auth system uses `uni.setStorageSync`/`uni.getStorageSync`. The request wrapper in `src/utils/request.ts` auto-attaches Bearer tokens. No test infrastructure exists yet. The package currently has `@dcloudio/uni-ui` ^1.5.6 installed but will be replaced by `wot-design-uni`.

**Primary recommendation:** Use easycom auto-import for wot-design-uni (zero manual component registration), wrap the app in `wd-config-provider` for WeChat green (#07c160) theming, and use Vite proxy for H5 CORS bypass.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `@dcloudio/uni-h5` for H5 compilation, add `dev:h5` script
- **D-02:** Vite proxy for dev: `/api` to `http://localhost:3000`
- **D-03:** Use `#ifdef H5` / `#ifndef H5` conditional compilation for WeChat-exclusive features
- **D-04:** H5 login page uses mock login button (skip WeChat auth)
- **D-05:** Hide contacts import under H5
- **D-06:** CSS media queries for PC responsive (max-width + grid)
- **D-07:** Frontend uses `/api` prefix universally
- **D-08:** Introduce `wot-design-uni` (Vue 3 + TS, 71+ components)
- **D-09:** Replace all hand-written styles with wot components
- **D-10:** Home nav: emoji -> wot grid/tabbar
- **D-11:** Contact list: `wd-cell` / `wd-list` instead of custom items
- **D-12:** Forms: `wd-form` + `wd-input`
- **D-13:** Empty state: `wd-empty`
- **D-14:** Search bar: `wd-search-bar`
- **D-15:** Bottom tabbar: `wd-tabbar` (contacts / reminders / mine)
- **D-16:** Vitest for utility functions (token, request wrapper, type validation)
- **D-17:** Playwright E2E against H5 build output
- **D-18:** E2E covers: login -> add contact -> search -> card scan -> add reminder
- **D-19:** No separate Vue component tests - E2E covers these
- **D-20:** Privacy policy page (WeChat audit mandatory)
- **D-21:** User agreement page (WeChat audit mandatory)
- **D-22:** Business card detail page (OCR card click -> full info)
- **D-23:** "Mine" page (settings, privacy policy, user agreement, about, logout)
- **D-24:** Login page privacy checkbox (WeChat audit requirement)
- **D-25:** `@dcloudio/uni-ui` ^1.5.6 already installed, replaced by wot-design-uni
- **D-26:** 12 pages registered in pages.json
- **D-27:** Backend CORS: `origin: '*'` + `credentials: true` (H5 dev uses proxy bypass)
- **D-28:** WeChat green `#07c160` unified via wot theme config
- **D-29:** API response format `{ success: boolean, data?: T, error?: string }` unchanged

### Claude's Discretion
- wot-design-uni specific installation method (easycom vs global registration)
- Vite proxy path mapping rules
- Privacy policy and user agreement specific copy content
- Page migration order and priority to wot components

### Deferred Ideas (OUT OF SCOPE)
- Batch contacts import - VCF import for later phase
- Contact relationship graph visualization - V2 scope
- Smart contact suggestions - V2 scope
- Voice note auto-transcription - V2 scope

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| H5 Compilation | Frontend Build | -- | uni-app Vite plugin handles H5 output |
| UI Components | Frontend / Client | -- | wot-design-uni renders in browser/mini-program |
| Theme Configuration | Frontend / Client | -- | wd-config-provider wraps app, CSS variables applied at runtime |
| Conditional Compilation | Frontend Build | -- | uni-app preprocessor handles #ifdef/#ifndef at build time |
| Unit Testing | Frontend / Client | -- | Vitest runs in Node.js, tests pure utility functions |
| E2E Testing | Browser / Client | -- | Playwright drives browser against H5 build |
| WeChat Audit Pages | Frontend / Client | -- | Static content pages rendered by uni-app |
| Tabbar Navigation | Frontend / Client | -- | wd-tabbar or native tabBar in pages.json |
| CORS Proxy | Frontend Dev Server | Backend | Vite dev server proxies /api to backend |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wot-design-uni | 1.14.0 | UI component library (70+ components) | Verified on npm registry, Vue 3 + TS, uni-app native support, MIT license |
| @dcloudio/uni-h5 | 3.0.0-5000720260410001 | H5 compilation target | Must match existing uni-app version pins in package.json |
| vitest | 4.1.5 | Unit testing framework | Verified on npm registry, Vite-native, fast, works with TypeScript |
| playwright | 1.59.1 | E2E testing framework | Verified on npm registry, standard for browser E2E |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-vue | (via uni plugin) | Vue 3 SFC support | Already included in @dcloudio/vite-plugin-uni |
| jsdom | latest | DOM environment for Vitest | Needed when testing code that references `window`/`document` |
| happy-dom | latest | Alternative to jsdom for Vitest | Faster DOM mock, use if jsdom is slow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| wot-design-uni | uView Plus / uni-ui | uView is heavier; uni-ui (current) has fewer components and less theme support |
| vitest | jest | Jest requires more config with Vite; vitest is Vite-native |
| playwright | cypress | Cypress has steeper learning curve; Playwright has better cross-browser support |

**Installation:**
```bash
cd frontend
pnpm add wot-design-uni
pnpm add -D @dcloudio/uni-h5 vitest playwright jsdom @playwright/test
npx playwright install
```

**Version verification:**
- `wot-design-uni`: 1.14.0 (verified via `npm view`, published 2025)
- `@dcloudio/uni-h5`: 3.0.0-5000720260410001 (must match existing uni-app version pins)
- `vitest`: 4.1.5 (verified via `npm view`)
- `playwright`: 1.59.1 (verified via `npm view`)

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    Developer Machine                  │
│                                                      │
│  ┌─────────────┐       ┌───────────────────────┐     │
│  │  WeChat     │       │  Browser (H5)          │     │
│  │  DevTools   │       │  Chrome/Edge           │     │
│  │  (mp-weixin)│       │                        │     │
│  └──────┬──────┘       └──────────┬────────────┘     │
│         │                         │                   │
│         │  uni.request            │  uni.request      │
│         │  (native)               │  (XHR via proxy)  │
│         ▼                         ▼                   │
│  ┌──────────────────────────────────────────────┐    │
│  │         Vite Dev Server                       │    │
│  │  ┌──────────────────┐  ┌─────────────────┐   │    │
│  │  │  H5 pages        │  │  Vite Proxy      │   │    │
│  │  │  (uni-h5 output) │  │  /api → :3000    │   │    │
│  │  └──────────────────┘  └─────────────────┘   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────┐       ┌───────────────────────┐     │
│  │  Vitest     │       │  Playwright            │     │
│  │  Unit tests │       │  E2E tests             │     │
│  │  (Node.js)  │       │  (Browser automation)  │     │
│  └─────────────┘       └───────────────────────┘     │
└──────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌────────────────────────────────────────────────┐
│              Backend (Fastify :3000)            │
│  /api/auth/*  /api/contacts/*  /api/ocr/*       │
│  /api/interactions/*  /api/reminders/*          │
└────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
frontend/
├── src/
│   ├── api/              # API layer (existing, keep)
│   ├── components/       # Reusable Vue components
│   │   └── tag-input.vue # Existing custom component
│   ├── pages/            # Page components (12 existing + 4 new)
│   │   ├── login/        # Login page (H5 mock + wx)
│   │   ├── index/        # Home page (tabbar navigation)
│   │   ├── contacts/     # Contact pages
│   │   ├── ocr/          # OCR pages
│   │   ├── interactions/ # Interaction pages
│   │   ├── reminders/    # Reminder pages
│   │   ├── mine/         # NEW: "Mine" / settings page
│   │   ├── card-detail/  # NEW: Card detail page
│   │   ├── privacy/      # NEW: Privacy policy page
│   │   └── agreement/    # NEW: User agreement page
│   ├── utils/            # Utility functions (test targets)
│   ├── static/           # Static assets
│   ├── App.vue           # Root component (wrap with config-provider)
│   ├── main.ts           # Entry point
│   ├── pages.json        # Route + easycom config
│   ├── manifest.json     # Build config
│   └── env.d.ts          # Type declarations
├── tests/
│   ├── unit/             # Vitest unit tests
│   │   ├── auth.test.ts
│   │   └── request.test.ts
│   └── e2e/              # Playwright E2E tests
│       ├── specs/
│       └── fixtures/
├── vite.config.ts        # Vite config + H5 proxy
├── vitest.config.ts      # Vitest configuration
├── playwright.config.ts  # Playwright configuration
└── package.json
```

### Pattern 1: easycom Auto-Import for wot-design-uni
**What:** Configure `pages.json` `easycom` rules to auto-resolve wot components without manual imports.
**When to use:** Always preferred for wot-design-uni -- eliminates boilerplate, reduces bundle size via tree-shaking.
**Example:**
```json
// pages.json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue"
    }
  }
}
```

### Pattern 2: Theme Provider Wrapping
**What:** Wrap the entire app in `wd-config-provider` with custom `themeVars` to set the WeChat green primary color.
**When to use:** In `App.vue` to apply theme globally across all wot components.
**Example:**
```vue
<!-- App.vue -->
<script setup lang="ts">
import type { ConfigProviderThemeVars } from 'wot-design-uni'

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#07c160',
  buttonPrimaryBgColor: '#07c160',
  buttonPrimaryColor: '#ffffff',
  tabbarActiveColor: '#07c160',
  // ... additional overrides
}
</script>

<template>
  <wd-config-provider :theme-vars="themeVars">
    <view class="app">
      <slot />
    </view>
  </wd-config-provider>
</template>
```
**Source:** Extracted from wot-design-uni v1.14.0 package `components/wd-config-provider/types.ts`

### Pattern 3: Conditional Compilation for H5 vs Mini-Program
**What:** Use uni-app's preprocessor directives to conditionally compile code blocks.
**When to use:** H5-specific mock login, hiding WeChat-only features (contacts import).
**Example:**
```vue
<script setup lang="ts">
// #ifdef H5
function handleH5MockLogin() {
  setToken('dev-token-h5')
  setUserInfo({ id: 'dev-user', nickname: 'H5测试用户', avatar: '', subscriptionTier: 'free' })
  uni.switchTab({ url: '/pages/index/index' })
}
// #endif

// #ifdef MP-WEIXIN
async function handleWxLogin() { /* ... wx.login() flow ... */ }
// #endif
</script>

<template>
  <!-- #ifdef H5 -->
  <button @click="handleH5MockLogin">模拟登录 (H5开发)</button>
  <!-- #endif -->

  <!-- #ifdef MP-WEIXIN -->
  <button @click="handleWxLogin">微信登录</button>
  <!-- #endif -->
</template>
```
**Source:** [uni-app official docs - conditional compilation](https://uniapp.dcloud.net.cn/tutorial/platform.html#conditional-compilation)

### Pattern 4: Vite Proxy for H5 CORS Bypass
**What:** Configure Vite dev server to proxy `/api` requests to the backend, avoiding CORS.
**When to use:** H5 development only -- production H5 builds hit backend directly.
**Example:**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

### Anti-Patterns to Avoid
- **Manual component registration:** Do NOT import each wd-* component individually. easycom handles this automatically.
- **Hardcoding BASE_URL per platform:** Use `import.meta.env.VITE_API_URL` with Vite env vars, not platform-specific URLs.
- **Testing Vue component rendering in Vitest:** uni-app components use platform-specific APIs (`uni.request`, `uni.setStorageSync`) that don't exist in Node.js. Keep Vitest focused on pure utility functions.
- **Skipping the config-provider wrapper:** Without `wd-config-provider`, every component uses default theme colors, requiring CSS overrides everywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tabbar navigation | Custom bottom nav CSS | `wd-tabbar` + `wd-tabbar-item` | Handles active state, icon switching, safe area insets on phones |
| Form validation | Manual check functions | `wd-form` + `wd-form-item` with rules | Built-in validation, error display, async validation support |
| Empty states | Custom empty-state CSS | `wd-empty` component | Consistent illustrations, customizable text, proper spacing |
| Search input | Custom search bar | `wd-search-bar` | Cancel button, clear button, focus/blur states handled |
| Toast/Message | `uni.showToast` wrapper | `wd-toast` / `wd-message-box` | Consistent styling with theme, better animations |
| Cell lists | Custom list items | `wd-cell` + `wd-cell-group` | Arrow indicators, padding, border handling, large mode |
| Loading states | Manual spinner CSS | `wd-loading` | Multiple sizes, color theming, smooth animations |
| Confirm dialogs | Custom modal overlay | `wd-message-box` | Promise-based API, proper z-index, safe area handling |
| Date/time pickers | Native `<picker>` wrapping | `wd-datetime-picker` | Consistent styling, theme support, better UX |
| Test runner config | Custom Jest setup | Vitest (Vite-native) | Zero-config with Vite, faster startup, native TS support |
| E2E browser automation | Puppeteer | Playwright | Multi-browser support, better mobile emulation, auto-wait |

**Key insight:** The current codebase has 12 pages with hand-written CSS for every component. wot-design-uni provides 70+ components that match WeChat's native look, with theme customization built in. Hand-rolling equivalent quality would require 10x+ the CSS lines and would still be inconsistent across platforms.

## Common Pitfalls

### Pitfall 1: easycom Path Mismatch
**What goes wrong:** easycom regex pattern doesn't match the actual component file paths in `wot-design-uni`.
**Why it happens:** wot-design-uni components are in `wot-design-uni/components/wd-xxx/wd-xxx.vue` (nested twice), not flat paths.
**How to avoid:** Use the exact pattern: `"^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue"`
**Warning signs:** Components render as empty `<wd-xxx>` tags, console shows "Unknown custom element" warnings.

### Pitfall 2: uni.request Not Available in Vitest
**What goes wrong:** Tests fail because `uni` global is undefined in Node.js.
**Why it happens:** Vitest runs in Node.js, not in the uni-app runtime. The `uni` object is injected by the uni-app framework.
**How to avoid:** For unit tests of `request.ts`, mock the `uni` global before importing:
```typescript
// tests/unit/setup.ts
globalThis.uni = {
  request: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  reLaunch: vi.fn(),
}
```
**Warning signs:** `ReferenceError: uni is not defined` in test output.

### Pitfall 3: H5 Build Missing uni-h5 Package
**What goes wrong:** `npm run dev:h5` fails with "Cannot find module @dcloudio/uni-h5".
**Why it happens:** `@dcloudio/uni-h5` is not installed by default when the project was created for mini-program only.
**How to avoid:** Explicitly install `@dcloudio/uni-h5` at the exact version matching other `@dcloudio` packages (currently `3.0.0-5000720260410001`).
**Warning signs:** Build error: `Cannot resolve '@dcloudio/uni-h5'`.

### Pitfall 4: Vite Proxy Not Applied in Production
**What goes wrong:** H5 build deployed to server fails with CORS errors.
**Why it happens:** Vite `server.proxy` only works in dev mode. Production builds send requests to the actual `VITE_API_URL`.
**How to avoid:** Set `VITE_API_URL` environment variable for production H5 builds. Use `.env.development` for dev proxy target.
**Warning signs:** Works in `dev:h5` but fails after `build:h5` deployment.

### Pitfall 5: WeChat Audit Rejection - Missing Privacy Compliance
**What goes wrong:** WeChat mini-program audit fails with "missing privacy policy" or "missing user agreement".
**Why it happens:** WeChat requires explicit user consent before collecting any user data (including open_id via login).
**How to avoid:** Add a checkbox on the login page: "I have read and agree to [Privacy Policy] and [User Agreement]". Both pages must be accessible from the login page before the user can check the box.
**Warning signs:** Audit rejection reason cites "用户隐私保护指引缺失" or similar.

### Pitfall 6: pnpm vs npm Dependency Resolution
**What goes wrong:** wot-design-uni components can't be resolved by easycom.
**Why it happens:** pnpm's strict dependency resolution may not hoist `wot-design-uni` to a path that easycom's resolver can find.
**How to avoid:** If using pnpm, add `wot-design-uni` to `publicDependencies` in `pnpm-workspace.yaml`, or switch to npm for the frontend. Verify with `ls node_modules/wot-design-uni` after install.
**Warning signs:** easycom config is correct but components don't render.

## Code Examples

### easycom Configuration in pages.json
```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue"
    }
  },
  "pages": [ ... ],
  "globalStyle": { ... }
}
```
**Source:** wot-design-uni v1.14.0 package README, verified component directory structure

### Theme Variable Override for WeChat Green
```typescript
// In App.vue
import type { ConfigProviderThemeVars } from 'wot-design-uni'

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#07c160',          // Primary theme color
  buttonPrimaryBgColor: '#07c160', // Primary button background
  buttonPrimaryColor: '#ffffff',   // Primary button text
  tabbarActiveColor: '#07c160',    // Active tab color
  colorSuccess: '#07c160',         // Success state color
  cellTapBg: '#f0f9f4',            // Cell tap highlight (light green tint)
}
```
**Source:** Extracted from wot-design-uni `components/wd-config-provider/types.ts`

### Tabbar Configuration in pages.json
```json
{
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#07c160",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "static/tabbar/home.png",
        "selectedIconPath": "static/tabbar/home-active.png"
      },
      {
        "pagePath": "pages/reminders/list/list",
        "text": "提醒",
        "iconPath": "static/tabbar/reminders.png",
        "selectedIconPath": "static/tabbar/reminders-active.png"
      },
      {
        "pagePath": "pages/mine/mine",
        "text": "我的",
        "iconPath": "static/tabbar/mine.png",
        "selectedIconPath": "static/tabbar/mine-active.png"
      }
    ]
  }
}
```

### Vitest Config for uni-app Utilities
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
  },
})
```

### Playwright Config for H5 Build
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev:h5',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| uni-ui (DCloud official) | wot-design-uni | wot-design-uni reached 1.0+ in 2024 | More components, better TypeScript support, active maintenance |
| Manual CSS styling | Theme provider + CSS variables | wot-design-uni introduced wd-config-provider | Single source of truth for colors, consistent across all components |
| WeChat DevTools only for debugging | H5 compilation + browser debugging | uni-app H5 target stabilized | Faster dev iteration, no WeChat login requirement for testing |
| No testing | Vitest + Playwright | Community standard for Vue 3 + Vite projects | 80% coverage target achievable, E2E catches integration bugs |
| Manual login testing | Mock login for H5 | Conditional compilation pattern | Develop without WeChat auth setup |

**Deprecated/outdated:**
- `uni-ui`: Still maintained but being superseded by wot-design-uni in the uni-app ecosystem for projects needing rich component sets
- `getUserProfile` API: Deprecated by WeChat in 2023+ (already handled in current codebase via `wx.login()` only)
- Manual component registration: easycom is the standard for uni-app + Vue 3 projects

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | wot-design-uni easycom pattern `"^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue"` works with Vite + uni-app | Pattern 1 | Components won't resolve, requires manual registration of all 70+ components |
| A2 | `@dcloudio/uni-h5` version must exactly match other `@dcloudio` packages (3.0.0-5000720260410001) | Pitfall 3 | Version mismatch causes build failures or runtime errors |
| A3 | pnpm may have hoisting issues with wot-design-uni easycom resolution | Pitfall 6 | May need to add workaround or switch package manager |
| A4 | WeChat mini-program audit requires privacy checkbox on login page | Pitfall 5 | Audit rejection, blocks app release |
| A5 | Vite `server.proxy` only works in dev mode, not production builds | Pitfall 4 | Production H5 deployment needs separate CORS or reverse proxy config |

## Open Questions

1. **What is the exact `pages.json` tabBar configuration format for wd-tabbar vs native tabBar?**
   - What we know: uni-app supports native `tabBar` in pages.json. wot-design-uni provides `wd-tabbar` as a component.
   - What's unclear: Whether to use native tabBar (which handles routing automatically) or wd-tabbar component (which requires manual route handling).
   - Recommendation: Use native `tabBar` in pages.json for proper routing, style with CSS variables. Reserve wd-tabbar for in-page sub-navigation.

2. **What should the `VITE_API_URL` be for production H5 deployment?**
   - What we know: Dev uses proxy to `http://localhost:3000`.
   - What's unclear: Production backend URL is not specified.
   - Recommendation: Document this as a deployment-time environment variable. Default to empty string (relative paths) if backend and H5 are served from same origin.

3. **Does the current `request.ts` need modification for H5?**
   - What we know: `request.ts` uses `uni.request()` which works in H5 mode.
   - What's unclear: Whether the `Authorization` header handling works correctly with Vite proxy (proxy passes headers).
   - Recommendation: Vite proxy forwards all headers by default. No changes needed, but test after setup.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All frontend tooling | To be verified | Unknown on target machine | -- |
| pnpm | Package management | Assumed (project uses pnpm-lock.yaml) | Unknown | npm (already have package-lock.json fallback) |
| WeChat DevTools | Mini-program testing | To be verified | Unknown | H5 dev mode (partial substitute) |
| Chrome/Edge | Playwright E2E | Assumed on Windows | Unknown | Playwright downloads its own browsers |
| Backend :3000 | H5 dev proxy | To be verified | Fastify backend | Mock API responses for E2E |

**Missing dependencies with no fallback:**
- Backend server must be running for H5 dev proxy and E2E tests (document this requirement)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (unit) + Playwright 1.59.1 (E2E) |
| Config file | `vitest.config.ts` + `playwright.config.ts` (new) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User login via WeChat | E2E (H5 mock) | `npx playwright test login` | Wave 0 |
| AUTH-02 | User logout clears session | Unit + E2E | `npx vitest run auth` | Wave 0 |
| CONTACT-01 | Create/edit/delete contacts | E2E | `npx playwright test contacts` | Wave 0 |
| SEARCH-01 | Search by name | E2E | `npx playwright test search` | Wave 0 |
| SEARCH-02 | Search by company | E2E | `npx playwright test search` | Wave 0 |
| SEARCH-03 | Filter by tag | E2E | `npx playwright test contacts` | Wave 0 |
| OCR-01 | Scan business card | E2E (partial) | `npx playwright test ocr` | Wave 0 |
| REMINDER-01 | Add reminder | E2E | `npx playwright test reminders` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (unit tests, < 10s)
- **Per wave merge:** `npx vitest run && npx playwright test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] `tests/unit/setup.ts` — Mock `uni` global for unit tests
- [ ] `tests/unit/auth.test.ts` — Token utility tests
- [ ] `tests/unit/request.test.ts` — Request wrapper tests
- [ ] `playwright.config.ts` — Playwright configuration
- [ ] `tests/e2e/specs/` — E2E test directory
- [ ] `tests/e2e/specs/login.spec.ts` — Login flow test
- [ ] `tests/e2e/specs/contacts.spec.ts` — Contact CRUD test
- [ ] Framework install: `pnpm add -D vitest playwright @playwright/test jsdom`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Token stored in `uni.setStorageSync`, verified via `/api/auth/verify` |
| V3 Session Management | yes | Session token in Bearer header, cleared on logout |
| V4 Access Control | yes | Auth guard on all routes except login |
| V5 Input Validation | yes | Form validation via `wd-form` rules + manual checks |
| V6 Cryptography | no | No client-side cryptography (HTTPS handles transport) |

### Known Threat Patterns for uni-app + H5

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token theft via XSS | Information Disclosure | `uni.setStorageSync` (not localStorage API directly), sanitize all user input |
| CSRF on H5 | Spoofing | Bearer token in header (not cookie), CORS headers restrict origins |
| Man-in-the-middle (H5) | Tampering | Enforce HTTPS in production, H5 dev proxy is local only |
| Auth bypass via conditional compilation | Spoofing | H5 mock login should be dev-only (`#ifdef H5`), never in production mini-program build |
| Privacy data exposure in UI | Information Disclosure | Mask sensitive fields, ensure error messages don't leak PII |

## Sources

### Primary (HIGH confidence)
- [wot-design-uni npm package v1.14.0](https://www.npmjs.com/package/wot-design-uni) - Package metadata, version, description, peer dependencies
- [wot-design-uni v1.14.0 extracted package](locally extracted tarball) - Full component inventory, theme variable types, index.ts exports, README
- [wot-design-uni `types.ts`](locally extracted) - `ConfigProviderThemeVars` type definition with all 100+ theme variables
- Current project codebase - All 12 pages, API layer, utils, package.json, pages.json, vite.config.ts

### Secondary (MEDIUM confidence)
- uni-app official documentation - Conditional compilation patterns (`#ifdef` / `#ifndef`)
- Vitest npm registry (v4.1.5) - Version verification
- Playwright npm registry (v1.59.1) - Version verification
- @dcloudio/uni-h5 npm registry (v3.0.0-5000720260410001) - Version verification

### Tertiary (LOW confidence)
- WeChat mini-program audit requirements - Privacy policy/user agreement requirements based on general knowledge, needs verification against current WeChat platform rules
- wot-design-uni easycom pattern - Based on package directory structure analysis, not verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry and extracted package analysis
- Architecture: HIGH - Patterns derived from verified wot-design-uni package structure and uni-app documentation
- Pitfalls: MEDIUM - Based on training knowledge + package analysis; easycom pattern verified via file system but not runtime-tested
- Testing: HIGH - Vitest and Playwright are standard choices, configs based on official patterns

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days - wot-design-uni and uni-app versions are relatively stable)
