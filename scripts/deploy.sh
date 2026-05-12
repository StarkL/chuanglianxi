#!/bin/bash
# 常联系 - VPS 部署脚本（端口 5000 + SQLite）
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR/backend"

echo "=== 常联系 部署开始 (端口: 5000) ==="

# 1. 安装依赖
echo ">> 安装依赖..."
pnpm install --frozen-lockfile

# 2. 生成 Prisma 客户端
echo ">> 生成 Prisma 客户端..."
npx prisma generate

# 3. 推送数据库 schema（首次部署或 schema 变更时）
echo ">> 推送数据库 schema..."
npx prisma db push --accept-data-loss

# 4. 构建
echo ">> 构建项目..."
pnpm build

# 5. 停止旧进程
echo ">> 停止旧进程..."
if [ -f app.pid ]; then
  kill $(cat app.pid) 2>/dev/null || true
  sleep 2
  rm -f app.pid
else
  pkill -f "node dist/index.js" 2>/dev/null || true
  sleep 2
fi

# 6. 启动新进程（在 backend 目录下运行，确保 .env 正确加载）
echo ">> 启动新进程..."
nohup node dist/index.js > app.log 2>&1 &
echo $! > app.pid

echo "=== 部署完成 ==="
echo "后端端口: 5000"
echo "进程 PID: $(cat app.pid)"
echo "日志: tail -f backend/app.log"
echo "停止: bash scripts/stop.sh"
echo "健康检查: curl http://127.0.0.1:5000/api/health"
