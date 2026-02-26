#!/bin/bash

echo "=========================================="
echo "考研自测系统自动诊断脚本"
echo "=========================================="
echo ""

# 1. 检查代码版本
echo "📦 [1/6] 检查代码版本..."
cd /opt/kaoyan-quiz-system
echo "当前最新提交："
git log --oneline -1
echo ""

# 2. 检查目录结构
echo "📦 [2/6] 检查目录结构..."
echo "uploads 目录状态："
if [ -d "uploads" ]; then
    echo "✅ uploads 目录存在"
    echo "权限："
    ls -ld uploads
    echo "内容："
    ls -lh uploads 2>/dev/null || echo "（空）"
else
    echo "❌ uploads 目录不存在，正在创建..."
    mkdir -p uploads
    chmod 755 uploads
    echo "✅ 已创建 uploads 目录"
fi
echo ""

# 3. 检查 Node.js 环境
echo "📦 [3/6] 检查 Node.js 环境..."
echo "Node.js 版本："
node --version
echo "npm 版本："
npm --version
echo "pnpm 版本："
pnpm --version
echo ""

# 4. 检查应用状态
echo "📦 [4/6] 检查应用状态..."
echo "运行中的进程："
ps aux | grep -E "pnpm|node" | grep -v grep | head -5
echo ""
echo "端口监听状态："
netstat -tlnp 2>/dev/null | grep -E ":5000|:3000" || ss -tlnp 2>/dev/null | grep -E ":5000|:3000" || echo "未检测到端口监听"
echo ""

# 5. 检查最近日志
echo "📦 [5/6] 检查最近日志..."
echo "最近 50 行日志："
tail -50 app.log | grep -v "^$" | head -30
echo ""

# 6. 检查环境变量
echo "📦 [6/6] 检查环境变量..."
echo ".env.local 文件状态："
if [ -f ".env.local" ]; then
    echo "✅ .env.local 存在"
    echo "环境变量（已隐藏敏感信息）："
    grep -E "^[A-Z_]+=" .env.local | sed 's/=.*/=***/'
else
    echo "❌ .env.local 不存在"
fi
echo ""

echo "=========================================="
echo "✅ 诊断完成"
echo "=========================================="

# 自动修复
echo ""
echo "🔧 开始自动修复..."
echo ""

# 1. 确保是最新代码
echo "📦 [修复 1/3] 拉取最新代码..."
git pull
echo ""

# 2. 创建 uploads 目录
echo "📦 [修复 2/3] 创建 uploads 目录..."
mkdir -p uploads
chmod 755 uploads
echo ""

# 3. 重新构建和重启
echo "📦 [修复 3/3] 重新构建和重启..."
pkill -f "pnpm start" 2>/dev/null || true
pnpm run build
nohup pnpm start > app.log 2>&1 &
sleep 3

echo ""
echo "=========================================="
echo "✅ 修复完成！"
echo "=========================================="
echo ""
echo "现在可以尝试重新上传文档了！"
echo ""
echo "查看实时日志："
echo "  tail -f /opt/kaoyan-quiz-system/app.log"
echo ""
