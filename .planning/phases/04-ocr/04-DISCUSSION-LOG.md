# Phase 04: 名片 OCR - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 04-ocr
**Areas discussed:** OCR 服务选型, AI 信息补全方案, 名片扫描流程, 名片墙 UI 设计

---

## OCR 服务选型

| Option | Description | Selected |
|--------|-------------|----------|
| 百度 OCR | API 成熟稳定、按次计费（~0.0035元/次）、名片识别准确率高、文档完善 | ✓ |
| 微信 OCR | 免费但功能有限、需小程序权限、名片识别精度不如百度 | |
| 腾讯云 OCR | 与微信生态集成好、按量计费、但名片识别不是强项 | |

**User's choice:** 百度 OCR
**Notes:** API 成熟稳定，名片识别准确率高

## AI 信息补全方案

| Option | Description | Selected |
|--------|-------------|----------|
| 通义千问 Qwen | 国内合规、API 简单（REST）、按 token 计费（便宜）、中文能力强 | ✓ |
| 智谱 GLM | 中文理解好、支持联网搜索（可查公司官网）、按 token 计费 | |
| V1 不做 AI 补全 | V1 只做基础 OCR 识别，AI 补全留到后续阶段 | |

**User's choice:** 通义千问 Qwen
**Notes:** 国内合规、REST API 简单、按 token 计费便宜

## 名片扫描流程

| Option | Description | Selected |
|--------|-------------|----------|
| 拍照 → 识别 → 编辑 → 保存 | 拍照 → 上传识别 → 展示可编辑表单 → 用户确认后保存 | ✓ |
| 拍照后直接保存 | 拍照后直接创建联系人（无确认），后续可编辑 | |
| 拍照存入名片墙 | 先拍照存入名片墙，后续再决定是否创建联系人 | |

**User's choice:** 拍照 → 识别 → 编辑 → 保存
**Notes:** 用户希望在保存前可以编辑 OCR 结果，避免错误

## 名片墙 UI 设计

| Option | Description | Selected |
|--------|-------------|----------|
| 2 列瀑布流网格 | 2 列网格，显示公司名+人名+日期，点击可创建联系人 | ✓ |
| 单列列表 | 单列列表，类似联系人列表的样式 | |
| 横向滑动卡片 | 横向滑动卡片，一次显示一张名片的详细信息 | |

**User's choice:** 2 列瀑布流网格
**Notes:** 网格布局更适合名片墙的视觉呈现

## Claude's Discretion

- 百度 OCR SDK 的具体集成方式（npm 包 vs HTTP 调用）
- 通义千问 API 的 prompt 设计
- 名片图片的存储方式（本地存储 vs 对象存储）
- 名片墙卡片的具体样式细节

## Deferred Ideas

- 批量名片导入 — 后续阶段实现
- 名片名片夹/分组 — V2 范围
- 名片分享功能 — V2 范围
- 名片自动关联已有联系人 — V1 不做自动关联，用户手动确认
