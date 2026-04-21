# Phase 08: 前端完善与测试 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 08-前端完善与测试
**Areas discussed:** 缺失页面, H5/PC 版本, 测试策略, UI 框架, 小程序审核

---

## 缺失页面

| Option | Description | Selected |
|--------|-------------|----------|
| 补齐合规页面（隐私政策、用户协议） | 微信审核强制要求 | ✓ |
| 补齐名片详情页 | 名片墙卡片点击无处可去 | ✓ |
| 补齐设置/关于页面 | 用户管理账号、通知偏好 | ✓ |
| 以上全部补齐 | 所有缺失页面一起补齐 | ✓ (最终选择) |

**User's choice:** 以上全部补齐

---

## H5/PC 版本

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 C — uni-app H5 + 条件编译 | 一套代码，条件编译处理微信专属功能 | ✓ |
| 方案 A — uni-app H5 + 只做小程序功能降级 | 仅处理兼容问题 | |
| 方案 B — 独立 Web 版本 | 维护两套代码 | |
| 先不急着定，继续聊其他 | 暂不决定 | |

**User's choice:** 方案 C — uni-app H5 + 条件编译（推荐，一套代码）

**Notes:** 开发环境用 Vite proxy 代理 `/api` 到后端，彻底绕过 CORS 问题。

---

## 测试策略

| Option | Description | Selected |
|--------|-------------|----------|
| A + B — Vitest 测逻辑 + Playwright E2E | 组合方案，最全面 | ✓ |
| 只做 E2E，不做单元测试 | uni-app 单元测试投入产出比低 | |
| 先不测，上线前再补 | 推迟 | |
| 继续聊 UI 优化方向 | 暂不决定 | |

**User's choice:** A + B — Vitest 测逻辑 + Playwright E2E（推荐）

---

## UI 框架

| Option | Description | Selected |
|--------|-------------|----------|
| wot-design-uni — TS 原生、组件最全 | 71 个组件，Vue 3 + TS 编写，京东出品 | ✓ |
| uv-ui — 社区最大、最成熟 | uView 系，Stars 最高 | |
| 继续用已有的 uni-ui | 不更换 | |
| 继续聊小程序审核准备 | 暂不决定 | |

**User's choice:** wot-design-uni — TS 原生、组件最全（推荐）

**Notes:** 需要替换当前所有手写样式，包括 emoji 导航改为 grid/tabbar 组件。

---

## 小程序审核

| Option | Description | Selected |
|--------|-------------|----------|
| 确定 — 补齐审核要求的所有项目 | 隐私政策、用户协议、tabbar、隐私勾选 | ✓ |
| 只写隐私政策和用户协议 | 部分补齐 | |
| 讨论完毕，创建 CONTEXT.md | 跳过 | |

**User's choice:** 确定 — 补齐审核要求的所有项目

---

## Claude's Discretion

- wot-design-uni 的具体安装配置方式（easycom vs 全局注册）
- Vite proxy 路径的具体映射规则
- 隐私政策和用户协议的具体文案内容
- 各页面迁移到 wot 组件的具体顺序和优先级

## Deferred Ideas

- 批量通讯录导入 — 后续阶段实现 VCF 导入
- 联系人关系图谱可视化 — V2 范围
- 智能联系建议 — V2 范围
- 语音笔记自动转录 — V2 范围
