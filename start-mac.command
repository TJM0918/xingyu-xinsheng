#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "===================================================="
echo "  星语心声 · 本地演示模式"
echo "===================================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 没有找到 Node.js。"
  echo
  echo "请先安装 Node.js LTS：https://nodejs.org/zh-cn"
  echo "安装完成后重新运行本文件。"
  read -r -p "按回车键退出..."
  exit 1
fi

echo "检测到 Node.js $(node -v)"
echo

if ! node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0] < 18 || (v[0] === 18 && v[1] < 18) ? 1 : 0)"; then
  echo "[错误] Node.js 版本太低，需要 18.18 或更高版本。"
  echo "请到 https://nodejs.org/zh-cn 安装 LTS 版本。"
  read -r -p "按回车键退出..."
  exit 1
fi

if [ ! -d "node_modules/mongodb-memory-server" ]; then
  echo "第一次运行，正在安装依赖，可能需要 3~10 分钟..."
  echo "请不要关闭这个窗口。"
  echo
  npm install
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "已自动创建 .env（本地演示模式不需要改）"
fi

echo
echo "正在启动，请稍等..."
echo
npm run dev:memory
