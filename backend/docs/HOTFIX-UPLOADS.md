# Hotfix：统一 /uploads 到后端 + shared

- Nginx 仅保留：`location ^~ /uploads/ { proxy_pass http://127.0.0.1:3001; }`
- 后端/前端 uploads  `/www/wwwroot/jr-app/shared/uploads`
- 发布后执行：`/www/wwwroot/jr-app/scripts/post-release.sh`
- 验证：curl -I 127.0.0.1:3001 与域名两路均 200
- 回滚：恢复 vhost 旧配置；移除软链并还原原目录