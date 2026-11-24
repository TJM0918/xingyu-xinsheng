"use strict";

const config = require("../config");
const { AppError } = require("../utils/errors");

const ALLOWED_HEADERS = "Content-Type, X-Anonymous-Id, X-Request-Id";
const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";

function sameOrigin(req, origin) {
  try {
    const host = req.get("host");
    if (!host) return false;
    const expected = new URL(`${req.protocol}://${host}`);
    return new URL(origin).origin === expected.origin;
  } catch {
    return false;
  }
}

/**
 * 只允许同源或显式白名单。空 CORS_ORIGINS 表示“只允许同源”，
 * 不会退化成 `Access-Control-Allow-Origin: *`。
 */
function corsPolicy(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();

  const allowed = sameOrigin(req, origin) || config.corsOrigins.includes(origin);
  if (!allowed) {
    return next(AppError.forbidden("这个来源不允许访问接口", "CORS_ORIGIN_DENIED"));
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
}

module.exports = { corsPolicy };
