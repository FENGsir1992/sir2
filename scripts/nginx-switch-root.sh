#!/usr/bin/env bash
set -euo pipefail

# 作用：将站点 root 切换为 /www/wwwroot/jr-app/current/dist，并自动备份当前 Nginx 配置。
# 适配宝塔目录结构（/www/server/nginx/conf/nginx.conf 与 vhost conf）。

NGINX_MAIN_CONF="/www/server/nginx/conf/nginx.conf"
BACKUP_DIR="/root/nginx-backups"
TARGET_ROOT="/www/wwwroot/jr-app/current/dist"

mkdir -p "$BACKUP_DIR"
cp -a "$NGINX_MAIN_CONF" "$BACKUP_DIR/nginx.conf.$(date +%F_%H-%M-%S).bak"

echo "[INFO] 备份主配置: $BACKUP_DIR"

# 在当前启用的 server 块内，将 root 行替换为目标 root。
# 该替换较为通用：找到包含 'server_name www.jiruikeji.top' 的 server 段，替换其中 root。

awk -v target="$TARGET_ROOT" '
  BEGIN{in_srv=0}
  {
    if ($0 ~ /server\s*\{/){srv_depth++}
    if ($0 ~ /server_name[[:space:]]+www\.jiruikeji\.top/){in_srv=1}
    if (in_srv && $0 ~ /root[[:space:]]+/){ sub(/root[[:space:]]+[^;]+;/, "root " target ";"); }
    print
    if ($0 ~ /\}/ && srv_depth>0){srv_depth--; if (srv_depth==0) in_srv=0}
  }
' "$NGINX_MAIN_CONF" > "$NGINX_MAIN_CONF.tmp"

mv "$NGINX_MAIN_CONF.tmp" "$NGINX_MAIN_CONF"

nginx -t && nginx -s reload
echo "[OK] 已切换 root 到: $TARGET_ROOT，并重载 Nginx"


