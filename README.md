# 常联系 (ChangLianXi)

一个轻量、开源、注重隐私与 AI 原生的个人人脉关系管理（Personal CRM）助手，专注于“**记住你见过谁、聊了什么、该什么时候联系**”。

完全开源免费，支持完全私有化部署与本地离线加密存储。

---

## 核心特性

- 📇 **多渠道快速人脉录入**：
  - 手机通讯录 vCard (`.vcf`) 本地秒级解析与批量智能去重导入；
  - 百炼大模型 AI 名片扫描与关键字段自动提取；
  - 手动新增与快捷标签分类。
- 🛡️ **极致隐私与端到端加密 (E2EE)**：
  - **双重存储模式**：自由选择“纯本地加密存储 (Local)”或“云端加密同步 (Cloud)”；
  - **落盘强加密 (At-Rest Encryption)**：敏感数据（手机号、微信号、邮箱、跟进记录等）在写入本地 IndexedDB 或同步至云端前，均经 WebCrypto AES-256-GCM 强加密，服务端与沙箱零知识；
  - **智能数据备份**：支持一键导出/恢复标准 JSON 备份，具备体积智能评估与 1MB 防卡死安全分流，支持直接下载 `.json` 备份文件。
- 💬 **智能关系维护**：
  - 关系提醒、生日提醒（支持公历/农历智能转换）；
  - 交互跟进纪要时间轴；
  - AI 聊天回复灵感建议。
- 📱 **多端支持与优雅交互**：
  - H5 网页端 / PWA（支持添加到手机桌面 App 与桌面端居中宽屏自适应）；
  - 微信小程序端支持。

---

## 技术栈

| 层级 | 技术方案 | 说明 |
| :--- | :--- | :--- |
| **前端 (Client)** | uni-app (Vue 3) + Vite + TypeScript + Wot Design Uni | 跨端响应式框架，Base 路径 `/crm/` |
| **后端 (Server)** | Node.js + Fastify + TypeScript | 轻量高性能 API 服务 |
| **本地/云端存储** | SQLite 3 (Prisma ORM) / 浏览器 IndexedDB | 零外部中间件依赖，极低内存占用 |
| **加密架构** | WebCrypto API (AES-256-GCM, PBKDF2) | 客户端/本地落盘透明端到端强加密 |
| **代码工程** | pnpm workspaces + Turborepo | 统一 Monorepo 工程化管理 |

---

## 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+

### 1. 安装依赖

```bash
pnpm install
```

### 2. 数据库初始化

项目采用内置的 SQLite，无需额外配置或启动 Docker 数据库：

```bash
cd backend
npx prisma migrate dev
cd ..
```

### 3. 本地启动开发环境

```bash
# 同时启动前端 (H5) 与后端服务
pnpm dev

# 或者单独启动：
# 仅启动后端 (http://127.0.0.1:5000)
pnpm --filter @changlianxi/backend dev

# 仅启动前端 H5 (http://localhost:5173/crm/)
pnpm --filter @changlianxi/frontend dev:h5

# 启动微信小程序端开发
pnpm --filter @changlianxi/frontend dev:mp-weixin
```

### 4. 生产构建

```bash
# 构建全栈产物
pnpm build
```

---

## 项目结构

```
.
├── frontend/          # uni-app 前端 (H5 / PWA / 微信小程序)
├── backend/           # Fastify API 服务
│   ├── src/
│   │   ├── config/    # 环境变量与 CORS 配置
│   │   ├── routes/    # API 路由
│   │   └── services/  # 业务逻辑服务
│   └── prisma/        # SQLite Schema 与数据存储
├── packages/
│   └── shared/        # 共享 TypeScript 类型与工具接口
├── docs/              # 架构、API 与规划设计文档
└── turbo.json         # Turborepo 任务编排配置
```

---

## 开源协议

本项目遵循开源协议，代码完全开放，欢迎共建。
