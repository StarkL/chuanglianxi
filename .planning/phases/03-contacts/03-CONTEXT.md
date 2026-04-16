# Phase 03: 联系人管理 - Context

**Gathered:** 2026-04-16
**Status:** Implementation in progress — decisions captured for remaining gaps

<domain>
## Phase Boundary

实现联系人增删改查、搜索、标签分组和通讯录导入。核心功能（CRUD、详情页、搜索、标签筛选）已实现。剩余待实现：通讯录导入（CONTACT-04）、标签自定义创建。

</domain>

<decisions>
## Implementation Decisions

### 通讯录导入（CONTACT-04）
- **D-01:** 先实现逐个选择联系人导入（wx.chooseContact），不做批量导入
- **D-02:** 批量导入能力后续补充，不在本阶段完成

### 标签系统设计
- **D-03:** 保持预设标签（工作/朋友/家人/同事/客户）+ 允许用户自由输入创建自定义标签
- **D-04:** 标签输入 UI 改为：显示预设标签供选择 + 提供"添加标签"输入框

### 列表分页策略
- **D-05:** 保持一次性加载全部联系人，不分页 — 免费版 100 联系人上限，数据量可控

### 交互记录
- **D-06:** 保持现状 — POST /interactions 创建 + 联系人详情接口返回交互列表，V1 已足够
- **D-07:** 不需要独立的交互记录编辑/删除功能，不需要来源追溯字段

### 已有实现确认
- **D-08:** 联系人 CRUD 前后端完整 — list.vue, detail.vue, edit.vue + contacts.ts routes
- **D-09:** 搜索支持按姓名和公司模糊搜索（insensitive）
- **D-10:** 标签筛选使用 Postgres Array contains 查询
- **D-11:** 删除操作有确认弹窗（uni.showModal）
- **D-12:** 电话字段支持一键拨打（uni.makePhoneCall）

### Claude's Discretion
- 通讯录导入页面的具体 UI 布局
- 自定义标签输入框的交互细节（回车确认/失焦确认）
- 导入后重复联系人的去重策略

</decisions>

<canonical_refs>
## Canonical References

### 联系人管理
- `.planning/ROADMAP.md` §Phase 3 — 联系人管理阶段目标和交付物
- `.planning/REQUIREMENTS.md` §Contacts — CONTACT-01/02/03/04 需求定义

### 设计系统
- `.planning/phases/02-weixin-auth/02-UI-SPEC.md` — 颜色、间距、字体、WeChat 绿色主题规范

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/api/contacts.ts` — Contact/CContactDetail 类型定义 + 完整 CRUD API 封装
- `frontend/src/utils/request.ts` — 统一请求包装（自动附加 token、错误处理）
- `frontend/src/utils/auth.ts` — Token 工具函数
- `backend/src/middleware/auth.ts` — JWT 认证中间件
- `backend/prisma/schema.prisma` — Contact/Interaction 数据模型（已定义 userId 隔离、tags String[]）

### Established Patterns
- API 响应格式：`{ success: boolean, data?: T, error?: string }`（contacts.ts:64）
- 权限控制：所有路由使用 `preHandler: [requireAuth]`（contacts.ts:30）
- 用户隔离：所有查询基于 `userId` 过滤（contacts.ts:34）
- 前端页面路由：`uni.navigateTo({ url: '/pages/...' })` 模式
- 样式：rpx 单位响应式，WeChat 绿色 #07c160 主题色

### Integration Points
- 联系人详情页已展示交互时间线（detail.vue:133-153）
- 交互创建通过动态 import 调用 API（detail.vue:63-77）
- 路由注册在 `backend/src/routes/index.ts` 统一管理
- Prisma 模型：Contact.tags 是 String[]，Interaction.type 有 5 种枚举值

</code_context>

<specifics>
## Specific Ideas

- 用户偏好使用 WeChat 原生设计风格（来自 Phase 2 UI-SPEC）
- 标签颜色统一为 #e8f8ef 背景 + #07c160 文字
- 列表页搜索和标签筛选在同一页面顶部展示
- 删除联系人时有二次确认，提示"删除后无法恢复该联系人及其所有交互记录"

</specifics>

<deferred>
## Deferred Ideas

- 批量通讯录导入 — 后续阶段实现 VCF 导入
- 联系人关系图谱可视化 — V2 范围
- 智能联系建议 — V2 范围
- 交互记录来源追溯 — 不在 V1 实现

</deferred>

---

*Phase: 03-contacts*
*Context gathered: 2026-04-16*
