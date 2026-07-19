#!/bin/bash
# Open 常联系 mini program in WeChat DevTools
# Usage: ./scripts/open-devtools.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEIXIN_PROJECT="$PROJECT_ROOT/frontend/dist/build/mp-weixin"
CLI="/c/Program Files (x86)/Tencent/微信web开发者工具/cli.bat"
PORT=35134

# Build first
echo "Building mp-weixin..."
cd "$PROJECT_ROOT/frontend" && npm run build:mp-weixin

# Open in WeChat DevTools
echo "Opening in WeChat DevTools..."
"$CLI" open --project "$WEIXIN_PROJECT" --port "$PORT"
