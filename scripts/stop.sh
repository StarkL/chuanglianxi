#!/bin/bash
# 常联系 - 停止服务脚本
set -e

if [ -f app.pid ]; then
  PID=$(cat app.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "服务已停止 (PID: $PID)"
  else
    echo "进程 $PID 已不存在"
  fi
  rm -f app.pid
else
  pkill -f "node dist/index.js" 2>/dev/null && echo "已停止所有 node dist/index.js 进程" || echo "未运行中的进程"
fi
