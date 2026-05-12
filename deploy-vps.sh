#!/bin/bash
# 常联系 CRM - VPS 一键部署脚本
# 用法: bash deploy-vps.sh
set -e

APP_DIR="/home/admin/chuanglianxi"
FRONTEND_DIR="/usr/share/nginx/html/crm"
BACKEND_DIR="$APP_DIR/backend"

echo "========================================="
echo "  常联系 CRM VPS 部署"
echo "  后端端口: 5000 | 数据库: SQLite"
echo "========================================="

# 1. 拉取最新代码
echo ""
echo ">> [1/5] 拉取最新代码..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ -d ".git" ]; then
  git pull
else
  echo "首次部署，请手动执行: git clone git@github.com:StarkL/chuanglianxi.git $APP_DIR"
  exit 1
fi

# 2. 确保 .env 文件存在且配置正确
echo ">> [2/5] 检查环境变量配置..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "首次部署: 创建 .env 文件..."
  cp "$APP_DIR/backend/.env.example" "$BACKEND_DIR/.env"
fi

# 确保 PORT=5000
if ! grep -q "^PORT=" "$BACKEND_DIR/.env"; then
  echo "PORT=5000" >> "$BACKEND_DIR/.env"
else
  sed -i 's/^PORT=.*/PORT=5000/' "$BACKEND_DIR/.env"
fi

# 确保 DATABASE_URL 正确
if ! grep -q "^DATABASE_URL=" "$BACKEND_DIR/.env"; then
  echo 'DATABASE_URL="file:./data.db"' >> "$BACKEND_DIR/.env"
else
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL="file:./data.db"|' "$BACKEND_DIR/.env"
fi

# 3. 安装后端依赖并构建
echo ">> [3/5] 安装后端依赖并构建..."
cd "$BACKEND_DIR"
pnpm install --prod
pnpm build

# 4. 推送数据库 schema
echo ">> [4/5] 推送数据库 schema..."
npx prisma generate
npx prisma db push --accept-data-loss

# 5. 构建前端 H5
echo ">> [5/5] 构建前端 H5..."
cd "$APP_DIR/frontend"
pnpm install
pnpm build:h5

# 同步前端静态文件到 Nginx 目录
echo ">> 同步前端文件到 Nginx 目录..."
mkdir -p "$FRONTEND_DIR"
rm -rf "$FRONTEND_DIR"/*
cp -r "$APP_DIR/frontend/dist/build/h5/"* "$FRONTEND_DIR/"

# 6. 重启后端服务
echo ""
echo ">> 重启后端服务..."
pkill -f "node dist/index.js" 2>/dev/null || true
sleep 2

cd "$BACKEND_DIR"
nohup node dist/index.js > app.log 2>&1 &
echo $! > "$APP_DIR/app.pid"

sleep 3

# 7. 验证
echo ""
echo "========================================="
echo "  部署完成，验证中..."
echo "========================================="

echo ""
echo ">> 后端进程 PID: $(cat "$APP_DIR/app.pid")"
echo ">> 端口监听:"
ss -tlnp | grep 5000 || echo "⚠️  端口 5000 未监听！"

echo ""
echo ">> 健康检查:"
curl -sf http://127.0.0.1:5000/api/health && echo "" || echo "⚠️  健康检查失败！"

echo ""
echo ">> 最近日志:"
tail -5 "$BACKEND_DIR/app.log"

echo ""
echo "========================================="
echo "  访问地址: http://你的域名/crm/"
echo "  日志查看: tail -f $BACKEND_DIR/app.log"
echo "  停止服务: pkill -f 'node dist/index.js'"
echo "========================================="
