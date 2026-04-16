# 常联系 — API 文档

> 基础路径：`/api`

## 认证

所有 API 请求需要在 Header 中携带 JWT token：

```
Authorization: Bearer <token>
```

## 通用响应格式

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

## 端点

### 健康检查

```
GET /api/health
```

**响应：**

```json
{
  "status": "ok",
  "timestamp": "2026-04-16T12:00:00.000Z",
  "uptime": 120.5
}
```

---

### 用户端点（V2）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/auth/wechat-login` | 微信登录 | Phase 2 |
| GET | `/api/auth/verify` | 验证 token | Phase 2 |
| DELETE | `/api/auth/logout` | 退出登录 | Phase 2 |

### 联系人端点（V3）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/contacts` | 获取联系人列表 | Phase 3 |
| POST | `/api/contacts` | 创建联系人 | Phase 3 |
| GET | `/api/contacts/:id` | 获取联系人详情 | Phase 3 |
| PUT | `/api/contacts/:id` | 更新联系人 | Phase 3 |
| DELETE | `/api/contacts/:id` | 删除联系人 | Phase 3 |
| GET | `/api/contacts/search` | 搜索联系人 | Phase 3 |

### 名片 OCR 端点（V4）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/ocr/business-card` | 识别名片 | Phase 4 |
| GET | `/api/ocr/usage` | 查询 OCR 使用次数 | Phase 4 |

### 交互记录端点（V5）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/interactions` | 创建交互记录 | Phase 5 |
| GET | `/api/contacts/:id/interactions` | 获取联系人交互时间线 | Phase 5 |

### 提醒端点（V6）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/reminders` | 获取提醒列表 | Phase 6 |
| POST | `/api/reminders` | 创建提醒 | Phase 6 |
| PUT | `/api/reminders/:id` | 更新提醒 | Phase 6 |
| DELETE | `/api/reminders/:id` | 删除提醒 | Phase 6 |

### 支付端点（V7）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/payment/subscribe` | 创建订阅 | Phase 7 |
| POST | `/api/payment/webhook` | 微信支付回调 | Phase 7 |
| GET | `/api/payment/status` | 查询订阅状态 | Phase 7 |
