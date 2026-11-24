"use strict";

const { rateLimit } = require("express-rate-limit");
const config = require("../config");
const { AppError } = require("../utils/errors");

function keyByAnonymous(req) {
  return req.anonymousId || req.ip || "unknown";
}

function makeLimiter({ windowMs, limit, name, keyGenerator }) {
  const options = {
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => !config.rateLimit.enabled,
    validate: false,
    handler: (req, res, next) => {
      next(
        AppError.tooMany(
          "请求太频繁了，先慢一点。你的话不会丢，稍后再试一次。",
          "RATE_LIMITED",
          { limiter: name }
        )
      );
    },
  };
  if (keyGenerator) options.keyGenerator = keyGenerator;
  return rateLimit(options);
}

// 全局按 IP 限流，防止通过不断轮换匿名 ID 绕过限制。
const globalLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.globalPer15Min,
  name: "global",
});

// 写操作按匿名 ID（持有凭证）限流；同一 IP 上的不同同学互不牵连。
const writeLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: config.rateLimit.writePer10Min,
  name: "write",
  keyGenerator: keyByAnonymous,
});

const analyzeLimiter = makeLimiter({
  windowMs: 60 * 1000,
  limit: config.rateLimit.analyzePerMin,
  name: "analyze",
  keyGenerator: keyByAnonymous,
});

const mailLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: config.rateLimit.mailPerHour,
  name: "mailbox",
  keyGenerator: keyByAnonymous,
});

const sessionLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  name: "session",
  keyGenerator: keyByAnonymous,
});

module.exports = { globalLimiter, writeLimiter, analyzeLimiter, mailLimiter, sessionLimiter };
