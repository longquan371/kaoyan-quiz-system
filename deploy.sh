#!/bin/bash

# 考研自测系统部署脚本
# 在阿里云服务器上运行此脚本

set -e

echo "=========================================="
echo "开始部署考研自测系统到阿里云服务器"
echo "=========================================="

# 1. 更新系统
echo "📦 [1/8] 更新系统..."
apt-get update -y

# 2. 安装基础工具
echo "📦 [2/8] 安装基础工具..."
apt-get install -y git curl

# 3. 安装 Node.js 20 (LTS)
echo "📦 [3/8] 安装 Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. 安装 pnpm
echo "📦 [4/8] 安装 pnpm..."
npm install -g pnpm

# 5. 克隆代码
echo "📦 [5/8] 克隆代码..."
cd /opt
if [ -d "kaoyan-quiz-system" ]; then
    cd kaoyan-quiz-system
    git pull
else
    git clone https://github.com/longquan371/kaoyan-quiz-system.git
    cd kaoyan-quiz-system
fi

# 6. 创建环境变量文件
echo "📦 [6/8] 配置环境变量..."
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://mbpsvzgdpptpqmqadsvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icHN2emdkcHB0cHFtcWFkc3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkwOTIsImV4cCI6MjA4NzY4NTA5Mn0.zIPAsJeviKy73TQ495xVpNnmCZcEWmEj8bV5gqwidZ4
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icHN2emdkcHB0cHFtcWFkc3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwOTA5MiwiZXhwIjoyMDg3Njg1MDkyfQ.pyRnJCeD-uRgHHjJgCgdifEFJj_PGnxOZbIGpU-E4x8
DATABASE_URL=postgresql://postgres:[hIfl8srqdj6FQdxv]@db.mbpsvzgdpptpqmqadsvx.supabase.co:5432/postgres
EOF

# 7. 安装依赖并构建
echo "📦 [7/8] 安装依赖并构建..."
pnpm install
pnpm run build

# 8. 启动应用
echo "📦 [8/8] 启动应用..."
pkill -f "pnpm start" || true
nohup pnpm start > /opt/kaoyan-quiz-system/app.log 2>&1 &

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "访问地址: http://123.57.142.236:5000"
echo "日志查看: tail -f /opt/kaoyan-quiz-system/app.log"
echo "=========================================="
