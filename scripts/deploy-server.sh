#!/usr/bin/env bash
set -euo pipefail

# 通用部署脚本模板（复制到服务器 /usr/local/bin/deploy-jr.sh 使用）

REPO_URL="git@github.com:FENGsir1992/sir2.git"
REPO_DIR="/www/wwwroot/jr-app-repo"
APP_DIR="/www/wwwroot/jr-app"
RELEASES_DIR="${APP_DIR}/releases"
SHARED_DIR="${APP_DIR}/shared"
TS="$(date +%Y%m%d-%H%M%S)"
REL_DIR="${RELEASES_DIR}/${TS}"

log(){ echo -e "[\033[32mINFO\033[0m] $*"; }
warn(){ echo -e "[\033[33mWARN\033[0m] $*"; }
err(){ echo -e "[\033[31mERR \033[0m] $*" >&2; }

# 0) 如遇镜像 404，可临时启用官方源
export npm_config_registry=${npm_config_registry:-https://registry.npmjs.org}

# 小函数：本地健康检查
health_ok(){
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health || echo 000)
  [[ "$code" == "200" ]]
}

# 1) 拉取最新代码（首次采用稀疏克隆并排除大视频）
if [ ! -d "${REPO_DIR}/.git" ]; then
  log "Clone repo (sparse)"
  git clone --depth=1 --filter=blob:none --sparse "${REPO_URL}" "${REPO_DIR}"
  cd "${REPO_DIR}"
  git sparse-checkout init --no-cone
  git sparse-checkout set '/*' ':(exclude)backend/src/uploads/videos/**'
else
  cd "${REPO_DIR}"
  git fetch --depth=1 origin main || git fetch --all || true
  git reset --hard origin/main
fi

# 2) 构建前端
log "Build frontend"
npm ci
npm run build

# 3) 构建后端（安装生产依赖）
cd "${REPO_DIR}/backend"
npm ci --omit=dev
npm run build
cd - >/dev/null

# 4) 组装发布目录（包含 node_modules）
log "Assemble release: ${REL_DIR}"
mkdir -p "${REL_DIR}/backend"
cp -a "${REPO_DIR}/dist"                         "${REL_DIR}/dist"
cp -a "${REPO_DIR}/backend/dist"                 "${REL_DIR}/backend/dist"
cp -a "${REPO_DIR}/backend/node_modules"         "${REL_DIR}/backend/node_modules"

# 同步脚本（用于自动化验证等）
if [ -d "${REPO_DIR}/scripts" ]; then
  cp -a "${REPO_DIR}/scripts" "${REL_DIR}/scripts"
fi

# 5) 链接共享资源
ln -sfn "${SHARED_DIR}/backend/env.local" "${REL_DIR}/backend/env.local" || true
mkdir -p "${REL_DIR}/backend/"{certs,uploads,logs,data}
ln -sfn "${SHARED_DIR}/backend/certs"   "${REL_DIR}/backend/certs"
ln -sfn "${SHARED_DIR}/backend/uploads" "${REL_DIR}/backend/uploads"
ln -sfn "${SHARED_DIR}/backend/logs"    "${REL_DIR}/backend/logs"
ln -sfn "${SHARED_DIR}/backend/data"    "${REL_DIR}/backend/data"

# 6) 切换 current（记录旧版本以便回滚）
prev_target=""
if [ -L "${APP_DIR}/current" ]; then
  prev_target=$(readlink -f "${APP_DIR}/current" || true)
fi
ln -sfn "${REL_DIR}" "${APP_DIR}/current"

# 7) 启动/重启后端并重载 Nginx（使用正确 cwd）
pm2 start "${APP_DIR}/current/backend/dist/server.js" \
  --name jr-backend --update-env \
  --cwd "${APP_DIR}/current/backend" \
|| pm2 restart jr-backend --update-env --cwd "${APP_DIR}/current/backend"
nginx -t && nginx -s reload || true

# 8) 健康门禁：失败则回滚到上一个版本
retry=30
until health_ok; do
  retry=$((retry-1))
  if [ $retry -le 0 ]; then break; fi
  sleep 2
done

if health_ok; then
  log "Health check 200"
else
  warn "Health check failed, rollback to previous version"
  if [ -n "$prev_target" ] && [ -d "$prev_target" ]; then
    ln -sfn "$prev_target" "${APP_DIR}/current"
    pm2 restart jr-backend --update-env --cwd "${APP_DIR}/current/backend" || true
    nginx -t && nginx -s reload || true
  fi
  err "Deploy aborted due to failed health check"
  exit 1
fi

# 9) 自动化验证脚本（非强制）
if [ -f "${APP_DIR}/current/scripts/verify-release.sh" ]; then
  bash "${APP_DIR}/current/scripts/verify-release.sh" || warn "verify script returned non-zero"
else
  warn "verify-release.sh not found in current/scripts"
fi

# 10) 保留最近 5 个版本
cd "${RELEASES_DIR}" && ls -1tr | head -n -5 | xargs -r rm -rf

log "Deploy done: ${REL_DIR}"

