# Phase 03: 联系人管理 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 03-contacts
**Areas discussed:** 通讯录导入实现, 标签系统设计, 列表分页策略, 交互记录补全

---

## 通讯录导入实现

| Option | Description | Selected |
|--------|-------------|----------|
| 逐个选择联系人导入 | 微信小程序只支持 wx.chooseContact（逐个选择），适合 V1 快速实现 | ✓ |
| 上传 VCF 文件批量导入 | 需要用户导出 VCF 文件后上传，适合批量但增加操作步骤 | |
| 先做逐个选择，后续补批量 | 先做逐个选择导入，后续再补充批量能力 | |

**User's choice:** 先做逐个选择，后续补批量
**Notes:** 微信小程序对批量获取通讯录有严格权限限制，逐个选择是最稳妥的 V1 方案

## 标签系统设计

| Option | Description | Selected |
|--------|-------------|----------|
| 保持预设标签不变 | 保持当前 5 个预设标签（工作/朋友/家人/同事/客户），V1 不允许自定义 | |
| 预设 + 自定义标签 | 用户可以选择预设标签，也可以自由输入创建自定义标签 | ✓ |
| 完全自定义（无预设） | 移除预设限制，用户完全自由输入标签 | |

**User's choice:** 预设 + 自定义标签
**Notes:** 在保留预设标签的基础上，允许用户自由输入新标签

## 列表分页策略

| Option | Description | Selected |
|--------|-------------|----------|
| 保持现状不分页 | 当前一次性加载全部，免费版 100 联系人上限，数据量不大时没问题 | ✓ |
| 下拉加载更多 | 先加载 50 条，滚动到底部加载更多 | |
| 传统分页 | 传统分页（第 1 页、第 2 页），微信生态不太适合 | |

**User's choice:** 保持现状不分页
**Notes:** 100 联系人上限下数据量可控，不需要分页

## 交互记录补全

| Option | Description | Selected |
|--------|-------------|----------|
| 保持现状，V1 已足够 | 前端通过联系人详情接口获取交互记录，手动记录通过 POST /interactions 创建 | ✓ |
| 补充独立的编辑/删除功能 | 增加独立的 GET /interactions/:contactId 接口和编辑/删除功能 | |
| 补充来源追溯字段 | 增加交互记录的来源追溯（如 OCR 创建的、手动创建的等） | |

**User's choice:** 保持现状，V1 已足够
**Notes:** POST 创建 + 详情接口包含列表，V1 功能完整

## Claude's Discretion

- 通讯录导入页面的具体 UI 布局
- 自定义标签输入框的交互细节（回车确认/失焦确认）
- 导入后重复联系人的去重策略

## Deferred Ideas

- 批量通讯录导入 — 后续阶段实现 VCF 导入
- 联系人关系图谱可视化 — V2 范围
- 智能联系建议 — V2 范围
- 交互记录来源追溯 — 不在 V1 实现
