# Phase 08: 前端完善与测试 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 08 是 V1 上线前的最后一个阶段，包含四个核心目标：
1. **现有页面交互优化** — 表单验证、搜索防抖、名片墙跳转、我的页面完善
2. **缺失页面补齐** — 隐私政策、用户协议、名片详情页
3. **H5/PC 版本适配** — 浏览器开发调试支持
4. **测试覆盖** — Vitest + Playwright 核心流程

</domain>

<decisions>
## Implementation Decisions

### 表单验证
- **D-01:** 提交时校验为主，不做实时校验（小程序输入法体验不佳）
- **D-02:** 手机号增加格式校验（正则 `^1[3-9]\d{9}$`），不合法时阻止提交
- **D-03:** 姓名为必填，提交时校验非空

### 搜索体验
- **D-04:** 搜索输入添加 500ms 防抖，避免频繁后端查询
- **D-05:** 搜索加载时显示 `wd-loading` 微状态
- **D-06:** 不做搜索结果高亮（数据量不大，复杂度不划算）

### 名片详情
- **D-07:** 创建 `pages/card-detail/card-detail.vue`
- **D-08:** 展示：姓名、公司/职位、电话、邮箱、识别时间
- **D-09:** 底部按钮：「保存为联系人」+「删除名片」
- **D-10:** 名片墙卡片添加 `@click` 跳转，传递 `cardId` 参数

### "我的"页面
- **D-11:** 添加 wd-cell-group 列表：隐私政策、用户协议、关于常联系（v0.1.0）、退出登录
- **D-12:** 版本号从 package.json 读取

### 隐私合规页面
- **D-13:** 创建 `pages/privacy/privacy.vue` 和 `pages/agreement/agreement.vue`
- **D-14:** 登录页添加隐私勾选框，未勾选时登录按钮 disabled
- **D-15:** 政策文字为可点击链接，跳转到对应页面

### 技术决策
- **D-16:** `wd-status-tip` 作为空状态组件（`wd-empty` 不存在）
- **D-17:** `wd-search` 作为搜索组件（`wd-search-bar` 不存在）
- **D-18:** H5 模式 `dev-token-h5` 绕过 JWT 验证（仅开发使用）

### Claude's Discretion
- 隐私政策和用户协议的具体文案内容（需要标准中文模板）
- 名片详情页的视觉排版细节（字段布局、间距）
- 搜索防抖的具体延迟时间（500ms 为建议值）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI 组件规范
- `.planning/phases/02-weixin-auth/02-UI-SPEC.md` — 颜色、间距、字体、WeChat 绿色主题规范
- `frontend/src/pages.json` — easycom 配置、页面注册、tabBar 配置

### 已有代码
- `frontend/src/api/contacts.ts` — Contact/CContactDetail 类型 + CRUD API
- `frontend/src/api/ocr.ts` — OCR 相关 API
- `frontend/src/utils/auth.ts` — Token 工具函数
- `frontend/src/utils/request.ts` — 统一请求包装

### 验证报告
- `.planning/phases/08-前端完善与测试/08-VERIFICATION.md` — 5 个待修复缺口

### 阶段总结
- `.planning/phases/08-前端完善与测试/08-01-SUMMARY.md` — H5 编译、wot-design-uni、Vite proxy
- `.planning/phases/08-前端完善与测试/08-02-SUMMARY.md` — 页面迁移到 wot 组件
- `.planning/phases/08-前端完善与测试/08-03-SUMMARY.md` — 更多页面迁移
- `.planning/phases/08-前端完善与测试/08-04-SUMMARY.md` — TabBar、导航、mine 页面
- `.planning/phases/08-前端完善与测试/08-05-SUMMARY.md` — 测试基础设施

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `wot-design-uni` (102 components) — wd-search, wd-status-tip, wd-cell-group, wd-form, wd-input, wd-button 等已在使用
- `frontend/src/utils/auth.ts` — Token 工具（setToken, getToken, getUserInfo, clearSession）
- `frontend/src/utils/request.ts` — 请求包装（自动附加 token、401 处理）
- `frontend/src/api/contacts.ts` — 完整 CRUD API
- `frontend/src/api/ocr.ts` — OCR API

### Established Patterns
- API 响应格式：`{ success: boolean, data?: T, error?: string }`
- 页面导航：`uni.navigateTo` (非 tabBar) / `uni.switchTab` (tabBar)
- 条件编译：`#ifdef H5` / `#ifdef MP-WEIXIN`
- 列表刷新：`onShow` 生命周期（tabBar 页面返回时触发）
- 错误提示：`uni.showToast({ title, icon: 'none' })`

### Integration Points
- `pages.json` — 所有页面需在此注册
- `App.vue` — wd-config-provider 主题包装 + onLaunch 鉴权
- TabBar 配置 — 3 个 tab：联系人/提醒/我的

</code_context>

<specifics>
## Specific Ideas

- 搜索防抖使用 `setTimeout` + `clearTimeout` 实现，不引入额外依赖
- 手机号校验正则：`^1[3-9]\d{9}$`（中国手机号格式）
- 版本号：v0.1.0（首次发布）
- 隐私政策和用户协议需要标准中文模板（类似微信小程序默认文案）

</specifics>

<deferred>
## Deferred Ideas

- 列表左滑快捷删除操作 — 未来优化
- 搜索结果高亮 — 数据量增长后再做
- 首页更多快捷入口（统计、最近联系人等） — 核心功能稳定后再加
- 表单实时校验 — 当前提交时校验足够
- 名片 OCR 使用次数统计 — 去掉免费限制后暂不需要

</deferred>

---

*Phase: 08-前端完善与测试*
*Context gathered: 2026-04-23*
