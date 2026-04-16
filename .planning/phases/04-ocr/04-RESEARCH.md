# Phase 04: 名片 OCR - Research

**Researched:** 2026-04-16
**Domain:** OCR integration, AI text enrichment, uni-app image upload, image storage
**Confidence:** MEDIUM

## Summary

This phase implements business card OCR scanning, AI-powered information enrichment, and a business card wall display. The user flow is: take a photo -> upload to backend -> Baidu OCR extracts text -> Qwen AI enriches data -> user reviews in editable form -> saves as contact.

**Primary recommendation:** Use `baidu-aip-sdk` (HTTP-based, no external binaries) for OCR and the `openai` SDK (pointed at Qwen's OpenAI-compatible endpoint) for AI enrichment. For image storage, use local filesystem with `@fastify/multipart` for V1, deferring cloud storage until scale demands it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Photo capture (uni.chooseImage) | Browser / Client | -- | WeChat mini-program native camera API |
| Image upload to backend | Browser / Client | API / Backend | uni.uploadFile (multipart) -> @fastify/multipart |
| Baidu OCR API call | API / Backend | -- | Server-side only (API keys must not leak) |
| Qwen AI enrichment | API / Backend | -- | Server-side only (API keys must not leak) |
| OCR result edit form | Browser / Client | -- | Frontend editable form, reuses existing pattern |
| Save as contact | Browser / Client | API / Backend | Calls existing createContact API |
| Business card wall grid | Browser / Client | -- | Frontend 2-column waterfall layout |
| Subscription limit check | API / Backend | -- | Existing logic in ocr.ts |
| BusinessCard persistence | Database / Storage | -- | Existing Prisma model |

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 使用百度 OCR 进行名片识别（API 成熟、按次计费 ~0.0035元/次、名片识别准确率高）
- **D-02:** 后端集成百度 OCR SDK，前端通过 uni.chooseImage 获取图片后上传到后端
- **D-03:** 使用通义千问 Qwen 进行 AI 信息补全（国内合规、REST API、按 token 计费便宜、中文能力强）
- **D-04:** AI 补全范围：公司官网查询、职位推断、缺失字段补全
- **D-05:** 拍照 → 上传识别 → 展示可编辑表单 → 用户确认后保存为联系人
- **D-06:** 拍照使用 uni.chooseImage（不是 camera 组件），简化实现
- **D-07:** 识别过程中显示 loading 状态
- **D-08:** 识别结果以表单形式展示，用户可手动修改后保存
- **D-09:** 2 列瀑布流网格布局
- **D-10:** 每张名片卡片显示：公司名 + 人名 + 识别日期
- **D-11:** 点击卡片可查看名片详情并创建联系人
- **D-12:** 空状态提示"暂无名片"
- **D-13:** POST /ocr/business-card 路由已存在（含订阅限制逻辑）
- **D-14:** GET /ocr/usage 接口已存在（每日使用统计）
- **D-15:** GET /business-cards 接口已存在（名片列表）
- **D-16:** BusinessCard 模型已定义（imageUrl, ocrData JSON）
- **D-17:** 免费版每日 10 次 OCR 限制已实现

### Claude's Discretion
- 百度 OCR SDK 的具体集成方式（npm 包 vs HTTP 调用）
- 通义千问 API 的 prompt 设计
- 名片图片的存储方式（本地存储 vs 对象存储）
- 名片墙卡片的具体样式细节

### Deferred Ideas (OUT OF SCOPE)
- 批量名片导入 — 后续阶段实现
- 名片名片夹/分组 — V2 范围
- 名片分享功能 — V2 范围
- 名片自动关联已有联系人 — V1 不做自动关联，用户手动确认

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `baidu-aip-sdk` | 4.16.16 | 百度 OCR 名片识别 | 百度官方 Node.js SDK，内置 `AipOcr` 类，直接调用名片识别 API [VERIFIED: npm registry] |
| `openai` | 6.34.0 | 调用通义千问 Qwen API | Qwen 提供 OpenAI 兼容接口，`openai` SDK 可直接使用，无需额外适配 [VERIFIED: npm registry + CITED: Alibaba Cloud docs] |
| `@fastify/multipart` | 10.0.0 | 接收前端上传的图片和 multipart 数据 | Fastify 官方 multipart 插件，处理 `uni.uploadFile` 发送的图片 [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dashscope` | 1.0.1 | 通义千问原生 SDK 调用 | 如果 OpenAI 兼容模式不可用，作为备选方案（依赖 `node-fetch`，功能较少）[VERIFIED: npm registry] |
| `@baiducloud/qianfan` | 0.2.4 | 百度千帆大模型 SDK | 后续如果需要接入百度 AI 大模型时使用，本次不涉及 [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `baidu-aip-sdk` | 直接 HTTP 调用 `aip.baidubce.com` REST API | HTTP 调用无依赖但需要手动管理 access_token 刷新；SDK 已封装但依赖已废弃的 `request` 包 [ASSUMED] |
| `openai` SDK for Qwen | `dashscope` 原生 SDK | `openai` SDK 更成熟、TypeScript 支持更好；`dashscope` v1.0.1 功能较少但 API 更直接 [VERIFIED: npm registry] |
| 本地文件系统存储 | 阿里云 OSS / 腾讯云 COS | V1 阶段本地够用；对象存储需额外密钥和配置，推后到 V2 [ASSUMED] |

**Installation:**
```bash
# Backend
cd backend
npm install baidu-aip-sdk openai @fastify/multipart
```

**Version verification:**
| Package | Verified Version | Date |
|---------|-----------------|------|
| `baidu-aip-sdk` | 4.16.16 | [ASSUMED - npm registry] |
| `openai` | 6.34.0 | [VERIFIED: npm registry] |
| `@fastify/multipart` | 10.0.0 | [VERIFIED: npm registry] |
| `dashscope` | 1.0.1 | [VERIFIED: npm registry] |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────┐
│  WeChat Mini-   │
│  Program (uni-  │
│  app)           │
│                 │
│  1. uni.        │
│     chooseImage │
│     (take photo)│
│                 │
│  2. uni.        │
│     uploadFile  │──────────────────────────────────┐
│     (multipart) │                                  │
│                 │                                  ▼
└─────────────────┘                    ┌──────────────────────────┐
                                       │  Backend (Fastify)       │
                                       │                          │
                                       │  3. @fastify/multipart   │
                                       │     receives image       │
                                       │                          │
                                       │  4. Save image to        │
                                       │     local filesystem     │
                                       │     uploads/cards/       │
                                       │                          │
                                       │  5. baidu-aip-sdk        │
                                       │     AipOcr.businessCard()│
                                       │     -> extract fields    │
                                       │                          │
                                       │  6. openai SDK -> Qwen   │
                                       │     enrich missing data  │
                                       │     (company URL, etc)   │
                                       │                          │
                                       │  7. Save to PostgreSQL   │
                                       │     BusinessCard table   │
                                       │                          │
                                       │  8. Return OCR result    │
                                       │     to frontend          │
                                       └────────────┬─────────────┘
                                                    │
                                                    ▼
┌─────────────────┐                    ┌──────────────────────────┐
│  WeChat Mini-   │◄───────────────────│  9. Frontend shows       │
│  Program        │                    │     editable form with   │
│                 │                    │     extracted fields     │
│  10. User edits │                    │                          │
│     & confirms  │                    └──────────────────────────┘
│                 │
│  11. createContact
│     API call    │───────────────────► Existing contacts API
└─────────────────┘

┌─────────────────┐
│  Card Wall Page │──► GET /business-cards ──► 2-column waterfall grid
│  (new page)     │     Each card: company + name + date
└─────────────────┘
```

### Recommended Project Structure
```
backend/
├── src/
│   ├── lib/
│   │   ├── ocr.ts              # NEW: Baidu OCR client wrapper
│   │   └── ai-enrich.ts        # NEW: Qwen AI enrichment logic
│   ├── routes/
│   │   └── ocr.ts              # EXISTING: modify to use real OCR
│   └── config/
│       └── env.ts              # EXISTING: add BAIDU_* and QWEN_* env vars
│
frontend/
├── src/
│   ├── api/
│   │   └── ocr.ts              # NEW: OCR API client functions
│   ├── pages/
│   │   ├── ocr/
│   │   │   ├── scan/
│   │   │   │   └── scan.vue    # NEW: photo capture + upload + loading
│   │   │   ├── result/
│   │   │   │   └── result.vue  # NEW: editable form before saving
│   │   │   └── wall/
│   │   │       └── wall.vue    # NEW: 2-column waterfall card wall
│   │   └── ocr-detail/
│   │       └── detail.vue      # NEW: single card detail view
│   └── components/
│       └── card-preview.vue    # NEW: reusable card image preview
```

### Pattern: Baidu OCR Integration
**What:** Use `baidu-aip-sdk` to call Baidu's business card OCR API
**When to use:** Every time a user uploads a business card image
**Example:**
```typescript
// Source: [ASSUMED - baidu-aip-sdk official documentation pattern]
import { AipOcrClient } from 'baidu-aip-sdk'

const OCR_APP_ID = process.env.BAIDU_OCR_APP_ID!
const OCR_API_KEY = process.env.BAIDU_OCR_API_KEY!
const OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY!

const ocrClient = new AipOcrClient(OCR_APP_ID, OCR_API_KEY, OCR_SECRET_KEY)

export async function recognizeBusinessCard(imageBuffer: Buffer) {
  const result = await ocrClient.businessCard(imageBuffer.toString('base64'), {
    recognize_granularity: 'big', // 返回粗粒度结果
  })

  if (result.error_code) {
    throw new Error(`Baidu OCR failed: ${result.error_msg}`)
  }

  return parseBaiduBusinessCardResult(result)
}
```

### Pattern: Qwen AI Enrichment via OpenAI SDK
**What:** Use the `openai` SDK with Qwen's OpenAI-compatible endpoint to enrich OCR data
**When to use:** After Baidu OCR returns raw data, fill in missing fields
**Example:**
```typescript
// Source: [CITED: Alibaba Cloud Model Studio docs - OpenAI compatible mode]
// Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
// Auth: Bearer token using DASHSCOPE_API_KEY
import OpenAI from 'openai'

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY!,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

export async function enrichBusinessCardData(ocrResult: Record<string, string>) {
  const systemPrompt = `你是一个专业的名片信息补全助手。请根据以下OCR识别的名片信息，补全可能缺失的信息：
1. 如果缺少公司官网，尝试根据公司名称推断（不要编造URL，如果不确定就返回null）
2. 根据职位信息推断可能的部门
3. 检查并修正可能的OCR识别错误
4. 只返回JSON格式，不要额外解释

返回格式：
{
  "company": "公司名称（如有修正）",
  "title": "职位（如有修正）",
  "department": "部门（如可推断）",
  "website": "公司官网（如可推断，否则null）",
  "confidence": 0.0-1.0
}`

  const response = await qwen.chat.completions.create({
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(ocrResult) },
    ],
    temperature: 0.1, // Low temperature for factual enrichment
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) return null

  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}
```

### Pattern: Image Upload from uni-app
**What:** Use `uni.uploadFile` to send image to Fastify backend with multipart
**When to use:** After `uni.chooseImage` returns the local file path
**Example:**
```typescript
// Source: [ASSUMED - uni-app official API documentation pattern]
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function uploadBusinessCardImage(tempFilePath: string): Promise<string> {
  const token = uni.getStorageSync('token')

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}/ocr/upload`,
      filePath: tempFilePath,
      name: 'image',
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.success) {
          resolve(data.data.imageUrl)
        } else {
          reject(new Error(data.error))
        }
      },
      fail: (err) => reject(err),
    })
  })
}
```

### Anti-Patterns to Avoid
- **Sending base64 image in JSON body**: Baidu OCR expects base64, but the image should arrive at the backend as multipart upload, then converted to base64 server-side. Don't force the frontend to base64-encode.
- **Skipping AI enrichment on OCR errors**: If Baidu OCR returns empty/poor results, still show the editable form (with empty fields) rather than failing entirely.
- **Blocking UI during OCR**: Show a loading overlay with progress indication. OCR can take 2-5 seconds.
- **Hardcoding OCR result as contact**: Always show the editable form first. OCR is imperfect and users must confirm before creating a contact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Business card OCR | Custom CV/text extraction | Baidu OCR `businessCard` API | Baidu has trained models for Chinese/English business cards with 95%+ accuracy [ASSUMED] |
| AI text enrichment | Rule-based field inference | Qwen LLM via OpenAI SDK | LLM can handle ambiguous OCR output, infer context, and validate data |
| Multipart file upload | Manual form boundary parsing | `@fastify/multipart` | HTTP multipart parsing is complex, edge cases with encodings and file types |
| Image storage routing | Direct database BLOB storage | Local filesystem + DB path reference | Storing images in DB bloats storage; filesystem + path is simpler and scales better for V1 |
| Waterfall grid layout | Manual CSS grid calculations | uni-app flex/columns + CSS | 2-column waterfall is achievable with CSS columns; no need for JS layout engines |

**Key insight:** The entire value of this phase is in the integration, not building OCR or AI from scratch. The existing backend routes handle the business logic (subscription limits, saving records); the new work is calling external APIs and building the UI.

## Runtime State Inventory

> Not applicable — this is a greenfield feature phase, not a rename/refactor/migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by schema review (BusinessCard table exists but empty for new users) | None |
| Live service config | None — Baidu OCR and Qwen API keys need to be added to .env | Add BAIDU_OCR_APP_ID, BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY, QWEN_API_KEY to .env |
| OS-registered state | None | None |
| Secrets/env vars | 4 new secrets required | Human must obtain and add to .env and SOPS |
| Build artifacts | None | None |

## Common Pitfalls

### Pitfall 1: Baidu OCR Access Token Expiration
**What goes wrong:** Baidu OCR API requires an access_token that expires in 30 days. Using a stale token causes all OCR calls to fail with 401.
**Why it happens:** The `baidu-aip-sdk` `AipOcrClient` manages token automatically (fetches and caches). But if the SDK version is old or network issues prevent token refresh, calls fail.
**How to avoid:** Rely on SDK's automatic token management. Add error handling to catch token-related errors and log them for debugging. If using HTTP calls directly, implement token refresh logic with 25-day expiry buffer.
**Warning signs:** Sudden "access token expired" errors across all OCR calls after ~30 days of operation.

### Pitfall 2: Baidu OCR `request` Dependency Deprecation
**What goes wrong:** `baidu-aip-sdk` 4.16.16 depends on `request@^2.88.2`, which is deprecated and unmaintained since 2020. This may cause security audit warnings.
**Why it happens:** The SDK has not been updated to use modern HTTP clients.
**How to avoid:** Accept the deprecation warning for V1. The `request` package is in the dependency tree but not directly exposed. If security scanning flags it, file an issue or consider direct HTTP calls to Baidu API as alternative.
**Warning signs:** `npm audit` warnings about deprecated `request` package.

### Pitfall 3: Image Size Limits
**What goes wrong:** Baidu OCR API has limits: image must be <= 4MB, and base64-encoded string must be properly formatted. Large images from modern phone cameras may exceed this.
**Why it happens:** `uni.chooseImage` can return high-resolution images by default.
**How to avoid:** Use `uni.chooseImage` with `sizeType: ['compressed']` to get compressed images. Alternatively, compress on the backend before sending to Baidu.
**Warning signs:** Baidu API returning error code 216101 (image size too large).

### Pitfall 4: Qwen JSON Parsing Failures
**What goes wrong:** Qwen may return JSON with markdown formatting (```json ... ```), invalid JSON, or extra text, causing `JSON.parse()` to fail.
**Why it happens:** LLMs sometimes add formatting or explanations despite `json_object` response format.
**How to avoid:** Use `response_format: { type: 'json_object' }` (supported by qwen-plus). Add a regex extraction fallback to strip markdown code blocks. Handle parse failures gracefully — fall back to raw OCR data.
**Warning signs:** AI enrichment silently failing, users see only raw OCR data with no enrichment.

### Pitfall 5: uni.uploadFile vs uni.request Confusion
**What goes wrong:** The existing `request.ts` utility uses `uni.request`, which cannot send multipart/form-data file uploads. Using it to upload images will silently fail.
**Why it happens:** Developers assume the existing request utility handles all HTTP calls.
**How to avoid:** Create a separate `uni.uploadFile` wrapper for image uploads. The OCR image upload path is different from JSON API calls.
**Warning signs:** Backend receiving empty or corrupt image data.

### Pitfall 6: BusinessCard ocrData JSON Schema Drift
**What goes wrong:** The `ocrData` JSON field has no schema enforcement. Different OCR/AI responses produce different shapes, making the card wall display inconsistent.
**Why it happens:** Baidu OCR returns `words_result` array, Qwen returns a custom JSON object.
**How to avoid:** Define a TypeScript interface for the normalized ocrData shape. Write a normalization function that converts Baidu OCR + Qwen output into a consistent format before saving.
**Warning signs:** Card wall showing "undefined" for fields, inconsistent display across cards.

## Code Examples

Verified patterns from official sources:

### Normalizing Baidu OCR Business Card Result
```typescript
// Source: [ASSUMED - Baidu OCR business_card API response format]
interface BaiduBusinessCardRaw {
  words_result: Array<{
    key: string    // e.g., "姓名", "公司", "职位", "电话", "邮箱", "网址", "地址"
    value: string
  }>
  words_result_num: number
  log_id: number
}

interface NormalizedOCRData {
  name: string
  company: string
  title: string
  phone: string
  email: string
  website: string | null
  address: string | null
  wechatId: string | null
}

export function normalizeBaiduOCRResult(raw: BaiduBusinessCardRaw): NormalizedOCRData {
  const map = new Map<string, string>()
  for (const item of raw.words_result) {
    map.set(item.key, item.value)
  }

  return {
    name: map.get('姓名') || '',
    company: map.get('公司') || '',
    title: map.get('职位') || '',
    phone: map.get('电话') || '',
    email: map.get('邮箱') || '',
    website: map.get('网址') || null,
    address: map.get('地址') || null,
    wechatId: null, // Baidu OCR does not extract WeChat ID
  }
}
```

### Frontend: OCR Scan Page Flow
```vue
<!-- Source: [Pattern based on existing edit.vue form structure] -->
<script setup lang="ts">
import { ref } from 'vue'
import { recognizeBusinessCard } from '../../api/ocr.js'

const scanning = ref(false)

async function handleTakePhoto() {
  const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: resolve,
      fail: reject,
    })
  })

  scanning.value = true
  try {
    const result = await recognizeBusinessCard(res.tempFilePaths[0])
    if (result.success && result.data) {
      // Navigate to result page with OCR data
      const params = encodeURIComponent(JSON.stringify(result.data.ocr))
      uni.navigateTo({
        url: `/pages/ocr/result/result?data=${params}&cardId=${result.data.cardId}`,
      })
    }
  } catch {
    uni.showToast({ title: '识别失败', icon: 'none' })
  } finally {
    scanning.value = false
  }
}
</script>

<template>
  <view class="scan-page">
    <view v-if="scanning" class="loading-overlay">
      <view class="spinner" />
      <text class="loading-text">正在识别名片...</text>
    </view>
    <view v-else class="camera-section">
      <button class="camera-btn" @click="handleTakePhoto">
        拍摄名片
      </button>
      <text class="tip">请将名片置于取景框内，保持光线充足</text>
    </view>
  </view>
</template>
```

### Backend: Image Upload Route
```typescript
// Source: [Pattern using @fastify/multipart with existing ocr.ts structure]
import type { FastifyInstance } from 'fastify'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { pipeline } from 'node:stream/promises'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'cards')
mkdirSync(UPLOAD_DIR, { recursive: true })

export async function registerUploadRoute(fastify: FastifyInstance) {
  fastify.post('/ocr/upload', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedRequest
    const file = await request.file()

    if (!file) {
      return reply.code(400).send({ success: false, error: '未上传图片' })
    }

    // Generate unique filename
    const ext = file.mimetype.split('/')[1] || 'jpg'
    const filename = `${userId}-${Date.now()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    await pipeline(file.file, createWriteStream(filepath))

    const imageUrl = `/api/ocr/uploads/cards/${filename}`

    return {
      success: true,
      data: { imageUrl },
    }
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Baidu OCR v1 (deprecated) | Baidu OCR v3 (current API) | 2023+ | Higher accuracy for Chinese business cards |
| Baidu OCR SDK manual token management | SDK auto-manages access_token | SDK v3+ | Less error-prone, no 30-day manual refresh |
| Custom LLM API wrapper | OpenAI-compatible endpoint | Qwen supports OpenAI format since 2024 | Use standard `openai` SDK, no custom HTTP client |
| Image as base64 in JSON body | Multipart upload with @fastify/multipart | Best practice | Better memory usage, no base64 overhead |
| CSS grid for card layout | CSS columns / waterfall | 2024+ | True 2-column waterfall, not rigid grid |

**Deprecated/outdated:**
- `baidu-aip-sdk` uses `request@^2.88.2` (deprecated since 2020): Accept for V1, flag for future upgrade
- Baidu OCR old v1 API: Ensure using current v3 endpoints (SDK handles this automatically)
- WeChat OCR API: Available only in WeChat official mini-programs with specific qualifications; Baidu OCR is the correct choice for this project [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `baidu-aip-sdk` `AipOcrClient.businessCard()` method exists and accepts base64 image | Standard Stack / Code Examples | MEDIUM — need to verify API method name; may be `businessCard()` or similar. Planner should verify in plan. |
| A2 | Baidu OCR business card response uses `words_result` array with `key`/`value` pairs | Code Examples | MEDIUM — exact response shape may differ; normalization function may need adjustment |
| A3 | Qwen OpenAI-compatible base URL is `https://dashscope.aliyuncs.com/compatible-mode/v1` | Architecture Patterns | LOW — widely documented; verify during implementation |
| A4 | Qwen `qwen-plus` model supports `response_format: { type: 'json_object' }` | Architecture Patterns | MEDIUM — if not supported, need to parse JSON from text response manually |
| A5 | `uni.uploadFile` sends multipart/form-data that `@fastify/multipart` can parse | Architecture Patterns | LOW — standard HTTP behavior |
| A6 | Baidu OCR API image size limit is 4MB | Common Pitfalls | LOW — if different, adjust compression accordingly |
| A7 | Local filesystem storage is sufficient for V1 image storage | Alternatives Considered | MEDIUM — if WeChat mini-program deployment requires CDN-hosted images, this assumption breaks |
| A8 | WeChat mini-program can load local server images via relative URL during development | Architecture Patterns | LOW — dev environment behavior; production will need proper image URLs |

## Open Questions

1. **Baidu OCR exact method name in `baidu-aip-sdk`**
   - What we know: SDK has `AipOcr` class with OCR methods
   - What's unclear: Whether the business card method is `businessCard()`, `business_card()`, or another name
   - Recommendation: Planner should include a task to verify SDK API by reading `node_modules/baidu-aip-sdk/src/AipOcr.js` or testing locally

2. **WeChat mini-program image URL loading in production**
   - What we know: Development can use localhost server URLs
   - What's unclear: WeChat mini-programs require HTTPS and whitelisted domains for image loading. Local filesystem paths won't work in production.
   - Recommendation: V1 should plan for this — either use a dev server with HTTPS tunnel (ngrok), or accept that production needs cloud storage. This is a planning risk.

3. **Qwen model selection for cost optimization**
   - What we know: `qwen-plus` is a good balance of capability and cost
   - What's unclear: Whether `qwen-turbo` (cheaper) is sufficient for business card enrichment, or if `qwen-plus` is needed
   - Recommendation: Start with `qwen-plus` for accuracy; measure token usage and consider `qwen-turbo` if costs are significant

4. **Baidu OCR API pricing verification**
   - What we know: CONTEXT.md states ~0.0035元/次
   - What's unclear: Current pricing, free tier availability, and whether business card OCR is included in the standard OCR package
   - Recommendation: Planner should flag this for human to verify on Baidu AI Cloud console

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2 (existing) |
| Config file | backend/vitest config (inherited from package.json) |
| Quick run command | `cd backend && npm test` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OCR-01 | 拍照识别名片，自动创建联系人档案 | Integration | `vitest run tests/ocr.test.ts -t "recognizes business card"` | ❌ Wave 0 |
| OCR-02 | AI 自动补全名片信息（公司官网、职位推断） | Integration | `vitest run tests/ocr.test.ts -t "AI enrichment"` | ❌ Wave 0 |
| OCR-03 | 免费版每天限制 10 次 OCR | Unit | `vitest run tests/ocr.test.ts -t "daily limit"` | ❌ existing in ocr.ts logic |
| CARD-WALL-01 | 网格形式查看已录入的名片 | Integration | `vitest run tests/ocr.test.ts -t "business cards list"` | ❌ existing GET /business-cards |

### Sampling Rate
- **Per task commit:** `cd backend && npm test`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/ocr.test.ts` — covers OCR-01, OCR-02, OCR-03, CARD-WALL-01
- [ ] Mock Baidu OCR API responses for testing
- [ ] Mock Qwen API responses for testing
- [ ] Test image upload handling with @fastify/multipart

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `requireAuth` middleware |
| V4 Access Control | yes | User-scoped queries (userId filter on all BusinessCard operations) |
| V5 Input Validation | yes | Zod validation for OCR request/response schemas |
| V6 Cryptography | yes | API keys stored in env vars, never in code or responses |

### Known Threat Patterns for Baidu OCR + Qwen Integration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage | Information Disclosure | Store in env vars only; never return keys in API responses |
| Malicious file upload | Tampering | Validate MIME type and file extension; limit to image/* only |
| Oversized image (DoS) | Denial of Service | Enforce 4MB max file size on backend; use `@fastify/multipart` limits |
| OCR result injection | Tampering | Sanitize OCR output before rendering in frontend; no raw HTML rendering |
| AI prompt injection | Tampering | System prompt is hardcoded; user data is JSON-serialized, not template-interpolated |
| Subscription bypass | Elevation of Privilege | Existing limit check runs BEFORE OCR call; not trustable from frontend |

## Sources

### Primary (HIGH confidence)
- npm registry: `baidu-aip-sdk@4.16.16`, `openai@6.34.0`, `@fastify/multipart@10.0.0`, `dashscope@1.0.1` — package metadata verified
- npm registry: `dashscope` README — chat API usage pattern confirmed via `npm view dashscope readme`
- npm registry: `baidu-aip-sdk` README — SDK structure and `AipOcr` class confirmed via `npm view baidu-aip-sdk readme`
- Existing project codebase: `backend/src/routes/ocr.ts`, `backend/prisma/schema.prisma`, `frontend/src/utils/request.ts` — patterns and types verified

### Secondary (MEDIUM confidence)
- Alibaba Cloud Model Studio docs: Qwen OpenAI-compatible endpoint — base URL and authentication pattern widely documented [ASSUMED - training data, not verified via tool]
- Baidu AI Cloud OCR docs: Business card API parameters and response format [ASSUMED - training data, Chinese domains blocked WebFetch]
- uni-app official docs: `uni.chooseImage`, `uni.uploadFile` API [ASSUMED - training data, widely used pattern]

### Tertiary (LOW confidence)
- Baidu OCR pricing ~0.0035元/次 [CITED: CONTEXT.md D-01 — from user discussion, not verified against current pricing page]
- Baidu OCR 4MB image size limit [ASSUMED — common limit for OCR APIs, needs verification]
- WeChat mini-program image loading restrictions [ASSUMED — standard WeChat domain whitelist requirement]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — `baidu-aip-sdk` and `openai` SDK verified on npm, but exact API usage patterns are from training data (Chinese documentation domains inaccessible for WebFetch verification)
- Architecture: MEDIUM — system design follows established patterns in the codebase; OpenAI-compatible Qwen endpoint is well-documented but not verified via tool
- Pitfalls: MEDIUM — most pitfalls are based on known characteristics of the libraries and APIs; image size limits and token expiration are educated inferences

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — OCR APIs are stable; Qwen models may change)
