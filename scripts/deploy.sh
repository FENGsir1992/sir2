#!/bin/bash

# WZ工作流系统部署脚本
# 使用方法: ./scripts/deploy.sh [development|production]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查参数
ENVIRONMENT=${1:-development}

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    log_error "环境参数错误。使用: $0 [development|production]"
    exit 1
fi

log_info "开始部署WZ工作流系统 - 环境: $ENVIRONMENT"

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p docker/data
    mkdir -p docker/logs
    mkdir -p docker/uploads/images
    mkdir -p docker/uploads/videos
    mkdir -p docker/uploads/files
    mkdir -p docker/uploads/workflows
    mkdir -p docker/ssl
    
    # 设置权限
    chmod 755 docker/data
    chmod 755 docker/logs
    chmod 755 docker/uploads
    
    log_success "目录创建完成"
}

# 检查环境变量
check_environment() {
    log_info "检查环境变量..."
    
    ENV_FILE=".env"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        ENV_FILE=".env.production"
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "环境文件 $ENV_FILE 不存在，创建默认配置..."
        
        if [[ "$ENVIRONMENT" == "production" ]]; then
            cat > "$ENV_FILE" << EOF
# 生产环境配置
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=/app/backend/data/database.sqlite
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
REDIS_PASSWORD=$(openssl rand -base64 16)
GRAFANA_PASSWORD=$(openssl rand -base64 16)
LOG_LEVEL=info
EOF
        else
            cat > "$ENV_FILE" << EOF
# 开发环境配置
NODE_ENV=development
JWT_SECRET=wz-super-secret-jwt-key-2024-development-only
DATABASE_URL=/app/backend/data/database.sqlite
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
REDIS_PASSWORD=wzredis123
GRAFANA_PASSWORD=admin123
LOG_LEVEL=debug
PORT=3001
EOF
        fi
        
        log_warning "请编辑 $ENV_FILE 文件并设置正确的配置值"
        log_warning "生产环境请务必修改默认密码！"
    fi
    
    # 加载环境变量
    set -a
    source "$ENV_FILE"
    set +a
    
    log_success "环境变量检查完成"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待应用启动
    for i in {1..30}; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            break
        fi
        log_info "等待服务启动... ($i/30)"
        sleep 2
    done
    
    if ! curl -f http://localhost:3001/health &> /dev/null; then
        log_error "服务启动超时"
        exit 1
    fi
    
    log_success "服务就绪"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.prod.yml exec app npm run migrate
    else
        docker-compose exec app npm run migrate
    fi
    
    log_success "数据库迁移完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    log_info "服务访问地址:"
    log_info "  - 应用: http://localhost:3001"
    log_info "  - API文档: http://localhost:3001/api-docs"
    log_info "  - 健康检查: http://localhost:3001/health"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "  - 监控面板: http://localhost:3000 (Grafana)"
    fi
    
    echo
    log_info "有用的命令:"
    log_info "  - 查看日志: docker-compose logs -f"
    log_info "  - 停止服务: docker-compose down"
    log_info "  - 重启服务: docker-compose restart"
    
    echo
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "生产环境部署注意事项:"
        log_warning "  - 请配置SSL证书"
        log_warning "  - 请设置防火墙规则"
        log_warning "  - 请定期备份数据库"
        log_warning "  - 请监控系统资源使用情况"
    fi
}

# 主要部署流程
main() {
    check_dependencies
    create_directories
    check_environment
    build_images
    start_services
    wait_for_services
    # run_migrations  # 如果需要的话取消注释
    show_deployment_info
}

# 错误处理
trap 'log_error "部署失败！"; exit 1' ERR

# 执行部署
main

log_success "部署脚本执行完成！"

