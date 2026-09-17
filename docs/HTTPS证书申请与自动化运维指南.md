# 常联系 (ChangLianXi) — HTTPS 证书申请与自动化运维指南

> 本文档记录从零申请权威免费 SSL 证书、配置 Nginx HTTPS、解决浏览器安全警告以及保障 PWA (Progressive Web App) 正常安装与离线运行的完整技术方案。
> 供**开发者自测运维**与**后续 AI Agent 进行自动化部署**时作为标准化规范与实操参考。

---

## 一、为什么需要权威 CA 的 HTTPS 证书？

在个人 CRM 系统的现代 Web 部署中，权威机构签发的 HTTPS 具有硬性技术要求：

1. **PWA (渐进式 Web 应用) 强依赖安全上下文 (Secure Context)**：
   - 浏览器的 Service Worker 注册、离线缓存机制与 Web App Manifest 原生安装弹窗（桌面/手机「添加到主屏幕」）**强制要求必须处于受信任的 HTTPS 环境**；
   - 传统的 IP 自签名证书（Self-Signed Certificate）虽然能建立加密信道，但由于未包含在全球公认的受信任根证书库中，浏览器会标记为 `Not secure` / `不安全`，从而直接**静默屏蔽 PWA 安装通道**。
2. **端到端隐私与现代 Web API**：
   - 系统涉及本地端到端加密、定位（同城联系人计算）、语音速记（Web Audio API / 麦克风录音）等敏感权限，只有在标准 HTTPS 下现代浏览器才予以授权。

---

## 二、部署前置准备与网络约束

### 2.1 域名解析规范（双记录绑定）
在云解析控制台（如腾讯云 DNSPod、阿里云云解析等）为域名添加两条 A 记录指向服务器公网 IP：
- **主机记录 `@`** ➔ 解析根域名（例如 `yourdomain.com`）
- **主机记录 `www`** ➔ 解析二级域（例如 `www.yourdomain.com`）

> **⚠️ 注意**：务必同时绑定 `@` 与 `www`，防止用户输入习惯差异导致解析失败或证书域名不匹配（Hostname Mismatch）。

### 2.2 机房防火墙与端口开放
云服务器安全组与系统防火墙必须放行：
- **`80/TCP`**：HTTP 端口。用于 ACME 证书挑战验证（HTTP-01 质询），以及提供向 HTTPS 的 301 自动跳转；
- **`443/TCP`**：HTTPS 端口。用于承载 TLS 加密流量。

### 2.3 大陆机房网络合规（ICP 备案约束）
- 若服务器节点位于中国大陆机房，域名必须先完成 ICP 备案，且域名顶级后缀须在工信部批复牌照列表中；
- 若请求返回 `403 Non-compliance ICP Filing`，说明阻断是由骨干网拦截引起，需待备案通过后生效。

---

## 三、证书方案与工具链选型

| 维度 | 选用方案 | 核心优势 |
| :--- | :--- | :--- |
| **证书签发机构** | **Let's Encrypt** | 全球公认受信任、永久免费、支持双域名/泛域名 |
| **ACME 客户端** | **Certbot** | 官方推荐、稳定可靠、易于配合 Systemd/Cron 自动化 |
| **验证方式** | **Webroot (HTTP-01)** | **零停机**：无需临时关闭 Nginx，直接利用现有 Web 目录写入随机质询令牌完成校验 |
| **轮换续期策略** | **Systemd Timer + Deploy Hook** | 90 天证书生命周期内，提前 30 天自动静默轮换并热重载 Nginx，完全免人工维护 |

---

## 四、实操执行步骤（标准化部署流程）

### 步骤 1：验证 DNS 解析与连通性

在本地或 VPS 上执行预检命令，确保域名已生效且能够访问服务器：

```bash
# 验证解析与 80 端口连通性
curl -I -s http://yourdomain.com/crm/
curl -I -s http://www.yourdomain.com/crm/
```
若能正常返回 `200 OK`，说明网络和反代链路通畅。

---

### 步骤 2：检查 Nginx 的 ACME 挑战路径配置

Webroot 模式依赖 Let's Encrypt 访问 `http://<域名>/.well-known/acme-challenge/<TOKEN>`。

在 Nginx 的 HTTP（80 端口）`server` 块中，必须确保包含以下无阻断路由（通常设置在 `/usr/share/nginx/html`）：

```nginx
# /etc/nginx/conf.d/default.conf

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /usr/share/nginx/html;

    # Let's Encrypt 质询验证路由（必须保留且允许所有访问）
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
        allow all;
    }

    # 自动重定向域名 HTTP 请求至 HTTPS (保持 IP 直连不重定向)
    if ($host ~* ^(www\.)?yourdomain\.com$) {
        return 301 https://$host$request_uri;
    }

    # ... 其他业务路由 ...
}
```

---

### 步骤 3：申请 Let's Encrypt 免费证书

在 VPS 终端执行以下步骤：

#### 3.1 预检模拟（Dry-Run）
为防止因路径或配置错误频繁请求触发 Let's Encrypt 频次限制（Rate Limits），建议先执行模拟测试：

```bash
sudo certbot certonly --webroot \
    -w /usr/share/nginx/html \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --dry-run
```
> 输出 `The dry run was successful.` 表示验证环境完全正常。

#### 3.2 正式签发证书
去掉 `--dry-run` 正式申请：

```bash
sudo certbot certonly --webroot \
    -w /usr/share/nginx/html \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email \
    --non-interactive
```

签发成功后，证书与私钥将安全存储于：
- **完整证书链 (Fullchain)**：`/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- **私钥文件 (Privkey)**：`/etc/letsencrypt/live/yourdomain.com/privkey.pem`

---

### 步骤 4：Nginx 生产级 HTTPS 配置与 PWA 适配

#### 4.1 确保 PWA Manifest MIME 类型存在
部分 Linux 发行版的 Nginx 默认 `mime.types` 缺少 `.webmanifest` 关联，会导致文件以 `application/octet-stream` 输出，引发 Chrome/Edge 拒绝安装 PWA。

检查 `/etc/nginx/mime.types`，确保存在：
```nginx
types {
    # ...
    application/json                                 json;
    application/manifest+json                       webmanifest;
    # ...
}
```

#### 4.2 配置 443 HTTPS 虚拟主机
在 `/etc/nginx/conf.d/default.conf` 中配置 HTTPS 服务块：

```nginx
# HTTPS 服务器
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name yourdomain.com www.yourdomain.com _;

    # Let's Encrypt 证书路径
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # TLS 协议与现代加密套件优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /usr/share/nginx/html;
    index index.html;

    # 个人 CRM (常联系) - H5 静态资源
    location /crm/ {
        index index.html;
        try_files $uri $uri/ /crm/index.html;
    }

    # 个人 CRM API 反向代理 (Fastify 5000 端口)
    location /crm/api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ... 其他子系统路由 ...
}
```

#### 4.3 校验语法并平滑热重载
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### 步骤 5：配置全自动无感续签（免维护核心）

Let's Encrypt 证书有效期为 90 天。为实现提前 30 天自动化续期且无需人工介入：

#### 5.1 创建部署热重载钩子 (Deploy Hook)
在 Certbot 专用钩子目录创建脚本，确保每次轮换证书后自动重载 Nginx：

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy

cat <<'EOF' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/01-reload-nginx.sh
#!/bin/bash
systemctl reload nginx
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/01-reload-nginx.sh
```

#### 5.2 激活系统级定时器 (Systemd Timer)
启用并立即启动 `certbot-renew.timer`：

```bash
sudo systemctl enable --now certbot-renew.timer
# 检查定时器运行状态
systemctl status certbot-renew.timer
```
*该定时器会每天静默唤醒两次，检查证书剩余有效天数，当小于 30 天时自动申请新证书并触发重载脚本。*

#### 5.3 续期仿真验证
```bash
sudo certbot renew --dry-run
```
> 输出 `Congratulations, all simulated renewals succeeded` 即宣告全自动化链路闭环。

---

## 五、开发机历史自签名证书清理指南

在正式启用官方证书后，开发机若此前安装过临时自签名证书，可按如下方式清除，保持系统证书库纯净：

### 方式 A：Windows 图形界面清除（推荐）
1. 按快捷键 <kbd>Win</kbd> + <kbd>R</kbd>，输入 `certmgr.msc` 并回车；
2. 展开 **【受信任的根证书颁发机构】 ➔ 【证书】**；
3. 找到目标自建证书（例如 `ChangLianXi Root CA` 或临时 IP 自签名证书）；
4. 右键点击 ➔ 选择 **【删除】** 并确认；
5. 在左侧 **【中级证书颁发机构】 ➔ 【证书】** 中做同样检查与清理。

### 方式 B：管理员 PowerShell 一键清理
```powershell
# 清理当前用户证书库
certutil -user -delstore Root "ChangLianXi Root CA"
certutil -user -delstore Root "<历史测试IP>"
certutil -user -delstore CA "<历史测试IP>"

# 清理本地计算机根证书库
certutil -delstore Root "ChangLianXi Root CA"
```

---

## 六、常见故障排查表 (Troubleshooting)

| 现象 | 可能原因 | 排查及解决方案 |
| :--- | :--- | :--- |
| **Certbot 提示 `Connection refused` 或 `Timeout`** | 80 端口未对外开放或被防火墙拦截 | 1. 检查云控制台安全组是否放行 `80` 和 `443`；<br>2. 确认服务器内 `firewalld`/`iptables` 未屏蔽端口。 |
| **Certbot 报错 `404 Not Found`** | Webroot 路径与 Nginx 配置不一致 | 检查 Nginx 配置中 `location /.well-known/acme-challenge/` 下的 `root` 是否与 certbot 的 `-w` 路径完全一致。 |
| **浏览器访问 HTTPS 提示证书不匹配** | 存在多个 443 监听或旧证书未替换 | 检查 `/etc/nginx/conf.d/` 下是否存在其他未声明 `server_name` 的 `.conf` 抢占了 443 默认服务；统一合并至 `default.conf`。 |
| **HTTPS 正常但无法安装 PWA** | 1. MIME 类型错误<br>2. Service Worker 404<br>3. 嵌套在 iframe 内 | 1. 运行 `curl -I https://<域名>/crm/manifest.webmanifest`，确认返回 `application/manifest+json`；<br>2. 确认 `sw.js` 能以 `application/javascript` 正常拉取；<br>3. 在独立浏览器标签页打开，不要嵌在第三方框架中。 |
