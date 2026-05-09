# 常联系 (ChangLianXi)

## What This Is

一个简单、便宜、AI 原生的个人 CRM 微信小程序，专注于"记住你见过谁、聊了什么、该什么时候联系"。通过微信登录、名片 OCR、AI 智能识别和关系提醒，让用户零手动录入即可维护重要人脉。

## Core Value

让每个人都能轻松维护重要人脉，不让任何一段关系自然流失。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **AUTH-01**: 用户可以通过微信一键授权登录
- [ ] **CONTACT-01**: 用户可以增删改查联系人（姓名、公司、职位、电话、微信、邮箱、头像、来源）
- [ ] **OCR-01**: 用户可以拍照识别名片，自动创建联系人档案
- [ ] **INTERACTION-01**: 用户可以手动记录与联系人的交互（时间、方式、内容摘要）
- [ ] **REMINDER-01]: 系统基于最后联系时间和自定义联系频率推送关系提醒
- [ ] **TAG-01]: 用户可以按标签给联系人分组（工作/朋友/家人等）
- [ ] **IMPORT-01]: 用户可以一键导入手机通讯录
- [ ] **SEARCH-01]: 用户可以按姓名/公司/标签搜索联系人
- [ ] **AI-01]: 名片智能识别 — OCR + AI 补全信息（公司官网、职位推断）
- [ ] **AI-02]: 基础关系提醒 — 基于最后联系时间的智能提醒（不是简单倒计时）
- [ ] **LUNAR-01]: 支持农历生日，自动提醒
- [ ] **CARD-WALL-01**: 名片墙 — 查看所有已录入的名片

### Out of Scope

- 语音笔记（V2 范围）— 增加 V1 复杂度和成本
- 关系健康评分（V2 范围）— 需要足够的交互数据
- 微信聊天记录分析（V2 范围）— 涉及复杂 AI 处理
- 自然语言查询（V3 范围）— 高级 AI 功能
- 会前情报生成（V3 范围）— 高级 AI 功能
- 付费订阅功能 — 永久免费，不开设付费版
- 邮件/日历/LinkedIn 集成 — 微信生态优先，其他后续考虑
- 交易管道/邮件营销 — 这不是商业 CRM，只做关系维护

## Context

- **技术栈**: uni-app + Vue 3 + TypeScript（前端），Node.js + Fastify/Express + TypeScript（后端），SQLite（嵌入式数据库，零运维）
- **目标市场**: 中国市场优先，微信生态深度集成
- **用户群体**: 商务人士、自由职业者、职场新人到中层管理者（25-40 岁）
- **商业模式**: 免费 + 增值订阅（¥15/月或 ¥99/年）
- **已有文档**: docs/规划/常联系产品规划文档.md（完整产品规划）
- **已有调研**: docs/调研/（市场竞品分析报告 4 份）

## Constraints

- **Tech stack**: uni-app + Node.js + TypeScript + PostgreSQL — 前后端统一语言，开发效率高
- **Platform**: 微信小程序优先（开发成本低、无需下载、天然微信生态）
- **Compliance**: 用户数据存储在境内服务器（符合《个人信息保护法》）
- **AI**: 国内大模型（通义千问/智谱 GLM），合规好、成本低、中文能力强
- **微信聊天处理**: 手动转发 + AI 提取 — 合规优先，用户完全可控

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 微信生态优先 | 最大差异化，用户获取成本低 | ✓ Good |
| uni-app 跨平台 | 一次开发多端发布，国内生态最成熟 | ✓ Good |
| Node.js + TypeScript | 前后端统一语言 | ✓ Good |
| PostgreSQL | JSON 支持好，AI 向量扩展成熟 | ✓ Good |
| SQLite | 内存占用极低（~5MB），零运维，适合轻量部署 | ✓ Good (Phase 11) |
| 手动转发聊天 | 合规优先，避免微信接口政策风险 | — Pending |
| 分三阶段交付 AI | V1 轻量、V2 增强、V3 深度 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-16 after initialization*
