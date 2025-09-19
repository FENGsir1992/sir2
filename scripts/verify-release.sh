#!/usr/bin/env bash
set -euo pipefail

# 验证当前发布是否健康（在服务器执行）

APP_DIR="/www/wwwroot/jr-app"
HEALTH_URL="https://www.jiruikeji.top/health"

ok(){ echo -e "[\033[32mOK\033[0m] $*"; }
warn(){ echo -e "[\033[33mWARN\033[0m] $*"; }
err(){ echo -e "[\033[31mERR\033[0m] $*"; }

echo "== 1) 健康检查 =="
code=$(curl -skI "$HEALTH_URL" | awk 'NR==1{print $2}') || code=0
if [ "$code" = "200" ]; then ok "health 200"; else err "health $code"; fi

echo "== 2) current 链接 =="
if [ -L "$APP_DIR/current" ]; then
  target=$(readlink -f "$APP_DIR/current")
  echo "current -> $target"
  [[ "$target" == */releases/* ]] && ok "current 指向 releases 目录" || warn "current 非 releases/"
else
  err "缺少 $APP_DIR/current 符号链接"
fi

echo "== 3) Nginx root 检查 =="
root_conf=$(nginx -T 2>/dev/null | grep -E "^\s*root\s+" | grep -m1 jr-app/current/dist || true)
if [ -n "$root_conf" ]; then ok "Nginx root 已指向 current/dist"; else warn "Nginx root 可能未指向 current/dist"; fi

echo "== 4) PM2 进程 =="
pm2 status | sed -n '1,50p' || true
pm2 jlist 2>/dev/null | grep -q 'jr-backend' && ok "pm2 jr-backend 存在" || warn "pm2 jr-backend 不存在"

echo "== 完成 =="

