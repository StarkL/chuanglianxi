# Phase 03 Plan 02 Summary: Custom Tag Input

**Completed:** 2026-04-16
**Plan:** 03-02
**Status:** Complete

## What Was Built

### New Component
1. **tag-input.vue** — Reusable tag input component
   - v-model pattern (defineProps + defineEmits)
   - Shows selected tags with × remove button
   - Shows preset tags (工作/朋友/家人/同事/客户) as selectable chips
   - Custom text input with "+" button (NOT @blur, per research Pitfall 4)
   - Emits new arrays on update (no mutation of props)

### Modified Files
2. **edit.vue** — Integrated tag-input component
   - Replaced inline tag picker with `<tag-input v-model="selectedTags" />`
   - Removed tagOptions constant, toggleTag function, and related styles
   - Kept all other form fields and save logic unchanged

## Key Decisions Made

- Custom tag input uses @confirm + explicit "+" button, NOT @blur (mobile keyboard issues)
- Component accepts optional presetTags prop for flexibility
- Tags stored as string[] directly on Contact model (no separate tag table)

## Verification

- [x] tag-input.vue exists with v-model pattern
- [x] Has preset tag chips, custom text input with + button
- [x] Does NOT use @blur for tag creation
- [x] Creates new arrays on emit (no prop mutation)
- [x] edit.vue imports TagInput
- [x] edit.vue uses `<tag-input v-model="selectedTags" />`
- [x] Removed old tagOptions, toggleTag, and .tag-picker/.tag-option styles
- [ ] Manual test: Create custom tag, save contact, verify persistence
