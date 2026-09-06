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

## 路线图与待开发特性 (Roadmap)

### 1. 🔍 自然语言模糊沟通记录检索（Local RAG 智能问答）
- **场景痛点**：用户常记住模糊片段（例如：“*之前我跟谁沟通过说下个月要一起去杭州旅游来着？*”），传统按姓名/公司关键词检索难以命中深层沟通细节。
- **技术实现方案**：
  - **端侧轻量检索引擎**：集成前端内存级倒排索引与模糊匹配（如 MiniSearch / FlexSearch）或端侧嵌入模型（`@xenova/transformers` 的 BGE-Micro，基于 ONNX Runtime Web 在浏览器内本地推理）；
  - **本地先解密再检索（Local RAG）**：在用户本地设备内存中对已解密的交互纪要进行毫秒级语义初筛，提取 Top 3 候选片段；
  - **大模型组织精准回答**：将候选上下文与问题交给大模型提炼，输出清晰结果（例如：“*您在 8月15日 与【李总】沟通时提到过一起去杭州西湖旅游*”），并附带联系人跳转卡片。**全程无需将整库数据上传云端，兼顾智能与绝对隐私**。

### 2. 🎙️ 端侧本地离线语音转文字（Offline ASR / Speech-to-Text）
- **场景痛点**：商务拜访、会后复盘时需要随时随地语音速记，但在飞行模式、地下车库等弱网断网环境，或对录音上传云端存在隐私顾虑。
- **技术实现方案**：
  - **客户端本地模型推理**：引入 OpenAI Whisper 轻量量化模型（如 `whisper-tiny` / `whisper-base`，约 39MB~70MB），基于 WebAssembly 与 WebGPU 硬件加速在电脑/手机端侧直接运行；
  - **首次下载，永久离线**：模型在用户首次启用时加载并持久化缓存在本地 CacheStorage / IndexedDB 中；
  - **100% 全离线运行**：录音采集 ➔ 端侧 ASR 转写 ➔ 文本结构化提炼 ➔ 本地 AES-256-GCM 强加密落盘，全流程无任何网络外发。

### 3. 🔑 BYOK 模式（Bring Your Own Key - 用户自填 API Key 直连官方 AI）
- **场景痛点**：彻底消除对项目中心服务器的依赖，让用户拥有自由的模型选择权并降低对托管服务的信任成本。
- **技术实现方案**：
  - **多主流厂商兼容**：支持配置兼容 OpenAI 接口规范的各大模型服务（如 **DeepSeek**、阿里云百炼、月之暗面 Kimi、OpenAI，以及本地部署的 **Ollama** 本地大模型）；
  - **纯前端直连端点**：用户在【设置】中填入 API Key 与自定义 Base URL（仅经主密钥加密保存在本地设备中，绝不上传至任何中间服务器）；
  - **完全脱离服务器自治运行**：在“纯本地存储 + BYOK 直连”模式下，整套系统可完全作为纯静态单机应用离线运转，即使彻底关闭后端服务，所有联系人管理与 AI 交互功能依然 100% 独立可用。

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
