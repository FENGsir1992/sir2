#!/bin/sh

# 启动脚本 - 用于Docker容器内启动应用

echo "🚀 启动WZ工作流系统..."

# 检查环境变量
if [ -z "$JWT_SECRET" ]; then
  echo "⚠️  警告: JWT_SECRET未设置，使用默认值（不安全）"
fi

# 确保目录存在
mkdir -p data logs uploads/images uploads/videos uploads/files uploads/workflows

# 检查数据库
if [ ! -f "data/database.sqlite" ]; then
  echo "📊 初始化数据库..."
  node dist/database/init.js
fi

# 启动应用
echo "🌟 启动服务器..."
exec node dist/server.js

