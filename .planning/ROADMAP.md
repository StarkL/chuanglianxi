# 常联系 (ChangLianXi) — Roadmap

**Phases:** 7 | **Requirements mapped:** 23 | All V1 requirements covered

---

## Phase 1: 项目基础设施

**Goal:** 搭建前后端项目脚手架，配置开发环境，初始化数据库

**Requirements:** None (foundation)

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — 初始化 monorepo 工作区，搭建前端 uni-app 和后端 Fastify 脚手架
- [x] 01-02-PLAN.md — 配置 Prisma 数据库 schema、Redis 连接、共享类型、Docker 服务、项目文档

**Success Criteria:**
1. 前端 uni-app + Vue 3 + TypeScript 项目可正常启动
2. 后端 Node.js + TypeScript + Fastify 项目可正常启动
3. PostgreSQL 数据库连接成功，核心表创建成功
4. Redis 缓存服务可正常连接
5. 项目文档完整（README、架构文档、API 文档模板）

**Deliverables:**
- 前端项目脚手架
- 后端项目脚手架
- 数据库迁移脚本
- 项目架构文档

---

## Phase 2: 微信认证系统

**Goal:** 实现微信小程序一键登录和会话管理

**Requirements:** AUTH-01, AUTH-02

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — 后端认证基础：Prisma 客户端、微信 code2Session、JWT 生成/验证 (jose)
- [x] 02-02-PLAN.md — 认证 API 端点：wechat-login、verify、logout + 认证中间件
- [x] 02-03-PLAN.md — 前端认证基础：Token 工具、API 请求包装、类型定义
- [x] 02-04-PLAN.md — 登录页面 UI：微信绿色主题、登录流程、错误状态
- [x] 02-05-PLAN.md — 前端认证守卫：App onLaunch 校验、登出流程、页面守卫

**Success Criteria:**
1. 用户可以点击"微信登录"按钮完成授权
2. 登录后自动创建用户记录（open_id、昵称、头像）
3. 用户退出后可清除本地会话
4. 未登录用户访问时自动跳转登录页

**Deliverables:**
- 微信登录 API 端点
- 会话管理中间件
- 登录页面 UI
- 用户表实现

---

## Phase 3: 联系人管理

**Goal:** 实现联系人增删改查、搜索、标签分组和通讯录导入

**Requirements:** CONTACT-01, CONTACT-02, CONTACT-03, CONTACT-04, SEARCH-01, SEARCH-02, SEARCH-03

**Plans:** 2 plans (gap closure for remaining features)

Plans:
- [x] 03-01-PLAN.md — Phone contacts import: wx.chooseContact + backend AES decryption + deduplication + import page (CONTACT-04)
- [x] 03-02-PLAN.md — Custom tag input component (preset + free-text) integrated into edit page (CONTACT-03)

**Success Criteria:**
1. 用户可以创建、编辑、删除联系人
2. 联系人详情页展示完整信息和交互时间线
3. 用户可以按标签筛选联系人
4. 用户可以一键导入手机通讯录
5. 用户可以按姓名、公司、标签搜索联系人

**Deliverables:**
- 联系人 API 端点
- 联系人列表页、详情页、编辑页
- 搜索功能
- 标签系统
- 通讯录导入功能

---

## Phase 4: 名片 OCR

**Goal:** 实现拍照识别名片、AI 补全信息和名片墙

**Requirements:** OCR-01, OCR-02, OCR-03, CARD-WALL-01

**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Backend OCR integration: Baidu OCR + Qwen AI + route wiring + tests (OCR-01, OCR-02, OCR-03)
- [x] 04-02-PLAN.md — Frontend scan flow: image upload, scan page, editable result form (OCR-01)
- [x] 04-03-PLAN.md — Card wall page: 2-column waterfall layout + home page nav (CARD-WALL-01)

**Success Criteria:**
1. 用户拍照后自动识别名片信息
2. AI 自动补全缺失信息（公司官网、职位推断）
3. 免费版用户每天最多使用 10 次
4. 名片墙以网格形式展示所有名片

**Deliverables:**
- 名片 OCR API 端点
- OCR 服务集成（百度 OCR 或微信 OCR）
- AI 信息补全服务
- 名片扫描页面
- 名片墙页面

---

## Phase 5: 交互记录

**Goal:** 实现手动记录交互和交互时间线展示

**Requirements:** INTERACTION-01, INTERACTION-02, INTERACTION-03

**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — Backend interaction CRUD: PUT + DELETE endpoints with ownership verification
- [x] 05-02-PLAN.md — Frontend add page with type selector, timeline long-press edit/delete, navigation integration

**Success Criteria:**
1. 用户可以为联系人添加交互记录（时间、方式、内容摘要）
2. 交互记录支持类型分类（手动笔记、通话、会议等）
3. 交互记录按时间线展示在联系人详情页

**Deliverables:**
- 交互记录 API 端点
- 添加交互记录页面
- 交互时间线展示（联系人详情页内）

---

## Phase 6: 提醒系统

**Goal:** 实现关系提醒和农历生日提醒

**Requirements:** REMINDER-01, REMINDER-02, LUNAR-01, LUNAR-02

**Plans:** 6 plans

Plans:
- [x] 06-01-PLAN.md through 06-06-PLAN.md — Reminder system backend and frontend implementation

**Success Criteria:**
1. 系统基于最后联系时间和联系频率推送关系提醒
2. 提醒通过微信服务通知推送给用户
3. 用户可以设置联系人的农历生日
4. 系统在农历生日到期前推送提醒

**Deliverables:**
- 提醒 API 端点
- 定时任务调度器
- 微信服务通知集成
- 农历生日设置页面

---

## Phase 7: 前端完善与测试

**Goal:** UI 优化、测试编写、小程序审核准备

**Requirements:** AUTH-01, AUTH-02, CONTACT-01, CONTACT-02, CONTACT-03, OCR-01, OCR-02, INTERACTION-01, INTERACTION-02, INTERACTION-03, REMINDER-01, SEARCH-01, SEARCH-02, SEARCH-03, CARD-WALL-01

**Plans:** 5 plans

Plans:
- [x] 08-01-PLAN.md — H5 compilation, wot-design-uni install, Vite proxy, theme config, easycom setup
- [ ] 08-02-PLAN.md — Missing pages: "我的", card detail, privacy policy, user agreement, login privacy checkbox
- [ ] 08-03-PLAN.md — UI migration: replace hand-written CSS with wot-design-uni components across all pages
- [ ] 08-04-PLAN.md — Native tabBar configuration, home page navigation update, emoji removal
- [ ] 08-05-PLAN.md — Vitest unit tests + Playwright E2E tests for core user flows

**Success Criteria:**
1. 所有页面 UI 完整、一致、美观
2. 单元测试覆盖率 >= 80%
3. E2E 测试覆盖核心用户流程
4. 小程序通过微信审核
5. 用户隐私政策、用户协议等合规文档齐全

**Deliverables:**
- UI 优化和修复
- 单元测试
- E2E 测试
- 合规文档
- 小程序提交审核

---

*Last updated: 2026-04-21 after Phase 08 planning*

---

## Backlog

### Phase 999.1: Follow-up — Phase 01 incomplete plans (BACKLOG)

**Goal:** Resolve plans that ran without producing summaries during Phase 01 execution
**Source phase:** 01-infrastructure
**Deferred at:** 2026-04-16 during /gsd-next advancement to Phase 03
**Plans:**
6/6 plans complete

### Phase 999.2: Follow-up — Phase 02 incomplete plans (BACKLOG)

**Goal:** Resolve plans that ran without producing summaries during Phase 02 execution
**Source phase:** 02-weixin-auth
**Deferred at:** 2026-04-16 during /gsd-next advancement to Phase 03
**Plans:**
- [ ] 02-02: auth-api (ran, no SUMMARY.md)
- [ ] 02-03: frontend-auth (ran, no SUMMARY.md)
- [ ] 02-04: login-ui (ran, no SUMMARY.md)
- [ ] 02-05: auth-guard (ran, no SUMMARY.md)

### Phase 999.3: Follow-up — Phase 05 incomplete plans (BACKLOG)

**Goal:** Resolve plans that ran without producing summaries during Phase 05 execution
**Source phase:** 05-interactions
**Deferred at:** 2026-04-18 during /gsd-next advancement to Phase 06
**Plans:**
- [ ] 05-01: backend-interaction-crud (ran, no SUMMARY.md)
- [ ] 02: frontend-interaction-ui (ran, no SUMMARY.md)
