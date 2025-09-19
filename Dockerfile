# 多阶段构建 - 前端构建阶段
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 复制前端package文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# 安装前端依赖
RUN npm ci --only=production --no-audit --no-fund

# 复制前端源码
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY plugins/ ./plugins/

# 构建前端
RUN npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端package文件
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# 安装后端依赖（包括开发依赖用于构建）
RUN npm ci --no-audit --no-fund

# 复制后端源码
COPY backend/src/ ./src/
COPY backend/knexfile.js ./

# 构建后端
RUN npm run build

# 生产环境镜像
FROM node:18-alpine AS production

# 安装系统依赖
RUN apk add --no-cache \
    sqlite \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 复制前端构建产物
COPY --from=frontend-builder --chown=nextjs:nodejs /app/dist ./dist

# 复制后端构建产物和依赖
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package*.json ./backend/
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/knexfile.js ./backend/

# 进入后端目录安装生产依赖
WORKDIR /app/backend
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# 创建必要的目录
RUN mkdir -p data logs uploads/images uploads/videos uploads/files uploads/workflows && \
    chown -R nextjs:nodejs data logs uploads

# 复制启动脚本
COPY --chown=nextjs:nodejs docker/start.sh ./start.sh
RUN chmod +x start.sh

# 切换到非root用户
USER nextjs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 暴露端口
EXPOSE 3001

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]

