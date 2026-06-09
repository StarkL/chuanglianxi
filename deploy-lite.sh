#!/bin/bash
# 轻量级部署脚本 - 从本地推送构建好的文件到 VPS
# 用法: bash deploy-lite.sh <VPS_IP> [SSH_USER]

set -e

SERVER_IP="${1:?请提供 VPS IP: bash deploy-lite.sh <VPS_IP> [SSH_USER]}"
SSH_USER="${2:-root}"
REMOTE_DIR="/opt/chuanglianxi"

echo "🚀 开始轻量级部署到 ${SERVER_IP}..."
echo ""

# 1. 打包后端构建产物
echo "📦 打包后端文件..."
cd backend
tar -czf /tmp/backend-dist.tar.gz \
  dist/ \
  prisma/ \
  package.json \
  pnpm-lock.yaml \
  .env.example

echo "✅ 后端打包完成"

# 2. 创建远程目录
echo "📂 创建远程目录..."
ssh ${SSH_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"

# 3. 推送后端文件
echo "📤 推送后端文件..."
scp /tmp/backend-dist.tar.gz ${SSH_USER}@${SERVER_IP}:/tmp/

# 4. 解压并安装依赖
echo "🔧 在 VPS 上解压并安装..."
ssh ${SSH_USER}@${SERVER_IP} << 'EOF'
  cd /opt/chuanglianxi

  # 停止旧服务
  pkill -f "node dist/index.js" 2>/dev/null || true
  sleep 2

  # 解压新文件
  rm -rf dist prisma
  tar -xzf /tmp/backend-dist.tar.gz

  # 确保 .env 存在
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "PORT=5000" >> .env
    echo 'DATABASE_URL="file:./data.db"' >> .env
    echo "⚠️  已创建 .env 文件，请配置实际值！"
  fi

  # 安装生产依赖
  npm install --production

  # 生成 Prisma Client
  npx prisma generate

  # 推送数据库 schema
  npx prisma db push --accept-data-loss

  # 启动服务
  nohup node dist/index.js > app.log 2>&1 &
  echo $! > app.pid

  sleep 3

  # 验证
  echo ""
  echo "🔍 验证服务..."
  if curl -sf http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✅ 后端服务启动成功！"
  else
    echo "❌ 后端服务启动失败，请检查日志："
    tail -20 app.log
  fi
EOF

# 5. 清理临时文件
rm -f /tmp/backend-dist.tar.gz

echo ""
echo "========================================="
echo "  ✅ 部署完成！"
echo "========================================="
echo ""
echo "📍 后端 API: http://${SERVER_IP}:5000/api"
echo "📍 H5 页面:  http://${SERVER_IP}/crm/"
echo "📍 语音速记: http://${SERVER_IP}/crm/pages/voice-note/voice-note"
echo ""
echo "查看日志: ssh ${SSH_USER}@${SERVER_IP} 'tail -f /opt/chuanglianxi/app.log'"
echo "停止服务: ssh ${SSH_USER}@${SERVER_IP} 'pkill -f \"node dist/index.js\"'"
echo ""
