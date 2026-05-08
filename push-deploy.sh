#!/bin/bash
# 从本地推送代码到服务器并执行部署
# 用法：bash push-deploy.sh <服务器IP>
# 示例：bash push-deploy.sh 47.xxx.xxx.xxx

set -e

SERVER_IP="${1:?请提供服务器IP: bash push-deploy.sh <服务器IP>}"
SSH_USER="${2:-root}"
REMOTE_PATH="/opt/changlianxi"

echo "===== 推送并部署到 $SERVER_IP ====="

# 1. 先构建前端
echo "🔨 构建前端..."
cd frontend
pnpm install
pnpm build:h5
cd ..

# 2. 确保服务器上目录存在
ssh ${SSH_USER}@${SERVER_IP} "mkdir -p ${REMOTE_PATH}"

# 3. 推送代码到服务器
echo "📤 推送代码..."
rsync -avz --exclude='node_modules' --exclude='.git' \
    --exclude='.claude' --exclude='.planning' \
    --exclude='.agents' --exclude='skills' \
    --exclude='*.log' --exclude='test-results' \
    --exclude='.claude/worktrees' \
    ./ ${SSH_USER}@${SERVER_IP}:${REMOTE_PATH}/

# 4. 执行部署
echo "🚀 执行部署..."
ssh ${SSH_USER}@${SERVER_IP} "cd ${REMOTE_PATH} && bash deploy.sh"

echo "===== 完成！====="
