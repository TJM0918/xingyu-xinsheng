"use strict";

/**
 * 小白友好启动器：
 * - 不需要安装 MongoDB；
 * - 不需要配置 .env；
 * - 启动一个临时内存数据库，关闭后数据自动清空；
 * - 适合前端联调、演示和截图，不适合正式数据。
 *
 * 使用：npm run dev:memory
 */

process.env.NODE_ENV = "development";
process.env.COOKIE_SECURE = "false";

function line() {
  console.log("====================================================");
}

async function main() {
  line();
  console.log("  星语心声 · 本地演示模式");
  console.log("  第一次启动会下载临时 MongoDB，请耐心等待");
  console.log("  数据只保存在内存里，关闭窗口后会清空");
  line();

  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require("mongodb-memory-server"));
  } catch (error) {
    console.error("");
    console.error("[启动失败] 缺少本地演示数据库依赖。");
    console.error("请在这个文件夹打开终端，执行：npm install");
    console.error("如果仍然失败，请把报错截图发给后端同学。");
    process.exitCode = 1;
    return;
  }

  let mongod;
  try {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: "xingyu_xinsheng" },
    });
  } catch (error) {
    console.error("");
    console.error("[启动失败] 临时数据库没有启动成功。");
    console.error("原因：", error?.message || error);
    console.error("");
    console.error("你可以：");
    console.error("1. 检查网络（首次启动需要下载 MongoDB 二进制）；");
    console.error("2. 重新运行 start-windows.bat / start-mac.command；");
    console.error("3. 如果一直失败，改用 Docker 方式，或联系后端同学。");
    process.exitCode = 1;
    return;
  }

  process.env.MONGODB_URI = mongod.getUri("xingyu_xinsheng");

  const { start, stop } = require("../src/server");

  let server;
  try {
    server = await start();
  } catch (error) {
    console.error("");
    console.error("[启动失败] 后端服务没有启动成功。");
    console.error("原因：", error?.message || error);
    console.error("常见原因：端口 3000 被占用，或 Node 版本低于 18.18。");
    await mongod.stop();
    process.exitCode = 1;
    return;
  }

  line();
  const actualPort = server.address()?.port || process.env.PORT || 3000;
  console.log("  启动成功！");
  console.log(`  浏览器打开：http://localhost:${actualPort}`);
  console.log(`  健康检查：  http://localhost:${actualPort}/api/health`);
  console.log("");
  console.log("  停止服务：在这个窗口按 Ctrl + C");
  console.log("  注意：关闭后，测试数据会清空");
  line();

  let stopping = false;
  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    console.log(`\n[退出] 收到 ${signal}，正在关闭服务...`);
    try {
      await stop(signal);
    } catch (error) {
      console.error("[退出] 关闭服务时出错：", error?.message || error);
    } finally {
      await mongod.stop();
      process.exit(0);
    }
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

main().catch((error) => {
  console.error("[启动失败]", error);
  process.exitCode = 1;
});
