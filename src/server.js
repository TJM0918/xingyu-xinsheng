"use strict";

const config = require("./config");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { createApp } = require("./app");

let server = null;
let shuttingDown = false;

async function start() {
  await connectDatabase();

  const app = createApp();
  server = app.listen(config.port);

  await new Promise((resolve, reject) => {
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    server.once("listening", onListening);
    server.once("error", onError);
  });

  console.info(
    `[server] 星语心声 API 已启动：http://127.0.0.1:${config.port} (${config.env})`
  );

  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;

  server.on("error", (error) => {
    console.error("[server] listen error:", error);
  });

  return server;
}

async function stop(signal = "manual") {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[server] shutting down (${signal})...`);

  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
    server = null;
  }
  await disconnectDatabase();
}

if (require.main === module) {
  start().catch((error) => {
    console.error("[server] 启动失败：", error);
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      stop(signal)
        .then(() => process.exit(0))
        .catch((error) => {
          console.error("[server] 关闭失败：", error);
          process.exit(1);
        });
    });
  }

  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandled rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[process] uncaught exception:", error);
    stop("uncaughtException").finally(() => process.exit(1));
  });
}

module.exports = { start, stop };
