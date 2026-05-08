#!/bin/bash
# 常联系 - 服务器部署脚本
# 用法：在服务器上执行 bash deploy.sh

set -e

echo "===== 常联系部署开始 ====="

# 1. 检查 Docker
if ! command -v docker &>/dev/null; then
    echo "❌ Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable --now docker
fi

# 2. 检查 docker compose
if ! docker compose version &>/dev/null; then
    echo "❌ Docker Compose 未安装，正在安装..."
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 3. 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件"
    echo "   请复制 .env.example 为 .env 并填写实际值："
    echo "   cp .env.example .env"
    echo "   vim .env"
    exit 1
fi

# 4. 创建目录
mkdir -p frontend/dist/build/h5

# 5. 拉取最新代码
echo "📦 拉取最新代码..."
git pull origin master

# 6. 构建前端
echo "🔨 构建前端..."
cd frontend
pnpm install
pnpm build:h5
cd ..

# 7. 启动服务
echo "🚀 启动服务..."
docker compose -f docker-compose.prod.yml up -d --build

# 8. 数据库迁移
echo "🗄️  运行数据库迁移..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

echo ""
echo "===== 部署完成！====="
echo ""
echo "检查服务状态："
docker compose -f docker-compose.prod.yml ps
echo ""
echo "查看后端日志："
docker compose -f docker-compose.prod.yml logs -f backend
echo ""
echo "访问应用：http://服务器IP"
