# uni-app 小程序编译问题排查指南

## 背景

项目使用 uni-app（Vue 3 + Vite）同时编译 H5 和微信小程序。H5 版本先完成，但在微信开发者工具中加载小程序时遇到白屏/无法加载的问题，经排查修复了以下 5 个问题。

---

## 问题清单

### 1. manifest.json 中 mp-weixin appid 为空

- **文件**：`frontend/src/manifest.json`
- **原因**：`mp-weixin.appid` 字段为空字符串，编译后 `project.config.json` 丢失 AppID，小程序无法启动
- **修复**：填入实际 AppID

```json
"mp-weixin": {
  "appid": "wxf215757776f5dd77",
  ...
}
```

---

### 2. uni-mp-weixin 依赖版本不匹配（编译静默失败）

- **文件**：`frontend/package.json`
- **原因**：版本号用了 `^` 前缀，pnpm 解析到 alpha 版本 `3.0.0-alpha-5000720260416001`，与 `uni-cli-shared` 的 `3.0.0-5000720260410001` 不一致，导致编译静默失败无报错
- **修复**：去掉 `^`，锁定精确版本

```json
"@dcloudio/uni-components": "3.0.0-5000720260410001",
"@dcloudio/uni-mp-weixin": "3.0.0-5000720260410001",
```

注意：所有 uni-app 相关依赖版本号必须对齐，用精确版本，不要用 `^` 或 `~`。

---

### 3. 缺少 sass 预处理器

- **原因**：`.vue` 文件中使用了 `lang="scss"`，但项目未安装 `sass`
- **修复**：

```bash
cd frontend
pnpm add -D sass
```

---

### 4. 小程序 API 请求 URL 为相对路径

- **文件**：`frontend/src/utils/request.ts`
- **原因**：H5 通过 Vite proxy 代理转发 `/api` 到后端，但小程序没有开发服务器，`uni.request('/api/xxx')` 是相对路径，无法访问后端
- **修复**：使用条件编译区分平台

```typescript
// H5：走 Vite proxy，用相对路径
// #ifdef H5
const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'
// #endif

// 小程序：必须用完整地址
// #ifdef MP-WEIXIN
const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
// #endif
```

微信开发者工具需同时操作：详情 → 本地设置 → 勾选「不校验合法域名」。

---

### 5. voice-note.ts 调用了不存在的 request.post()

- **文件**：`frontend/src/api/voice-note.ts`
- **原因**：`request` 只是一个函数，没有 `.post()` 方法，运行时报错
- **修复**：

```typescript
// ❌ 错误写法
return request.post('/voice-note/process', { ... })

// ✅ 正确写法
return request<ProcessVoiceNoteResponse>({
  url: '/voice-note/process',
  method: 'POST',
  data: { transcript, contactId },
})
```

---

## 编译命令对照

```bash
# H5 开发
pnpm dev:h5       # → dist/dev/h5/

# 小程序开发（热更新）
pnpm dev:mp-weixin  # → dist/dev/mp-weixin/

# 小程序生产构建
pnpm build:mp-weixin  # → dist/build/mp-weixin/
```

---

## 运行时检查清单

1. 微信开发者工具导入路径：`frontend/dist/dev/mp-weixin/`（开发）或 `dist/build/mp-weixin/`（构建）
2. 详情 → 本地设置 → 勾选「不校验合法域名」
3. 确保后端服务已启动（`localhost:5000`）
4. IDE 打开项目根目录即可看到前后端完整代码，与微信开发者工具互不冲突

---

## 经验教训

| 教训 | 说明 |
|------|------|
| **uni-app 依赖必须统一版本** | 所有 `@dcloudio/*` 包必须同一版本号，禁用 `^` `~` 前缀 |
| **sass 不是默认安装的** | 使用 scss 需手动安装 `sass` |
| **小程序无开发服务器代理** | 条件编译是必须的，H5 走代理、小程序直连后端 |
| **编译日志要看完整** | 静默失败时用重定向捕获日志：`npx uni build -p mp-weixin > log.txt 2>&1` |
| **H5 和小程序是两条独立流水线** | H5 能跑 ≠ 小程序能跑，需各自编译测试 |
