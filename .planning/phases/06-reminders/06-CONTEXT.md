# Phase 06: 提醒系统 - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

实现关系提醒和农历生日提醒。核心功能：内置定时任务调度器、微信订阅消息推送、联系人编辑页增加生日字段、系统自动计算 + 手动添加自定义提醒。

</domain>

<decisions>
## Implementation Decisions

### 提醒调度方案
- **D-01:** 使用 node-schedule 内置调度器，每 15 分钟检查一次到期提醒
- **D-02:** 服务器启动时初始化调度器，服务重启后重新加载待发送提醒

### 通知推送方式
- **D-03:** 使用微信订阅消息，需要用户提前授权
- **D-04:** V1 只做订阅消息，不做小程序内消息中心

### 农历生日设置
- **D-05:** 在联系人编辑页增加生日字段（公历/农历）
- **D-06:** 设置生日后自动创建对应的提醒记录
- **D-07:** 需要农历转公历的计算库（lunar-javascript 或类似）

### 提醒规则设计
- **D-08:** 系统基于最后联系时间和交互频率自动计算基础提醒
- **D-09:** 用户可手动添加自定义提醒（时间、内容）
- **D-10:** 关系提醒规则：30/60/90 天未联系分级提醒

### 已有实现确认
- **D-11:** Reminder 模型已存在（userId, contactId, type, message, scheduledAt, sentAt, recurrenceRule）
- **D-12:** 交互记录已存在，可计算最后联系时间

### Claude's Discretion
- node-schedule 的具体调度策略和容错机制
- 微信订阅消息的模板 ID 申请流程
- 农历/公历转换的具体实现库选择
- 关系提醒的具体算法（频率计算阈值）

</decisions>

<canonical_refs>
## Canonical References

### 提醒系统
- `.planning/ROADMAP.md` §Phase 6 — 提醒系统阶段目标和交付物
- `.planning/REQUIREMENTS.md` §Reminders — REMINDER-01/02 需求定义
- `.planning/REQUIREMENTS.md` §Lunar Calendar — LUNAR-01/02 需求定义

### 设计系统
- `.planning/phases/02-weixin-auth/02-UI-SPEC.md` — 颜色、间距、字体规范

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/prisma/schema.prisma` — Reminder 模型（type, message, scheduledAt, sentAt, recurrenceRule）
- `backend/src/routes/interactions.ts` — 交互记录 API（用于计算最后联系时间）
- `backend/src/lib/wechat.ts` — 微信 API 封装（可扩展订阅消息）

### Established Patterns
- API 响应格式：`{ success: boolean, data?: T, error?: string }`
- 权限控制：所有路由使用 `preHandler: [requireAuth]`
- 服务启动模式：Fastify 服务器通过 app.listen() 启动

### Integration Points
- 定时任务在服务器启动时注册
- 提醒记录通过 contactId 关联联系人
- 微信订阅消息需要小程序端授权

</code_context>

<specifics>
## Specific Ideas

- 用户偏好使用 WeChat 原生设计风格
- 关系提醒：30/60/90 天未联系分级提醒
- 农历生日设置后自动创建提醒
- 微信订阅消息推送

</specifics>

<deferred>
## Deferred Ideas

- 小程序内消息中心 — V2 范围
- 用户自定义提醒频率 — V2 范围
- 智能联系建议 — V2 范围
- 语音笔记自动转录 — V2 范围

</deferred>

---

*Phase: 06-reminders*
*Context gathered: 2026-04-16*
