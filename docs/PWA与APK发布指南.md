# PWA 与 APK 发布指南

> 本文档面向开发者，记录从代码修改到 APK 分发的完整链路。

---

## 一、PWA 安装弹窗优化

### 问题背景

**PWA 在国内安卓生态的局限性：**

大陆品牌手机（华为、小米、OPPO、vivo 等）的自带浏览器对 PWA 标准支持普遍较差。实测发现：
- 大部分浏览器不支持 `beforeinstallprompt` 事件，无法触发真正的 PWA 安装流程
- 即使支持，"添加到桌面"往往只是创建一个**浏览器页签的快捷方式**（类似网页书签），而非真正下载安装的 PWA 应用
- 长按应用图标不能唤起如支付宝扫一扫等快捷入口
- 全局搜索找不到该"应用"，因为它本质上只是一个 URL 快捷入口

**结论：在国内安卓生态，PWA 安装体验不可靠，APK 分发是更务实的方案。**

### 代码改动

**文件**：`frontend/src/utils/pwa.ts`

新增浏览器检测函数：

```typescript
/**
 * 判断是否为国内安卓浏览器（对 PWA 支持差）
 */
export function isChineseAndroidBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  const chineseBrowsers = [
    'huawei', 'honor', 'xiaomi', 'miui', 'oppo', 'vivo', 'samsung',
    'ucbrowser', 'qqbrowser', 'baidubrowser', '2345browser', 'sogou',
    '360browser', 'liebaofast', 'maxthon', 'uc browser'
  ]
  return chineseBrowsers.some(browser => userAgent.includes(browser))
}

/**
 * 判断浏览器是否支持 PWA 自动安装
 */
export function isPwaAutoInstallSupported(): boolean {
  if (isIos()) return false
  if (isChineseAndroidBrowser()) return false
  return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window
}
```

**文件**：`frontend/src/components/pwa-install-modal.vue`

改动要点：
1. 安装成功后监听 `appinstalled` 事件（10 秒超时），确认真正安装完成
2. 超时或未收到事件时，显示手动安装指引（3 步图文教程）
3. 对不支持自动安装的浏览器，直接显示手动指引
4. 安装成功后用 `showModal` 替代 `showToast`，引导用户去应用抽屉查找图标

### 手动安装指引 UI

当自动安装失败时，弹窗内显示：

```
手动添加到主屏幕：
1. 点击浏览器右上角【⋮】或【…】菜单
2. 选择【添加到主屏幕】或【安装应用】
3. 在弹出对话框中点击【添加】或【安装】

💡 推荐使用 Chrome 或 Edge 浏览器以获得最佳体验
```

---

## 二、APK 打包流程（PWABuilder）

### 前置条件

- PWA 网站已部署且可访问（HTTPS）
- `manifest.webmanifest` 配置正确（name、icons、start_url、display）
- Service Worker 已注册并正常工作

### 打包步骤

1. 访问 https://www.pwabuilder.com/
2. 输入网站 URL：`https://www.666666.monster/crm/`
3. 点击「Start」等待分析完成
4. 点击「Package For Stores」
5. 选择「Google Play」→「Android」
6. 填写打包配置：
   - **Package ID**：`monster.app_666666.www.twa`（反向域名风格）
   - **App name**：`常联系`
   - **Short name**：`常联系`
7. 点击「Download Package」
8. 等待云端构建完成（约 1-2 分钟）
9. 下载生成的 zip 文件

### 打包产物

解压 zip 后包含：

| 文件 | 说明 |
|:---|:---|
| `常联系.apk` | 可直接安装的 APK（约 2.2MB） |
| `常联系.aab` | Google Play 上架用的 App Bundle |
| `assetlinks.json` | 域名验证文件（TWA 完全信任模式） |
| `signing.keystore` | 签名密钥（**务必妥善保管**） |
| `signing-key-info.txt` | 签名密钥信息 |

### 注意事项

- **签名密钥**：每次打包使用同一个 keystore，否则无法覆盖安装
- **Package ID**：一旦确定不要修改，修改后会被视为新应用
- **TWA 原理**：APK 本质是壳浏览器，通过 Chrome Custom Tabs 加载 PWA，体积小（2-5MB），更新网站 = 更新应用

---

## 三、GitHub Release 发布

### 创建 Release

通过 GitHub API 创建 Release 并上传 APK：

```bash
# 1. 创建 Release（需要 GitHub Personal Access Token）
curl -X POST "https://api.github.com/repos/StarkL/chuanglianxi/releases" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @release-body.json

# 2. 上传 APK
curl -X POST "https://uploads.github.com/repos/StarkL/chuanglianxi/releases/<RELEASE_ID>/assets?name=changlianxi-v0.1.0.apk" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/vnd.android.package-archive" \
  --data-binary "@常联系.apk"

# 3. 上传 assetlinks.json（可选）
curl -X POST "https://uploads.github.com/repos/StarkL/chuanglianxi/releases/<RELEASE_ID>/assets?name=assetlinks.json" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  --data-binary "@assetlinks.json"
```

### 中文编码问题

Windows 环境下通过 API 发送中文内容时，PowerShell 的 `ConvertTo-Json` 可能产生编码问题。

**解决方案**：将 JSON 写入 UTF-8 文件，再用 `curl -d @file.json` 发送：

```bash
# 创建 UTF-8 编码的 JSON 文件
echo '{"name":"v0.1.0 - 首个 Android 版本"}' > release-name.json

# 用 curl 从文件读取发送
curl -X PATCH "https://api.github.com/repos/StarkL/chuanglianxi/releases/<ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @release-name.json
```

### Release 模板

```markdown
## 常联系 Android 版 v0.1.0

### 功能特性
- 联系人管理：添加、编辑、删除联系人
- 聊天记录：记录与联系人的交互历史
- 提醒功能：设置跟进提醒，不错过重要联系
- 语音速记：快速记录人脉交互
- 名片识别：拍照或上传识别名片
- 隐私保护：端到端加密，数据本地存储

### 安装说明
1. 下载 changlianxi-v0.1.0.apk
2. 允许安装未知来源应用
3. 点击安装即可

### 注意事项
- 首次打开需要联网加载资源
- 建议添加到桌面以获得最佳体验
```

---

## 四、域名验证配置（可选）

配置 `assetlinks.json` 后，Chrome 打开网站时会提示"在应用中打开"。

### 部署步骤

```bash
# 1. 在服务器上创建目录
mkdir -p /www/crm/frontend/dist/build/h5/.well-known

# 2. 上传 assetlinks.json 到该目录
scp assetlinks.json root@<VPS_IP>:/www/crm/frontend/dist/build/h5/.well-known/

# 3. 验证访问
curl https://www.666666.monster/.well-known/assetlinks.json
```

### assetlinks.json 内容示例

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "monster.app_666666.www.twa",
    "sha256_cert_fingerprints": ["<从 signing-key-info.txt 获取>"]
  }
}]
```

---

## 五、版本更新流程

每次发布新版本时，按以下顺序操作：

```
1. 修改代码 → 提交 → 推送到 VPS → 验证线上功能
         ↓
2. PWABuilder 重新打包（使用同一个 keystore）
         ↓
3. 创建新 GitHub Release（tag: v0.x.x）
         ↓
4. 上传新 APK + 更新 assetlinks.json（如签名指纹变化）
         ↓
5. 更新 Nginx 配置（如有变更）→ reload
```

### 版本号规范

- `v0.1.0` — 首个可用版本
- `v0.1.1` — Bug 修复
- `v0.2.0` — 新功能
- `v1.0.0` — 稳定版

---

## 六、常见问题

### Q: 手机安装 APK 后桌面没有图标？

A: TWA 应用安装后图标可能不会自动出现在桌面。引导用户：
1. 打开「应用抽屉」或「所有应用」列表查找
2. 长按图标拖到桌面
3. 或在 Chrome 菜单「最近使用的应用」中找到

### Q: PWABuilder 检测不到 Service Worker？

A: 检查 Nginx 的 `try_files` 规则是否把 `/crm/sw.js` 请求重定向到了 `index.html`。
PC 端能正常安装说明 SW 实际是工作的，PWABuilder 的检测方式可能不同。

### Q: 打包时 Package ID 能改吗？

A: 首次打包后不要改。修改 Package ID 会被视为新应用，无法覆盖安装旧版本。

### Q: 签名密钥丢了怎么办？

A: 无法恢复。需要重新打包并使用新的 Package ID，旧版本用户无法直接升级。
**务必备份 `signing.keystore` 文件。**

### Q: 国内浏览器不支持 PWA 安装怎么办？

A: 推荐方案：
1. 引导用户使用 Chrome 浏览器
2. 提供 APK 下载作为替代方案
3. 在 PWA 安装弹窗中增加手动安装指引

---

## 七、关键文件索引

| 文件 | 用途 |
|:---|:---|
| `frontend/src/utils/pwa.ts` | PWA 管理器（SW 注册、安装检测、浏览器判断） |
| `frontend/src/components/pwa-install-modal.vue` | PWA 安装弹窗组件 |
| `frontend/public/manifest.webmanifest` | PWA 清单文件 |
| `frontend/public/sw.js` | Service Worker |
| `nginx.vps.conf` | VPS Nginx 配置 |
| `docs/APK 打包指南.md` | 早期打包方案记录 |
| `docs/PWA与APK发布指南.md` | 本文档 |
