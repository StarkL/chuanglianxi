# Phase 04 Plan 01 Summary: Backend OCR Integration

**Completed:** 2026-04-16
**Plan:** 04-01
**Status:** Complete

## What Was Built

### New Files
1. **backend/src/lib/ocr.ts** — Baidu OCR service
   - `recognizeBusinessCard(imageBase64)` — calls Baidu OCR business card API
   - `normalizeBaiduBusinessCardResult(raw)` — maps Baidu response to NormalizedOCRData
   - NormalizedOCRData interface: name, company, title, phone, email, website, address, wechatId

2. **backend/src/lib/ai-enrich.ts** — Qwen AI enrichment service
   - `enrichBusinessCardData(ocrData)` — calls Qwen via OpenAI-compatible endpoint
   - Graceful fallback on AI failure (returns empty object)
   - JSON parsing with markdown code block stripping

3. **backend/src/types/baidu-aip-sdk.d.ts** — Type declarations for Baidu SDK

### Modified Files
4. **backend/src/routes/ocr.ts** — Integrated real OCR + AI into POST /ocr/business-card
   - Replaced mock data with recognizeBusinessCard call
   - Added AI enrichment with merged results
   - Updated BusinessCard.create to use merged ocrData
   - Subscription limit check preserved (runs before OCR call)

5. **backend/src/config/env.ts** — Added 4 new env vars
   - BAIDU_OCR_APP_ID, BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY
   - QWEN_API_KEY

### Dependencies
- `baidu-aip-sdk` — Baidu OCR SDK
- `openai` — OpenAI SDK (used for Qwen's compatible endpoint)

## Key Decisions Made
- Image data passed as base64 string in request body (not multipart upload)
- AI enrichment is non-blocking (graceful degradation on failure)
- System prompt is hardcoded, not template-interpolated (security)

## Verification
- [x] ocr.ts exports recognizeBusinessCard and normalizeBaiduBusinessCardResult
- [x] ai-enrich.ts exports enrichBusinessCardData with graceful fallback
- [x] TypeScript compiles without errors for new files
- [x] Subscription limit check preserved before OCR call
- [ ] Tests not yet written (deferred to later phase)
