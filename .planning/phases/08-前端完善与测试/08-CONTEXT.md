# Phase 08: 前端完善与测试 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 是 V1 上线前的最后一个阶段，包含四个核心目标：
1. **H5/PC 版本适配** — 支持浏览器开发调试，减少微信开发者工具依赖
2. **UI 框架接入** — 引入 wot-design-uni，替换所有手写样式
3. **测试覆盖** — Vitest 工具函数 + Playwright E2E 核心流程
4. **小程序审核准备** — 补齐隐私政策、用户协议、tabbar 等审核硬性要求

</domain>

<decisions>
## Implementation Decisions

### H5/PC 版本适配（方案 C）
- **D-01:** 使用 uni-app H5 编译（安装 `@dcloudio/uni-h5`），添加 `dev:h5` 脚本
- **D-02:** 开发环境用 Vite proxy 代理后端 `/api` 到 `http://localhost:3000`，避免 CORS 问题
- **D-03:** 使用 `#ifdef H5` / `#ifndef H5` 条件编译处理微信专属功能（登录、通讯录导入等）
- **D-04:** H5 登录页用模拟登录按钮跳过微信授权
- **D-05:** H5 下隐藏通讯录导入功能
- **D-06:** CSS 通过媒体查询做 PC 端响应式（max-width 限制 + grid 布局）
- **D-07:** 前端请求统一使用 `/api` 前缀，小程序和 H5 一套代码

### UI 框架接入（wot-design-uni）
- **D-08:** 引入 `wot-design-uni`（Vue 3 + TS 编写，71 个组件）
- **D-09:** 用 wot-design-uni 替换当前所有手写样式（列表、表单、卡片、弹窗等）
- **D-10:** 首页导航从 emoji 改为 wot 的 grid/tabbar 组件
- **D-11:** 联系人列表页改用 `wd-cell` / `wd-list` 组件，替代自定义 item
- **D-12:** 表单页面改用 `wd-form` + `wd-input` 组件
- **D-13:** 空状态统一使用 wot 的 `wd-empty` 组件
- **D-14:** 搜索栏改用 `wd-search-bar` 组件
- **D-15:** 底部增加 tabbar 导航（联系人/提醒/我的），使用 `wd-tabbar`

### 测试策略
- **D-16:** Vitest 用于测试纯逻辑工具函数（token 处理、请求包装、类型校验）
- **D-17:** Playwright E2E 基于 H5 编译产物，在浏览器中跑端到端测试
- **D-18:** E2E 覆盖核心流程：登录 → 添加联系人 → 搜索 → 名片扫描 → 添加提醒
- **D-19:** 不单独测 Vue 组件渲染 — E2E 已覆盖

### 缺失页面补齐
- **D-20:** 新增隐私政策页面（微信审核强制要求）
- **D-21:** 新增用户协议页面（微信审核强制要求）
- **D-22:** 新增名片详情页面（名片墙卡片点击后查看完整 OCR 信息）
- **D-23:** 新增"我的"页面（设置、隐私政策、用户协议、关于、退出登录）
- **D-24:** 登录页增加隐私勾选提示（微信审核要求）

### 已有实现确认
- **D-25:** 已装 `@dcloudio/uni-ui` ^1.5.6，将被 wot-design-uni 替代
- **D-26:** 所有 12 个页面已注册在 pages.json 中
- **D-27:** 后端 CORS 配置：`origin: '*'` + `credentials: true`（H5 开发用 proxy 绕过）
- **D-28:** WeChat 绿色主题色 `#07c160` 需统一迁移到 wot 的主题配置
- **D-29:** API 响应格式：`{ success: boolean, data?: T, error?: string }` 保持不变

### Claude's Discretion
- wot-design-uni 的具体安装配置方式（easycom vs 全局注册）
- Vite proxy 路径的具体映射规则
- 隐私政策和用户协议的具体文案内容
- 各页面迁移到 wot 组件的具体顺序和优先级

</decisions>

<canonical_refs>
## Canonical References

### 前端完善与测试
- `.planning/ROADMAP.md` §Phase 8 — 前端完善与测试阶段目标和交付物
- `.planning/REQUIREMENTS.md` — 全部 V1 验证需求

### 设计系统
- `.planning/phases/02-weixin-auth/02-UI-SPEC.md` — 颜色、间距、字体、WeChat 绿色主题规范

### H5 编译
- `.planning/PROJECT.md` §Constraints — uni-app + Vue 3 + TypeScript 技术栈约束

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/api/contacts.ts` — Contact/CContactDetail 类型定义 + 完整 CRUD API 封装
- `frontend/src/api/auth.ts` — 登录/登出 API
- `frontend/src/api/interactions.ts` — 交互记录 API
- `frontend/src/api/ocr.ts` — OCR 相关 API
- `frontend/src/api/reminders.ts` — 提醒 API
- `frontend/src/utils/request.ts` — 统一请求包装（自动附加 token、错误处理）
- `frontend/src/utils/auth.ts` — Token 工具函数

### Established Patterns
- API 响应格式：`{ success: boolean, data?: T, error?: string }`
- 权限控制：所有路由使用 `preHandler: [requireAuth]`
- 前端页面路由：`uni.navigateTo({ url: '/pages/...' })` 模式
- 样式：rpx 单位响应式，WeChat 绿色 #07c160 主题色
- 12 个页面全部在 pages.json 注册

### Integration Points
- 首页（index.vue）有 4 个导航卡片：联系人、提醒、扫描名片、名片墙
- 名片墙（ocr/cards/cards.vue）已有卡片但无详情页
- 路由注册在 `pages.json` 统一管理
- 后端 CORS 在 `backend/src/config/cors.ts` 配置

</code_context>

<specifics>
## Specific Ideas

- 用户希望尽量在浏览器（H5）调试，减少微信开发者工具依赖
- 所有页面样式统一为微信原生风格（wot-design-uni 风格接近微信原生）
- 隐私政策和用户协议需要清晰易读（类似微信公众号文章风格）
- 登录页增加隐私勾选（"我已阅读并同意《隐私政策》和《用户协议》"）
- 底部 tabbar 建议：联系人 / 提醒 / 我的（3 个 tab）

</specifics>

<deferred>
## Deferred Ideas

- 批量通讯录导入 — 后续阶段实现 VCF 导入
- 联系人关系图谱可视化 — V2 范围
- 智能联系建议 — V2 范围
- 语音笔记自动转录 — V2 范围

</deferred>

---

*Phase: 08-前端完善与测试*
*Context gathered: 2026-04-21*
