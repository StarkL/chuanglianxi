# Phase 03: 联系人管理 - Research

**Researched:** 2026-04-16
**Domain:** WeChat mini-program contacts API, tag input patterns, contact deduplication
**Confidence:** MEDIUM

## Summary

This research covers the two remaining gaps in Phase 03: (1) phone contacts import via `wx.chooseContact` (CONTACT-04) and (2) custom tag creation UI. The project uses uni-app + Vue 3 + TypeScript frontend with Node.js + Fastify + Prisma + PostgreSQL backend.

**Primary recommendation:** Use `wx.chooseContact` for individual contact selection with backend decryption, implement a combined preset + free-text tag input in the edit page, and deduplicate contacts by exact phone number match before creating new records.

**CRITICAL FINDING:** `wx.chooseContact` returns encrypted data (`encryptedData` + `iv`) that requires backend decryption using the WeChat session key. The data flow is: frontend calls `wx.chooseContact` -> receives encrypted payload -> sends to backend -> backend decrypts with session key -> creates Contact record. This means a new backend endpoint is needed for contact decryption and import.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 先实现逐个选择联系人导入（wx.chooseContact），不做批量导入
- **D-02:** 批量导入能力后续补充，不在本阶段完成
- **D-03:** 保持预设标签（工作/朋友/家人/同事/客户）+ 允许用户自由输入创建自定义标签
- **D-04:** 标签输入 UI 改为：显示预设标签供选择 + 提供"添加标签"输入框
- **D-05:** 保持一次性加载全部联系人，不分页 — 免费版 100 联系人上限，数据量可控
- **D-06:** 保持现状 — POST /interactions 创建 + 联系人详情接口返回交互列表，V1 已足够
- **D-07:** 不需要独立的交互记录编辑/删除功能，不需要来源追溯字段
- **D-08:** 联系人 CRUD 前后端完整 — list.vue, detail.vue, edit.vue + contacts.ts routes
- **D-09:** 搜索支持按姓名和公司模糊搜索（insensitive）
- **D-10:** 标签筛选使用 Postgres Array contains 查询
- **D-11:** 删除操作有确认弹窗（uni.showModal）
- **D-12:** 电话字段支持一键拨打（uni.makePhoneCall）

### Claude's Discretion
- 通讯录导入页面的具体 UI 布局
- 自定义标签输入框的交互细节（回车确认/失焦确认）
- 导入后重复联系人的去重策略

### Deferred Ideas (OUT OF SCOPE)
- 批量通讯录导入 — 后续阶段实现 VCF 导入
- 联系人关系图谱可视化 — V2 范围
- 智能联系建议 — V2 范围
- 交互记录来源追溯 — 不在 V1 实现

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contact picker (wx.chooseContact) | Browser / Client | — | WeChat native API, frontend-only trigger |
| Encrypted data decryption | API / Backend | — | Requires session key, must never expose to client |
| Contact deduplication | API / Backend | — | Database-level check, race condition prevention |
| Contact creation from import | API / Backend | — | Uses existing POST /contacts endpoint |
| Tag input UI (preset + custom) | Browser / Client | — | Pure frontend interaction pattern |
| Tag persistence | API / Backend | — | Existing Contact.tags String[] handles this |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wx.chooseContact (WeChat native) | WeChat base library >= 2.1.0 | Open contact picker, return encrypted contact data | Official WeChat API, only way to access phone contacts in mini-program |
| WeChat session decrypt (WCBiz) | Node.js crypto (built-in) | Decrypt encryptedData using session key | Official WeChat decryption algorithm (AES-256-CBC) |
| @dcloudio/uni-ui | 1.5.12 (current) | UI components (tags, buttons) | Already installed, DCloud official |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto` | Built-in | AES-256-CBC decryption of WeChat encryptedData | Backend decryption of wx.chooseContact result |

**Note:** The project does not use any third-party UI component library beyond `@dcloudio/uni-ui`. The tag input component should be built as a custom Vue component using uni-app primitives (`view`, `input`, `text`) — no additional dependencies needed.

## Architecture Patterns

### System Architecture Diagram

```
Phone Contacts Import Flow:

┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   User taps   │────▶│ wx.chooseContact │────▶│  Returns:         │────▶│  POST to      │
│ "Import from  │     │  (uni-app native)│     │  encryptedData    │     │  /contacts/   │
│  Phone"       │     │                  │     │  iv               │     │  import-from- │
│               │     │                  │     │                  │     │  phone        │
└──────────────┘     └──────────────────┘     └──────────────────┘     └──────┬───────┘
                                                                              │
                                                                              ▼
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Response:    │◀────│ prisma.contact   │◀────│ Decrypt: name,   │◀────│  Decrypt with │
│  Contact      │     │ .create() or     │     │ phone -> create  │     │  session key  │
│  object       │     │ skip (duplicate) │     │  Contact DTO     │     │  (AES-256)   │
└──────────────┘     └──────────────────┘     └──────────────────┘     └──────────────┘

Custom Tag Creation Flow:

┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  User opens  │────▶│ Preset tags      │────▶│ User types custom│────▶│  On Enter/    │
│  edit page   │     │ displayed as     │     │ tag in input     │     │  blur: add to │
│              │     │ clickable chips  │     │ field            │     │  selectedTags │
└──────────────┘     └──────────────────┘     └──────────────────┘     └──────────────┘
         │                                                                     │
         └─────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                               ┌──────────────────┐
                               │ Save: POST/PUT   │
                               │ /contacts with   │
                               │ tags: string[]   │
                               └──────────────────┘
```

### Recommended Project Structure

```
frontend/src/
├── components/
│   └── tag-input.vue          # NEW: Reusable tag input (preset + custom)
├── pages/
│   └── contacts/
│       ├── list.vue           # EXISTING: Add "Import from Phone" button
│       ├── import-phone.vue   # NEW: Contact import page (wx.chooseContact)
│       ├── edit/edit.vue      # MODIFIED: Replace tag section with tag-input
│       └── detail/detail.vue  # No changes needed

backend/src/
├── routes/
│   ├── contacts.ts            # MODIFIED: Add import-from-phone endpoint
│   └── index.ts               # MODIFIED: Register new route
├── lib/
│   └── wechat-crypto.ts       # NEW: WeChat encryptedData decryption
```

### Pattern 1: WeChat EncryptedData Decryption

**What:** Decrypt WeChat `encryptedData` using session key and IV to extract contact information.
**When to use:** Any time you receive `encryptedData` + `iv` from a WeChat mini-program API.
**Example:**

```typescript
// Source: WeChat official docs - signature/encrypt/decrypt
import { createDecipheriv } from 'crypto'

export function decryptWeChatData(
  sessionKey: string,
  iv: string,
  encryptedData: string
): Record<string, unknown> {
  const key = Buffer.from(sessionKey, 'base64')
  const ivBuffer = Buffer.from(iv, 'base64')
  const encrypted = Buffer.from(encryptedData, 'base64')

  const decipher = createDecipheriv('aes-256-cbc', key, ivBuffer)
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return JSON.parse(decrypted)
}
```

### Pattern 2: Contact Import with Deduplication

**What:** Check for existing contacts by phone number before creating new ones.
**When to use:** Import flow where duplicate prevention is required.
**Example:**

```typescript
// backend route: POST /contacts/import-from-phone
fastify.post('/contacts/import-from-phone', { preHandler: [requireAuth] }, async (request, reply) => {
  const { userId } = request as AuthenticatedRequest
  const { encryptedData, iv } = request.body as { encryptedData: string; iv: string }

  // 1. Decrypt
  const sessionKey = await getSessionKey(userId) // from WeChat login session
  const contactInfo = decryptWeChatData(sessionKey, iv, encryptedData)

  // 2. Map to Contact fields
  const { name, phoneNumber } = contactInfo

  // 3. Deduplicate by phone number
  const existing = await prisma.contact.findFirst({
    where: { userId, phone: phoneNumber }
  })

  if (existing) {
    return { success: true, data: existing, duplicate: true }
  }

  // 4. Create new contact
  const contact = await prisma.contact.create({
    data: {
      userId,
      name,
      phone: phoneNumber,
      source: 'phone-import',
      tags: [],
    }
  })

  return { success: true, data: contact, duplicate: false }
})
```

### Pattern 3: Tag Input with Presets + Free Text

**What:** Display preset tags as selectable chips + provide text input for custom tags.
**When to use:** Tag selection UI that allows both predefined and user-defined tags.
**Example:**

```vue
<!-- frontend/src/components/tag-input.vue -->
<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  presetTags?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const presetTags = props.presetTags ?? ['工作', '朋友', '家人', '同事', '客户']
const customInput = ref('')

function togglePreset(tag: string) {
  const tags = [...props.modelValue]
  const idx = tags.indexOf(tag)
  if (idx >= 0) tags.splice(idx, 1)
  else tags.push(tag)
  emit('update:modelValue', tags)
}

function addCustomTag() {
  const tag = customInput.value.trim()
  if (!tag || props.modelValue.includes(tag)) {
    customInput.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, tag])
  customInput.value = ''
}
</script>

<template>
  <view class="tag-input">
    <!-- Preset tags -->
    <view class="preset-tags">
      <view
        v-for="tag in presetTags"
        :key="tag"
        :class="['tag-chip', modelValue.includes(tag) ? 'selected' : '']"
        @click="togglePreset(tag)"
      >
        {{ tag }}
      </view>
    </view>

    <!-- Custom tag input -->
    <view class="custom-input-row">
      <input
        class="custom-input"
        v-model="customInput"
        placeholder="输入自定义标签"
        @confirm="addCustomTag"
        @blur="addCustomTag"
      />
    </view>

    <!-- Selected tags display -->
    <view v-if="modelValue.length > 0" class="selected-tags">
      <view v-for="tag in modelValue" :key="tag" class="selected-tag">
        {{ tag }}
        <text class="tag-remove" @click="togglePreset(tag)">×</text>
      </view>
    </view>
  </view>
</template>
```

### Anti-Patterns to Avoid

- **Storing plaintext phone numbers without dedup check:** Always check for existing contacts by phone before creating to prevent duplicates.
- **Client-side decryption of WeChat data:** Never decrypt `encryptedData` on the frontend — session keys must stay on the backend.
- **Mutating props directly in tag-input:** Use `v-model` emit pattern for proper Vue 3 reactivity.
- **Using `splice` on modelValue directly:** The `togglePreset` pattern above creates a new array copy before emitting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WeChat encryptedData decryption | Custom AES implementation | Node.js `crypto.createDecipheriv('aes-256-cbc', ...)` | WeChat uses a specific AES-256-CBC scheme with PKCS#7 padding — hand-rolling is error-prone |
| Contact deduplication | Frontend duplicate check | Backend `findFirst({ where: { userId, phone } })` before create | Race conditions, concurrent imports, data integrity must be enforced server-side |
| Tag chips UI | Custom CSS from scratch | uni-app `view` + `text` with flexbox (no extra dependency) | Simple enough to not need a library, but use consistent styling with existing project patterns |

## Common Pitfalls

### Pitfall 1: wx.chooseContact Requires Backend Decryption

**What goes wrong:** Developers expect `wx.chooseContact` to return contact data directly (name, phone), but it returns `encryptedData` + `iv` that must be decrypted server-side.
**Why it happens:** WeChat changed privacy policies — contact data is now encrypted at the API level.
**How to avoid:** Always send `encryptedData` + `iv` to backend, decrypt using stored session key from the WeChat login flow.
**Warning signs:** `res.encryptedData` and `res.iv` present in callback but no readable name/phone fields.

### Pitfall 2: Session Key Expiry

**What goes wrong:** The WeChat session key used for decryption expires after a period or after `wx.login` is called again.
**Why it happens:** WeChat session keys have a limited lifetime and are refreshed on each `wx.login`.
**How to avoid:** Store session key server-side associated with userId, refresh on each login, handle decryption failures gracefully by re-authenticating the user.
**Warning signs:** Decryption fails with "bad decrypt" errors for users who logged in a while ago.

### Pitfall 3: Duplicate Contacts from Repeated Import

**What goes wrong:** User imports the same phone contact twice, creating two records.
**Why it happens:** No deduplication logic or client-side only check that misses race conditions.
**How to avoid:** Backend deduplication by exact phone number match before creating. Return `{ duplicate: true }` to frontend for UX handling.
**Warning signs:** Same person appears multiple times in contact list after import.

### Pitfall 4: Tag Input Loses Focus / Double-Add on Blur

**What goes wrong:** In uni-app, `@blur` fires when the soft keyboard dismisses, which can trigger tag creation unintentionally.
**Why it happens:** `@blur` and `@confirm` can both fire in quick succession on mobile.
**How to avoid:** Use `@confirm` as primary trigger, only use `@blur` with a guard (check if input is non-empty and not already added). Consider using a visible "+" button instead of auto-add on blur.
**Warning signs:** Empty tags or duplicate tags appearing when user interacts with keyboard.

### Pitfall 5: iOS Contact Picker Permission Denied

**What goes wrong:** On iOS, `wx.chooseContact` may fail silently or return limited data due to Apple's contact privacy restrictions.
**Why it happens:** Apple requires explicit system-level Contacts permission which mini-programs cannot request directly.
**How to avoid:** Handle the fail callback gracefully, show user-friendly message, provide manual entry as fallback.
**Warning signs:** `wx.chooseContact` fail callback with `errMsg: "chooseContact:fail permission denied"`.

## Code Examples

### wx.chooseContact Call (Frontend)

```typescript
// frontend/src/pages/contacts/import-phone.vue
function importContact() {
  uni.chooseContact({
    success(res) {
      // res contains: encryptedData, iv
      uni.showLoading({ title: '导入中...' })

      // Send to backend for decryption and creation
      importContactFromPhone(res.encryptedData, res.iv)
        .then(result => {
          uni.hideLoading()
          if (result.duplicate) {
            uni.showModal({
              title: '提示',
              content: '该联系人已存在',
              showCancel: false
            })
          } else {
            uni.showToast({ title: '导入成功', icon: 'success' })
            uni.navigateBack()
          }
        })
        .catch(() => {
          uni.hideLoading()
          uni.showToast({ title: '导入失败', icon: 'none' })
        })
    },
    fail(err) {
      if (err.errMsg?.includes('permission')) {
        uni.showToast({ title: '需要通讯录权限', icon: 'none' })
      }
    }
  })
}
```

### WeChat Decryption Utility (Backend)

```typescript
// backend/src/lib/wechat-crypto.ts
import { createDecipheriv } from 'crypto'

export function decryptWeChatContact(
  sessionKey: string,
  iv: string,
  encryptedData: string
): { name: string; phoneNumber: string } {
  const key = Buffer.from(sessionKey, 'base64')
  const ivBuffer = Buffer.from(iv, 'base64')
  const encrypted = Buffer.from(encryptedData, 'base64')

  const decipher = createDecipheriv('aes-256-cbc', key, ivBuffer)
  decipher.setAutoPadding(true)

  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  const parsed = JSON.parse(decrypted)

  return {
    name: parsed.name || parsed.displayName || '未知',
    phoneNumber: parsed.phoneNumber || parsed.phone || '',
  }
}
```

### Phone Number Deduplication (Backend)

```typescript
// In the import route, before creating:
const existing = await prisma.contact.findFirst({
  where: {
    userId,
    phone: phoneNumber, // exact match on phone number
  },
})

if (existing) {
  // Return existing instead of creating duplicate
  return reply.send({ success: true, data: existing, duplicate: true })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wx.chooseContact returns plain text | Returns encryptedData requiring backend decryption | WeChat privacy policy updates (2022+) | Must implement backend decryption endpoint |
| VCF batch import | Individual selection (wx.chooseContact) | User decision D-01 for this phase | Simpler UX, one-at-a-time import |
| Tags as separate DB table | Tags as String[] array on Contact model | Schema design decision | Simpler, no join needed for small tag sets |

**Deprecated/outdated:**
- `wx.getUserInfo` for user profile: Replaced by `wx.getUserProfile` (also being deprecated). Use `wx.login` + code2Session for auth.
- Storing session key in localStorage: Session key must be stored server-side only. Client storage is a security risk.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `wx.chooseContact` returns `encryptedData` + `iv` requiring backend decryption | Pitfall 1, Code Examples | MEDIUM: If API returns plain data on some platforms, the decryption flow would break. Must verify on real device. |
| A2 | WeChat session key is stored server-side from the Phase 02 auth flow | Pitfall 2, Code Examples | MEDIUM: If session key is not stored, decryption endpoint needs a different auth mechanism. |
| A3 | `wx.chooseContact` is still functional (not fully deprecated) in current WeChat version | Core Stack | HIGH: If fully deprecated, need alternative approach (manual entry only). |
| A4 | Contact phone number from decrypted data maps directly to `Contact.phone` field | Code Examples | LOW: May need normalization (strip country code, spaces) before storage. |

## Open Questions

1. **Does the Phase 02 auth flow store the WeChat session key server-side?**
   - What we know: Phase 02 implemented `wx.login` + code2Session JWT auth
   - What's unclear: Whether the session key from code2Session is persisted in the backend for later use
   - Recommendation: Check `backend/src/routes/` auth files. If not stored, add session key persistence or use `getPhoneNumber` button flow instead.

2. **Phone number normalization strategy**
   - What we know: Contacts may have different phone formats (+86, spaces, dashes)
   - What's unclear: How to normalize for deduplication (strip country code? remove spaces?)
   - Recommendation: Store phone as-is for display, create a normalized version for dedup comparison (strip non-digits, remove leading country code). Can add a `phoneNormalized` column later if needed.

3. **iOS vs Android behavior for wx.chooseContact**
   - What we know: iOS has stricter contact privacy; may return limited data
   - What's unclear: Exact return format differences between platforms
   - Recommendation: Test on both platforms during implementation. Add platform-specific error handling if needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `crypto` (built-in) | WeChat decryption | ✓ | Bundled with Node.js | — |
| PostgreSQL | Contact storage/dedup | ✓ (existing) | — | — |
| WeChat DevTools | Testing wx.chooseContact | [ASSUMED] | — | Test on real device only (DevTools may not support contact picker) |
| Real WeChat device (iOS + Android) | Testing wx.chooseContact | [ASSUMED] | — | Cannot test encryptedData flow in DevTools |

**Missing dependencies with no fallback:**
- Real WeChat device required for `wx.chooseContact` testing — DevTools do not support this API fully. This must be flagged for human testing during the verification phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework detected in project |
| Config file | none — see Wave 0 |
| Quick run command | `npm test` (not configured) |
| Full suite command | `npm test` (not configured) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONTACT-04 | User can import contact from phone | manual | Real device test | ❌ Wave 0 |
| CONTACT-04 | Duplicate phone prevents double creation | unit | `npx vitest tests/contacts-dedup.test.ts` | ❌ Wave 0 |
| CONTACT-03 | User can create custom tags | unit | `npx vitest tests/tag-input.test.ts` | ❌ Wave 0 |
| CONTACT-03 | Preset tags are selectable | unit | `npx vitest tests/tag-input.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] No test framework configured — need Vitest/Jest setup
- [ ] `backend/src/lib/wechat-crypto.ts` — unit tests for decryption
- [ ] `frontend/src/components/tag-input.vue` — component tests
- [ ] `backend/src/routes/contacts.ts` — integration test for import-from-phone endpoint
- [ ] Deduplication logic — unit test for exact phone match

### Sampling Rate
- **Per task commit:** Manual verification on device for wx.chooseContact flow
- **Per wave merge:** Full test suite (once framework is set up in Wave 0)
- **Phase gate:** Backend unit tests should pass before merge

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWT middleware (requireAuth) |
| V3 Session Management | yes | WeChat session key storage (server-side only) |
| V4 Access Control | yes | userId isolation on all queries |
| V5 Input Validation | yes | Fastify schema validation on POST body |
| V6 Cryptography | yes | AES-256-CBC for WeChat data decryption |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session key exposure | Information Disclosure | Store session key server-side only, never send to client |
| Phone number duplication (malicious) | Tampering | Backend dedup check + unique index on (userId, phone) |
| EncryptedData tampering | Tampering | Decryption will fail with wrong IV/session key — validate JSON parse |
| Contact data in logs | Information Disclosure | Never log encryptedData, sessionKey, or decrypted phone numbers |

## Sources

### Primary (MEDIUM confidence)
- WeChat Mini Program Documentation - wx.chooseContact API (search results, unable to fetch directly)
- uni-app Documentation - chooseContact/choosePhoneContact (search results, unable to fetch directly)
- Codebase: `backend/src/routes/contacts.ts` - existing CRUD routes
- Codebase: `frontend/src/api/contacts.ts` - API type definitions and functions
- Codebase: `backend/prisma/schema.prisma` - Contact model with tags String[]

### Secondary (MEDIUM confidence)
- WebSearch - WeChat encryptedData decryption pattern (multiple sources confirm AES-256-CBC)
- WebSearch - Contact deduplication strategies (exact phone match recommended)
- WebSearch - uni-app tag input component patterns (uView, custom Vue component)

### Tertiary (LOW confidence)
- WebSearch - wx.chooseContact deprecation status (community reports suggest it may be deprecated, unable to verify with official docs)
- WebSearch - iOS contact picker permission restrictions (general iOS privacy policy knowledge)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Unable to verify exact wx.chooseContact return fields from official docs; decryption pattern confirmed by multiple sources
- Architecture: MEDIUM - Data flow is standard for WeChat mini-programs; specific implementation details need testing
- Pitfalls: MEDIUM - Common pitfalls documented across developer community; some based on training knowledge

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days for stable WeChat API)
