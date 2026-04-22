# 常联系 (ChangLianXi)

一个简单、便宜、AI 原生的个人 CRM 微信小程序，专注于"记住你见过谁、聊了什么、该什么时候联系"。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | uni-app + Vue 3 + TypeScript |
| 后端 | Node.js + Fastify + TypeScript |
| 数据库 | PostgreSQL 15+ |
| 缓存 | Redis |
| 包管理 | pnpm workspaces + Turborepo |

## 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose（用于本地数据库）

### 安装

```bash
pnpm install
```

### 启动基础设施

```bash
docker compose up -d postgres redis
```

### 数据库迁移

```bash
cd backend && npx prisma migrate dev
```

### 开发

```bash
# 同时启动前端和后端
pnpm dev

# 仅启动后端
cd backend && pnpm dev

# 仅启动前端（微信小程序）
cd frontend && pnpm dev:mp-weixin
```

### 构建

```bash
pnpm build
```

## 项目结构

```
.
├── frontend/          # uni-app 微信小程序
├── backend/           # Fastify API 服务
│   ├── src/
│   │   ├── config/    # 配置（env、cors）
│   │   └── routes/    # API 路由
│   └── prisma/        # 数据库 schema
├── packages/
│   └── shared/        # 共享类型定义
├── docker-compose.yml # 本地开发基础设施
└── turbo.json         # Turborepo 构建配置
```

## 版本规划

| 版本 | 状态 | 核心功能 |
|------|------|----------|
| V1 - MVP | 开发中 | 联系人管理、名片 OCR、关系提醒、交互记录 |
| V2 - AI 增强 | 规划中 | 语音笔记、关系评分、聊天分析 |
| V3 - 深度 AI | 规划中 | 自然语言查询、会前情报、关系预警 |

## 文档

- [架构文档](docs/architecture.md)
- [API 文档](docs/api.md)
- [产品规划](docs/规划/常联系产品规划文档.md)
