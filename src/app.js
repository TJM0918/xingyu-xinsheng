"use strict";

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const config = require("./config");
const { requestContext, requestLogger } = require("./middleware/request");
const { corsPolicy } = require("./middleware/cors");
const { identity } = require("./middleware/identity");
const { globalLimiter } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const sessionRoutes = require("./routes/session");
const treeholeRoutes = require("./routes/treeholes");
const mailboxRoutes = require("./routes/mailbox");
const statsRoutes = require("./routes/stats");
const miscRoutes = require("./routes/misc");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use(requestContext);
  app.use(requestLogger);
  app.use(corsPolicy);
  app.use(
    helmet({
      // 当前前端是单文件、内联脚本/样式的展示页；开启严格 CSP 会直接白屏。
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "32kb", type: "application/json" }));
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    const state = mongoose.connection.readyState;
    const db = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }[state] || "unknown";
    const ok = state === 1;

    res.status(ok ? 200 : 503).json({
      ok,
      data: {
        status: ok ? "ok" : "degraded",
        db,
        version: config.version,
        uptimeSeconds: Math.round(process.uptime()),
        time: new Date().toISOString(),
      },
      requestId: req.requestId,
    });
  });
  app.get("/healthz", (req, res) => res.redirect(307, "/api/health"));

  // 只有 API 需要匿名身份与 Cookie；静态页面本身不种 Cookie。
  app.use("/api", identity);
  app.use("/api", globalLimiter);
  app.use("/api", (req, res, next) => {
    if (!res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api", (req, res) => {
    res.json({
      ok: true,
      data: {
        name: "星语心声 API",
        version: config.version,
        docs: "见仓库 README.md",
        endpoints: {
          session: "/api/session",
          meta: "/api/meta",
          analyze: "POST /api/analyze",
          treeholes: "/api/treeholes",
          mine: "/api/treeholes/mine",
          mailbox: "/api/mailbox",
          stats: "/api/stats/daily | /api/stats/weekly | /api/stats/realtime",
          support: "/api/support/resources",
        },
      },
    });
  });

  app.use("/api/session", sessionRoutes);
  app.use("/api/treeholes", treeholeRoutes);
  app.use("/api/mailbox", mailboxRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api", miscRoutes);

  // 便于本地一条命令跑通“前端 + 后端”。只暴露首页，不把源码目录静态托管出去。
  app.get(["/", "/index.html"], (req, res, next) => {
    if (!fs.existsSync(config.frontendFile)) {
      return res.json({
        ok: true,
        data: {
          name: "星语心声 API",
          message: "后端已启动；未找到 FRONTEND_FILE，请直接调用 /api。",
          frontendFile: path.basename(config.frontendFile),
        },
      });
    }
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(config.frontendFile, (error) => {
      if (error) next(error);
    });
  });

  app.get("/favicon.ico", (req, res) => res.status(204).end());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
