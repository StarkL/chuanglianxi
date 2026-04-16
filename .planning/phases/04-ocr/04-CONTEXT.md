# Phase 04: 名片 OCR - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

实现拍照识别名片、AI 补全信息和名片墙。核心功能：OCR 服务集成（百度 OCR）、AI 信息补全（通义千问）、名片扫描页面、名片墙页面。

</domain>

<decisions>
## Implementation Decisions

### OCR 服务选型
- **D-01:** 使用百度 OCR 进行名片识别（API 成熟、按次计费 ~0.0035元/次、名片识别准确率高）
- **D-02:** 后端集成百度 OCR SDK，前端通过 uni.chooseImage 获取图片后上传到后端

### AI 信息补全方案
- **D-03:** 使用通义千问 Qwen 进行 AI 信息补全（国内合规、REST API、按 token 计费便宜、中文能力强）
- **D-04:** AI 补全范围：公司官网查询、职位推断、缺失字段补全

### 名片扫描流程
- **D-05:** 拍照 → 上传识别 → 展示可编辑表单 → 用户确认后保存为联系人
- **D-06:** 拍照使用 uni.chooseImage（不是 camera 组件），简化实现
- **D-07:** 识别过程中显示 loading 状态
- **D-08:** 识别结果以表单形式展示，用户可手动修改后保存

### 名片墙 UI 设计
- **D-09:** 2 列瀑布流网格布局
- **D-10:** 每张名片卡片显示：公司名 + 人名 + 识别日期
- **D-11:** 点击卡片可查看名片详情并创建联系人
- **D-12:** 空状态提示"暂无名片"

### 已有实现确认
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

</decisions>

<canonical_refs>
## Canonical References

### OCR 识别
- `.planning/ROADMAP.md` §Phase 4 — 名片 OCR 阶段目标和交付物
- `.planning/REQUIREMENTS.md` §OCR — OCR-01/02/03 需求定义
- `.planning/REQUIREMENTS.md` §Card Wall — CARD-WALL-01 需求定义

### AI 补全
- `.planning/PROJECT.md` §Constraints — 国内大模型（通义千问/智谱 GLM）约束

### 设计系统
- `.planning/phases/02-weixin-auth/02-UI-SPEC.md` — 颜色、间距、字体规范

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/routes/ocr.ts` — OCR 路由框架（含订阅限制、使用统计、名片列表）
- `backend/prisma/schema.prisma` — BusinessCard 模型（imageUrl, ocrData JSON）
- `frontend/src/api/contacts.ts` — Contact 类型定义 + createContact API
- `frontend/src/pages/contacts/edit/edit.vue` — 联系人编辑表单（可复用表单样式）

### Established Patterns
- API 响应格式：`{ success: boolean, data?: T, error?: string }`
- 权限控制：所有路由使用 `preHandler: [requireAuth]`
- 前端页面路由：`uni.navigateTo({ url: '/pages/...' })` 模式
- 样式：rpx 单位响应式，WeChat 绿色 #07c160 主题色

### Integration Points
- OCR 识别后需要调用 createContact API 创建联系人
- 名片墙页面需要新的路由和页面文件
- 需要在 pages.json 中注册新页面

</code_context>

<specifics>
## Specific Ideas

- 用户偏好使用 WeChat 原生设计风格（来自 Phase 2 UI-SPEC）
- 名片识别后允许用户编辑再保存，避免 OCR 错误导致数据不准确
- 名片墙作为独立页面，不是联系人列表的子页面

</specifics>

<deferred>
## Deferred Ideas

- 批量名片导入 — 后续阶段实现
- 名片名片夹/分组 — V2 范围
- 名片分享功能 — V2 范围
- 名片自动关联已有联系人 — V1 不做自动关联，用户手动确认

</deferred>

---

*Phase: 04-ocr*
*Context gathered: 2026-04-16*
