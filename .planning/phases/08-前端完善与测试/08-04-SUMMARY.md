---
phase: 08
plan: 04
subsystem: frontend
tags: [tabbar, navigation, icons, mine-page, auth-guard]
dependency_graph:
  requires:
    - 08-01 (wot-design-uni installed, easycom configured, theme provider)
    - 08-02 (all pages migrated to wot-design-uni components)
    - 08-03 (remaining pages migrated, mine page exists from Plan 02)
  provides:
    - Native tabBar configuration with 3 tabs: 联系人/提醒/我的
    - 6 PNG tabbar icons (3 normal + 3 active)
    - Simplified home page with scan/cards navigation only
    - Mine page with user info and logout
    - App.vue onLaunch auth guard for tabBar awareness
  affects:
    - All subsequent plans assume tabBar-based navigation
    - Non-tabBar pages use uni.navigateTo, tabBar pages use uni.switchTab
tech_stack:
  added: [sharp (temporary, removed after use)]
  patterns: [uni.switchTab for tabBar navigation, uni.navigateTo for non-tabBar pages, onLaunch auth guard]
key_files:
  created:
    - frontend/src/static/tabbar/contacts.png
    - frontend/src/static/tabbar/contacts-active.png
    - frontend/src/static/tabbar/reminders.png
    - frontend/src/static/tabbar/reminders-active.png
    - frontend/src/static/tabbar/mine.png
    - frontend/src/static/tabbar/mine-active.png
    - frontend/src/pages/mine/mine.vue
  modified:
    - frontend/src/pages.json
    - frontend/src/pages/index/index.vue
    - frontend/src/App.vue
decisions:
  - Used sharp temporarily to generate 81x81 PNG icons from SVG, then removed sharp
  - Created mine page (pages/mine/mine.vue) with user info and logout (moved from index.vue)
  - Index page simplified to show only welcome + scan/cards grid navigation
  - App.vue onLaunch checks token and redirects to login if unauthenticated
  - Kept wd-config-provider wrapper in App.vue with WeChat green theme
metrics:
  duration: ~10min
  completed: 2026-04-21
---

# Phase 08 Plan 04: Configure TabBar, Create Icons, Update Navigation Summary

## One-liner

Configured native tabBar in pages.json with 联系人/提醒/我的 tabs, generated 6 PNG icons, simplified home page, created mine page with logout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Configure tabBar in pages.json and create tabbar icons | bc15b2b | pages.json, pages/mine/mine.vue, 6 tabbar PNGs, package.json, pnpm-lock.yaml |
| 2 | Update home page, remove emoji nav, add onLaunch auth guard | f1778a9 | pages/index/index.vue, App.vue |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] pages/mine/mine.vue did not exist**
- **Found during:** Task 1
- **Issue:** Plan referenced pages/mine/mine as tabBar pagePath but directory did not exist
- **Fix:** Created pages/mine/mine.vue with user info display, logout button, and uni.showModal confirmation
- **Files modified:** frontend/src/pages/mine/mine.vue (created)
- **Commit:** bc15b2b

## Auth Gates

None.

## Verification Results

- [x] pages.json has tabBar section with color (#999999), selectedColor (#07c160), backgroundColor (#ffffff)
- [x] tabBar.list has 3 entries: contacts (联系人), reminders (提醒), mine (我的)
- [x] First tab pagePath is "pages/contacts/list" per D-15
- [x] Each tab entry has pagePath, text, iconPath, selectedIconPath
- [x] 6 PNG files exist in static/tabbar/ (contacts, contacts-active, reminders, reminders-active, mine, mine-active)
- [x] iconPath values reference static/tabbar/ correctly
- [x] index.vue uses wd-grid with wd-icon for scan/cards navigation (no emoji icons)
- [x] index.vue has no logout button or confirmLogout function
- [x] index.vue has no "联系人" or "提醒" nav cards
- [x] index.vue navigation uses uni.navigateTo for non-tabBar pages
- [x] App.vue has onLaunch with auth check redirecting to login
- [x] wd-config-provider still wraps app content with WeChat green theme
- [x] Mine page shows user info and logout button

## Known Stubs

None. All created components are fully wired and functional.

## Threat Flags

No new threat surface beyond what the plan's threat model already covers:
- T-08-10 (tabBar page without auth): Mitigated via App.vue onLaunch token check and redirect to login
- T-08-11 (H5 mock login bypass): Unchanged, existing conditional compilation in place

## Self-Check: PASSED

- [x] Commit bc15b2b exists: configure tabBar, icons, and mine page
- [x] Commit f1778a9 exists: simplify home page and add onLaunch auth guard
- [x] All created files exist on disk (6 PNGs, mine.vue)
- [x] All modified files exist on disk (pages.json, index.vue, App.vue)
- [x] SUMMARY.md created with substantive content
