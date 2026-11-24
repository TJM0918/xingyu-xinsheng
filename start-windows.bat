@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 星语心声 - 本地演示模式

echo ====================================================
echo   星语心声 · 本地演示模式
echo ====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有找到 Node.js。
  echo.
  echo 请先安装 Node.js LTS：
  echo https://nodejs.org/zh-cn
  echo.
  echo 安装时勾选 "Add to PATH"，安装完成后重新双击本文件。
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo 检测到 Node.js %NODE_VERSION%
echo.

node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0] < 18 || (v[0] === 18 && v[1] < 18) ? 1 : 0)"
if errorlevel 1 (
  echo [错误] Node.js 版本太低，需要 18.18 或更高版本。
  echo 请到 https://nodejs.org/zh-cn 安装 LTS 版本。
  pause
  exit /b 1
)

if not exist "node_modules\mongodb-memory-server" (
  echo 第一次运行，正在安装依赖，可能需要 3~10 分钟...
  echo 请不要关闭这个窗口。
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败。
    echo 请检查网络，或把本窗口的报错截图发给后端同学。
    pause
    exit /b 1
  )
)

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo 已自动创建 .env（本地演示模式不需要改）
)

echo.
echo 正在启动，请稍等...
echo.
call npm run dev:memory

echo.
echo 服务已停止。
pause
