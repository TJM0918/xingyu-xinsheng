"use strict";

const crypto = require("node:crypto");
const config = require("../config");

function requestContext(req, res, next) {
  const incoming = req.get("x-request-id");
  const safeIncoming =
    incoming && /^[A-Za-z0-9._-]{1,64}$/.test(incoming) ? incoming : null;
  req.requestId = safeIncoming || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function requestLogger(req, res, next) {
  if (config.isTest) return next();
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/api/health") return;
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const line = `${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms.toFixed(1)}ms req=${req.requestId}`;
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.info(line);
  });
  next();
}

module.exports = { requestContext, requestLogger };
