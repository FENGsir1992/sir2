#!/bin/bash

# 生产环境优化设置脚本
# 使用方法: ./scripts/production-setup.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "建议不要以root用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 系统优化
optimize_system() {
    log_info "优化系统设置..."
    
    # 增加文件描述符限制
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # 优化内核参数
    cat << EOF | sudo tee -a /etc/sysctl.conf
# WZ应用优化
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.tcp_keepalive_time = 600
fs.file-max = 2097152
EOF
    
    sudo sysctl -p
    log_success "系统优化完成"
}

# Node.js生产环境设置
setup_nodejs_production() {
    log_info "配置Node.js生产环境..."
    
    # 设置NODE_ENV
    echo "NODE_ENV=production" | sudo tee -a /etc/environment
    
    # 安装PM2进程管理器
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        log_success "PM2已安装"
    fi
    
    # 创建PM2配置文件
    cat << EOF > ecosystem.config.js
module.exports = {
  apps: [{
    name: 'wz-backend',
    script: './backend/dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
EOF
    
    log_success "Node.js生产环境配置完成"
}

# 数据库优化
optimize_database() {
    log_info "优化数据库设置..."
    
    # SQLite优化配置
    cat << EOF > backend/sqlite-optimize.sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456;
VACUUM;
ANALYZE;
EOF
    
    log_success "数据库优化脚本已创建"
}

# 安全设置
setup_security() {
    log_info "配置安全设置..."
    
    # 创建专用用户
    if ! id "wzapp" &>/dev/null; then
        sudo useradd -r -s /bin/false wzapp
        log_success "已创建wzapp用户"
    fi
    
    # 设置文件权限
    sudo chown -R wzapp:wzapp backend/data
    sudo chown -R wzapp:wzapp backend/logs
    sudo chown -R wzapp:wzapp backend/uploads
    
    chmod 750 backend/data
    chmod 750 backend/logs
    chmod 755 backend/uploads
    
    # 创建systemd服务
    cat << EOF | sudo tee /etc/systemd/system/wzapp.service
[Unit]
Description=WZ Workflow Application
After=network.target

[Service]
Type=forking
User=wzapp
Group=wzapp
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable wzapp
    
    log_success "安全设置完成"
}

# 监控设置
setup_monitoring() {
    log_info "配置监控..."
    
    # 创建监控脚本
    cat << 'EOF' > scripts/health-monitor.sh
#!/bin/bash
# 健康监控脚本

LOG_FILE="/var/log/wzapp-health.log"
API_URL="http://localhost:3001/health"

check_health() {
    local response=$(curl -s -w "%{http_code}" "$API_URL" -o /tmp/health_response.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "$(date): Health check passed" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Health check failed - HTTP $http_code" >> "$LOG_FILE"
        return 1
    fi
}

# 执行健康检查
if ! check_health; then
    echo "$(date): Attempting to restart service" >> "$LOG_FILE"
    sudo systemctl restart wzapp
    sleep 30
    
    if check_health; then
        echo "$(date): Service restart successful" >> "$LOG_FILE"
    else
        echo "$(date): Service restart failed - manual intervention required" >> "$LOG_FILE"
        # 发送告警邮件或通知
    fi
fi
EOF
    
    chmod +x scripts/health-monitor.sh
    
    # 添加到crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/scripts/health-monitor.sh") | crontab -
    
    log_success "监控设置完成"
}

# 备份设置
setup_backup() {
    log_info "配置备份策略..."
    
    mkdir -p backups
    
    cat << 'EOF' > scripts/backup.sh
#!/bin/bash
# 数据备份脚本

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份数据库
cp backend/data/database.sqlite "$BACKUP_DIR/"

# 备份上传文件
tar -czf "$BACKUP_DIR/uploads.tar.gz" backend/uploads/

# 备份配置文件
cp .env.production "$BACKUP_DIR/" 2>/dev/null || true
cp backend/env.local "$BACKUP_DIR/" 2>/dev/null || true

# 清理30天前的备份
find backups/ -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
EOF
    
    chmod +x scripts/backup.sh
    
    # 添加每日备份任务
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/backup.sh") | crontab -
    
    log_success "备份设置完成"
}

# 性能调优
performance_tuning() {
    log_info "应用性能调优..."
    
    # 创建性能优化配置
    cat << EOF > backend/production.config.json
{
  "server": {
    "keepAliveTimeout": 65000,
    "headersTimeout": 66000,
    "requestTimeout": 30000,
    "bodyParser": {
      "limit": "10mb"
    }
  },
  "database": {
    "pool": {
      "min": 5,
      "max": 20,
      "acquireTimeoutMillis": 30000,
      "idleTimeoutMillis": 300000
    }
  },
  "cache": {
    "defaultTTL": 600,
    "checkPeriod": 120,
    "maxKeys": 10000
  }
}
EOF
    
    log_success "性能调优配置完成"
}

# 主函数
main() {
    log_info "开始生产环境优化设置..."
    
    check_root
    optimize_system
    setup_nodejs_production
    optimize_database
    setup_security
    setup_monitoring
    setup_backup
    performance_tuning
    
    log_success "生产环境优化设置完成！"
    
    echo
    log_info "下一步操作："
    echo "1. 复制 env.production.example 为 .env.production 并配置"
    echo "2. 运行: npm run build (前端和后端)"
    echo "3. 运行: sudo systemctl start wzapp"
    echo "4. 检查服务状态: sudo systemctl status wzapp"
    echo "5. 查看日志: pm2 logs"
}

# 执行主函数
main "$@"

