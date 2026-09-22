# 常联系 APK 打包指南

## 方案选择

### 方案 1: PWA Builder（推荐，最简单）

**优点：**
- 一键打包，无需 Android Studio
- 自动生成签名证书
- 支持 TWA (Trusted Web Activity) 技术
- 应用体积小巧（约 2-5MB）

**步骤：**

1. 访问 https://www.pwabuilder.com/
2. 输入网站 URL: `https://www.666666.monster/crm/`
3. 点击「Get Started」
4. 等待分析完成（检查 manifest、SW、HTTPS 等）
5. 点击「Package for stores」
6. 选择「Android」
7. 下载生成的 APK 文件

### 方案 2: 本地使用 Bubblewrap CLI

**优点：**
- 完全本地控制
- 可自定义配置
- 适合持续集成

**步骤：**

```bash
# 1. 安装 Bubblewrap
npm install -g @aspect-build/aspect-cli
npm install -g @nicolo-ribaudo/chokidar-2

# 或使用 Java 版本
npm install -g @nicolo-ribaudo/chokidar-2
```

实际上推荐使用官方 CLI：

```bash
# 安装 Bubblewrap
npm install -g @nicolo-ribaudo/chokidar-2

# 初始化项目
bubblewrap init --manifest=https://www.666666.monster/crm/manifest.webmanifest

# 构建 APK
bubblewrap build
```

### 方案 3: Android Studio + TWA

**优点：**
- 完全控制
- 可添加原生功能
- 适合长期维护

**步骤：**

1. 安装 Android Studio
2. 创建新项目，选择「Empty Activity」
3. 添加 TWA 依赖：
   ```gradle
   dependencies {
       implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.4.0'
   }
   ```
4. 配置 `AndroidManifest.xml`
5. 创建 `AssetLinks` 文件验证域名所有权
6. 构建 APK

## 推荐方案：PWA Builder

对于当前项目，**强烈推荐使用 PWA Builder**，原因：
1. 零配置，5 分钟完成
2. 无需安装 Android Studio（占用空间大）
3. 自动生成签名证书
4. 支持后续更新

## APK 分发

生成 APK 后，可以通过以下方式分发：

### 1. 网站直接下载

在「我的」页面添加「下载 Android 应用」按钮：

```html
<a href="/downloads/changlianxi.apk" class="download-btn">
  下载 Android 应用
</a>
```

### 2. 二维码下载

生成 APK 下载链接的二维码，用户扫码即可下载。

### 3. 第三方应用市场

- 酷安
- 应用宝
- 华为应用市场
- 小米应用商店

## 注意事项

1. **域名验证**：TWA 需要配置 `assetlinks.json` 验证域名所有权
2. **签名证书**：妥善保管签名证书，丢失后无法更新应用
3. **版本更新**：APK 更新需要用户手动下载安装新版本
4. **权限申请**：如需访问相机、通讯录等，需要在 APK 中声明权限

## 后续优化

如果需要添加原生功能（如推送通知、离线存储优化），可以考虑：
1. 使用 Capacitor 或 Cordova 包装
2. 开发原生 Android 应用
3. 使用 Flutter/React Native 重写
