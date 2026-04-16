# 常联系 — 架构文档

## 总体架构

```
┌─────────────────────────────────────────┐
│         微信小程序 (uni-app)             │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐  │
│  │ 联系人  │ │  名片    │ │ 交互    │  │
│  │ 管理页  │ │  扫描页  │ │  记录页  │  │
│  └─────────┘ └──────────┘ └─────────┘  │
└────────────────────┬────────────────────┘
                     │  HTTPS
┌────────────────────▼────────────────────┐
│        后端服务 (Node.js + Fastify)      │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 用户服务  │ │ 联系人   │ │ 提醒    │ │
│  │          │ │ 服务     │ │ 服务    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ AI 编排  │ │ 支付     │ │ 文件    │ │
│  │ 服务     │ │ 服务     │ │ 服务    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└───────┬──────────┬──────────┬───────────┘
        │          │          │
┌───────▼──┐ ┌────▼───┐ ┌───▼──────────┐
│PostgreSQL│ │ Redis  │ │  BullMQ      │
│ (主数据) │ │ (缓存) │ │  (消息队列)   │
└──────────┘ └────────┘ └──────────────┘
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | uni-app + Vue 3 + TypeScript | 微信小程序，多端发布 |
| 后端 | Fastify + TypeScript | RESTful API，Schema 校验 |
| ORM | Prisma | 类型安全的数据库访问 |
| 数据库 | PostgreSQL 15+ | JSONB + pgvector 支持 |
| 缓存 | Redis (ioredis) | Session、限流、任务队列 |
| 消息队列 | BullMQ | 异步任务（AI 处理、语音转录） |
| 包管理 | pnpm workspaces + Turborepo | Monorepo 管理 |

## 目录结构

```
.
├── frontend/                # uni-app 微信小程序
│   ├── src/
│   │   ├── pages/          # 页面
│   │   ├── components/     # 组件（V3+）
│   │   ├── stores/         # Pinia 状态管理（V3+）
│   │   ├── services/       # API 调用
│   │   ├── utils/          # 工具函数
│   │   ├── App.vue         # 根组件
│   │   ├── main.ts         # 入口
│   │   ├── pages.json      # 页面路由配置
│   │   ├── manifest.json   # uni-app 配置
│   │   └── uni.scss        # 全局样式
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                 # Fastify API 服务
│   ├── src/
│   │   ├── config/         # 配置模块
│   │   │   ├── env.ts      # 环境变量校验
│   │   │   └── cors.ts     # CORS 配置
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑（V2+）
│   │   ├── plugins/        # Fastify 插件
│   │   └── index.ts        # 入口
│   ├── prisma/
│   │   └── schema.prisma   # 数据库 schema
│   ├── package.json
│   └── tsconfig.json
│
├── packages/shared/         # 共享类型
│   ├── src/
│   │   ├── index.ts        # 类型导出
│   │   └── redis.ts        # Redis 连接模块
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml       # 本地开发基础设施
├── turbo.json               # Turborepo 配置
└── package.json             # Root workspace
```

## 数据流

### 请求处理流程

```
小程序请求 → Fastify 路由 → 服务层 → Prisma ORM → PostgreSQL
                           ↓
                         Redis (缓存)
                           ↓
                      BullMQ (异步任务)
                           ↓
                      AI 大模型服务
```

### 数据库核心表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| users | 用户 | open_id, subscription_tier |
| contacts | 联系人 | user_id, name, company, tags |
| interactions | 交互记录 | contact_id, type, content |
| relationship_scores | 关系评分 | score, last_contact_days |
| reminders | 提醒 | user_id, scheduled_at, recurrence_rule |
| business_cards | 名片 | image_url, ocr_data |

## 部署架构

```
用户 → 微信 CDN → 小程序
         ↓
用户 → Nginx → Fastify API (腾讯云/阿里云)
               ↓
         PostgreSQL (RDS)
         Redis (云 Redis)
```
