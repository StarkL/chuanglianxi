# Notion DESIGN.md 使用指南

> 这份指南用于指导另一个对话中的 Claude Code 使用 DESIGN.md 优化 personal-crm 的 H5 页面。

## 文件位置

```
D:\projects\personal-crm\docs\design\DESIGN.md
```

## 在新对话中如何使用

### 第 1 步：告知 Claude 设计系统

打开新的 Claude Code 对话后，发送以下提示词：

```
我的项目在 docs/design/DESIGN.md 有一份基于 Notion 风格的设计系统规范。
请读取这份文件，作为后续所有 H5 页面开发/优化的设计依据。

后续所有 UI 相关的代码——包括颜色、字体、圆角、间距、组件样式——
都必须严格遵循 DESIGN.md 中定义的 token 值。
```

### 第 2 步：让 Claude 做映射分析

```
读取 docs/design/DESIGN.md 后，请对照当前 frontend/src 目录下的页面代码，
找出以下差异：

1. 哪些颜色值不符合 DESIGN.md 定义？
2. 哪些圆角值（border-radius）不符合 DESIGN.md 的 rounded 规范？
3. 哪些间距值不符合 DESIGN.md 的 spacing 规范？
4. 哪些字体样式不符合 DESIGN.md 的 typography 规范？
5. 组件（按钮、卡片、输入框、标签）的样式差异

请逐一列出，并按影响范围排序。
```

### 第 3 步：分页面优化

一次只优化一个页面，避免 Claude 上下文爆炸。推荐顺序：

```
请按 DESIGN.md 规范优化以下页面：

1. 联系人列表页（frontend/src/views/xxx）
2. 联系人详情页（frontend/src/views/xxx）
3. 新建/编辑联系人表单
4. 搜索/筛选组件
5. 底部导航栏
```

每个页面的提示词模板：

```
请按照 docs/design/DESIGN.md 的规范优化 [页面名称]。

具体要求：
- 颜色使用 DESIGN.md 中 colors 部分定义的值
- 圆角使用 rounded 部分的值（按钮 8px，卡片 12px）
- 间距使用 spacing 部分的值
- 字体使用 typography 部分的层级定义
- 标签/badge 使用 badge-tag-* 系列组件规范

请逐个组件修改，每改一个组件说明改了哪里、为什么改。
```

### 第 4 步：用 agent-browser 验证

```
优化完成后，请用 agent-browser 打开 H5 页面截图，
对比 DESIGN.md 中描述的视觉风格，确认优化效果。
```

## CRM 场景与 DESIGN.md 组件映射

| CRM 功能模块 | 对应 DESIGN.md 组件 | 关键 Token |
|-------------|-------------------|-----------|
| 联系人卡片 | `card-base` / `card-template` | `rounded.lg` (12px), `colors.hairline` |
| 联系人状态标签 | `badge-tag-purple/orange/green` | `card-tint-lavender/mint/peach` |
| 搜索框 | `search-pill` | `colors.surface`, `height: 44px` |
| 分类筛选 Tab | `pill-tab` / `segmented-tab` | `rounded.full`, `colors.steel` |
| 新建按钮 | `button-primary` | `colors.primary` (#5645d4), `rounded.md` (8px) |
| 输入框 | `text-input` | `height: 44px`, `rounded.md` (8px) |
| 活动记录列表 | `comparison-row` | `colors.hairline-soft` 分隔线 |
| 统计面板 | `stat-row` | `colors.surface`, `rounded.lg` |
| 底部导航 | 自定义（DESIGN.md 无移动端导航规范） | 参考 `top-nav` 64px 高度 |

## 关键设计 Token（快速参考）

### 颜色
- **主色** `#5645d4` — 按钮、强调
- **画布白** `#ffffff` — 页面背景
- **辅助灰** `#f6f5f4` — 区块背景
- **描边** `#e5e3df` — 卡片边框
- **深标题** `#1a1a1a` — 标题文字
- **正文** `#37352f` — 正文暖炭黑

### 圆角
- 按钮/输入框: **8px**
- 卡片: **12px**
- 标签/badge: **6px**
- 丸状 Tab: **9999px**

### 间距
- 内边距小: **12px**
- 内边距中: **16px**
- 卡片内: **24px**
- 区块间: **64px**

### 字体（用 Inter 替代 Notion Sans）
- 页面标题: **28px / 600**
- 卡片标题: **18px / 600**
- 正文: **16px / 400**
- 辅助文字: **14px / 400**
- 标签: **13px / 600**

## 注意事项

1. **Notion Sans 不是免费字体**，前端应使用 **Inter** 作为替代（Google Fonts 免费）
2. **DESIGN.md 原本是营销页面规范**，不是移动端 H5 规范。CRM 的底部导航、下拉刷新等移动端交互需要自行补充
3. **Pastel 色系（桃色、薄荷绿、薰衣草紫）是 CRM 联系人分类的关键**——建议映射为：
   - 绿色 = 已跟进
   - 紫色 = 待联系
   - 橙色 = 紧急/重要
   - 桃色 = 普通
4. **紫色 `#5645d4` 是主行动色**，但不要用在正文文字或大面积背景上
5. 每次只优化一个页面，改完确认后再进入下一个

## 推荐的优化流程

```
读取 DESIGN.md → 分析当前页面差异 → 逐个组件对齐 → 截图验证 → 提交 commit
```

每个 commit 消息格式建议：
```
style: align contact-list page with Notion DESIGN.md tokens

- Updated card border-radius from 4px to 12px (rounded.lg)
- Changed primary button color to #5645d4 (colors.primary)
- Applied Inter font family replacing system-ui
- Standardized spacing to 4px base unit scale
```
