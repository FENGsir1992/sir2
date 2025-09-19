#!/usr/bin/env bash
set -euo pipefail

# 一键命令：发布 → 切 Nginx root → 自动验证

DEPLOY="/usr/local/bin/deploy-jr.sh"
SWITCH="/usr/local/bin/nginx-switch-root.sh"

echo "[1/3] 部署最新代码..."
$DEPLOY

echo "[2/3] 切换 Nginx root 到 current/dist..."
$SWITCH

echo "[3/3] 自动化验证..."
if [ -f /www/wwwroot/jr-app/current/scripts/verify-release.sh ]; then
  bash /www/wwwroot/jr-app/current/scripts/verify-release.sh
else
  echo "[WARN] verify-release.sh 不存在"
fi

echo "[DONE] 一键发布完成"

