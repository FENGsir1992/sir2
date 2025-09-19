# WZ工作流系统部署指南

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+
- **Docker**: 20.0+
- **Docker Compose**: 2.0+
- **操作系统**: Linux/macOS/Windows

### 一键部署

```bash
# 克隆项目
git clone <repository-url>
cd WZZ

# 开发环境部署
./scripts/deploy.sh development

# 生产环境部署
./scripts/deploy.sh production
```

## 📋 详细部署步骤

### 1. 环境配置

#### 开发环境
```bash
# 复制环境配置
cp env.example .env

# 编辑配置文件
nano .env
```

#### 生产环境
```bash
# 复制生产环境配置
cp env.production.example .env.production

# 编辑配置文件（重要：修改所有默认密码！）
nano .env.production
```

### 2. 必需的配置项

#### 安全配置
```env
# 生成强JWT密钥
JWT_SECRET=$(openssl rand -base64 64)

# 设置强密码
REDIS_PASSWORD=$(openssl rand -base64 32)
GRAFANA_PASSWORD=$(openssl rand -base64 32)
```

#### 域名配置
```env
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

### 3. SSL证书配置（生产环境）

```bash
# 创建SSL目录
mkdir -p docker/ssl

# 复制证书文件
cp your-cert.pem docker/ssl/cert.pem
cp your-key.pem docker/ssl/key.pem

# 设置权限
chmod 600 docker/ssl/*
```

### 4. 启动服务

#### 使用Docker Compose
```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

#### 验证部署
```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 健康检查
curl http://localhost:3001/health
```

## 🔧 服务配置

### 主要服务端口

| 服务 | 端口 | 描述 |
|------|------|------|
| 应用主服务 | 3001 | API和静态文件服务 |
| Nginx | 80/443 | 反向代理和负载均衡 |
| Redis | 6379 | 缓存服务 |
| Grafana | 3000 | 监控面板 |

### 数据卷映射

```yaml
volumes:
  - ./docker/data:/app/backend/data          # 数据库文件
  - ./docker/logs:/app/backend/logs          # 应用日志
  - ./docker/uploads:/app/backend/uploads    # 用户上传文件
```

## 📊 监控和日志

### 日志查看
```bash
# 查看应用日志
docker-compose logs app

# 查看Nginx日志
docker-compose logs nginx

# 实时日志
docker-compose logs -f --tail=100
```

### 监控面板
访问 `http://localhost:3000` 查看Grafana监控面板

默认登录信息：
- 用户名: admin
- 密码: 在环境变量中设置的 `GRAFANA_PASSWORD`

### 性能监控
```bash
# 缓存统计
curl http://localhost:3001/api/cache/stats

# 健康检查
curl http://localhost:3001/health
```

## 🔒 安全最佳实践

### 1. 密码安全
- 更改所有默认密码
- 使用强密码（至少32位随机字符）
- 定期轮换密钥

### 2. 网络安全
```bash
# 配置防火墙
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 3. SSL配置
- 使用有效的SSL证书
- 启用HTTPS重定向
- 配置HSTS头

### 4. 定期更新
```bash
# 更新Docker镜像
docker-compose pull
docker-compose up -d

# 备份数据
cp docker/data/database.sqlite backups/database-$(date +%Y%m%d).sqlite
```

## 🔄 备份和恢复

### 数据备份
```bash
#!/bin/bash
# 创建备份脚本 backup.sh

BACKUP_DIR="backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份数据库
cp docker/data/database.sqlite $BACKUP_DIR/
# 备份上传文件
tar -czf $BACKUP_DIR/uploads.tar.gz docker/uploads/
# 备份配置文件
cp .env.production $BACKUP_DIR/

echo "备份完成: $BACKUP_DIR"
```

### 数据恢复
```bash
#!/bin/bash
# 恢复脚本 restore.sh

BACKUP_DATE=$1
if [ -z "$BACKUP_DATE" ]; then
    echo "使用方法: $0 YYYYMMDD"
    exit 1
fi

BACKUP_DIR="backups/$BACKUP_DATE"

# 停止服务
docker-compose down

# 恢复数据库
cp $BACKUP_DIR/database.sqlite docker/data/
# 恢复上传文件
tar -xzf $BACKUP_DIR/uploads.tar.gz -C .

# 启动服务
docker-compose up -d

echo "恢复完成: $BACKUP_DATE"
```

## 🐛 故障排除

### 常见问题

#### 1. 服务无法启动
```bash
# 检查端口占用
netstat -tlnp | grep :3001

# 检查Docker日志
docker-compose logs app
```

#### 2. 数据库连接失败
```bash
# 检查数据库文件权限
ls -la docker/data/

# 重新初始化数据库
docker-compose exec app npm run migrate
```

#### 3. 文件上传失败
```bash
# 检查上传目录权限
ls -la docker/uploads/

# 修复权限
chmod -R 755 docker/uploads/
```

#### 4. 内存不足
```bash
# 检查内存使用
docker stats

# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能调优

#### 1. 数据库优化
```sql
-- 在SQLite中执行
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;
```

#### 2. Nginx优化
```nginx
# 在nginx.conf中添加
worker_processes auto;
worker_connections 2048;
keepalive_timeout 30;
client_max_body_size 200M;
```

#### 3. 应用优化
```env
# 在.env中设置
DATABASE_POOL_MAX=20
LOG_LEVEL=warn
NODE_ENV=production
```

## 📞 支持和维护

### 联系方式
- 技术支持: support@wz.com
- 文档更新: docs@wz.com

### 定期维护任务
- [ ] 每周检查日志文件大小
- [ ] 每月更新Docker镜像
- [ ] 每季度备份验证
- [ ] 每年SSL证书更新

### 监控指标
- 应用响应时间 < 500ms
- 错误率 < 1%
- 内存使用率 < 80%
- 磁盘使用率 < 90%

---

## 📚 相关文档

- [API文档](http://localhost:3001/api-docs)
- [代码审查报告](CODE_REVIEW_SUMMARY.md)
- [安全指南](SECURITY.md)
- [开发指南](README.md)

