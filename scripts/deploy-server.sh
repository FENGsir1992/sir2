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

# 1) 拉取最新代码
if [ ! -d "${REPO_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${REPO_DIR}"
fi
cd "${REPO_DIR}"
git fetch --all
git reset --hard origin/main

# 2) 构建前端
log "Build frontend"
npm ci
npm run build

# 3) 构建后端
cd "${REPO_DIR}/backend"
npm ci
npm run build
cd -

# 4) 组装发布目录
log "Assemble release: ${REL_DIR}"
mkdir -p "${REL_DIR}/backend"
cp -a "${REPO_DIR}/dist"                 "${REL_DIR}/dist"
cp -a "${REPO_DIR}/backend/dist"         "${REL_DIR}/backend/dist"

# 同步脚本（用于自动化验证等）
if [ -d "${REPO_DIR}/scripts" ]; then
  cp -a "${REPO_DIR}/scripts" "${REL_DIR}/scripts"
fi

# 5) 链接共享资源
ln -sfn "${SHARED_DIR}/backend/env.local" "${REL_DIR}/backend/env.local"
mkdir -p "${REL_DIR}/backend/"{certs,uploads,logs,data}
ln -sfn "${SHARED_DIR}/backend/certs"   "${REL_DIR}/backend/certs"
ln -sfn "${SHARED_DIR}/backend/uploads" "${REL_DIR}/backend/uploads"
ln -sfn "${SHARED_DIR}/backend/logs"    "${REL_DIR}/backend/logs"
ln -sfn "${SHARED_DIR}/backend/data"    "${REL_DIR}/backend/data"

# 6) 切换 current
ln -sfn "${REL_DIR}" "${APP_DIR}/current"

# 7) 重启后端 & reload Nginx
pm2 start "${APP_DIR}/current/backend/dist/server.js" --name jr-backend --update-env || pm2 restart jr-backend
nginx -t && nginx -s reload || true

# 8) 自动化验证
if [ -f "${APP_DIR}/current/scripts/verify-release.sh" ]; then
  bash "${APP_DIR}/current/scripts/verify-release.sh" || warn "verify script returned non-zero"
else
  warn "verify-release.sh not found in current/scripts"
fi

# 9) 保留最近 5 个版本
cd "${RELEASES_DIR}" && ls -1tr | head -n -5 | xargs -r rm -rf

log "Deploy done: ${REL_DIR}"

