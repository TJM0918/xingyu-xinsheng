"use strict";

const crypto = require("node:crypto");
const config = require("../config");
const { AppError } = require("../utils/errors");
const { isUuid } = require("../utils/identity");

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.days * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function setIdentityCookie(res, anonymousId) {
  res.cookie(config.cookie.name, anonymousId, cookieOptions());
}

function clearIdentityCookie(res) {
  res.clearCookie(config.cookie.name, { ...cookieOptions(), maxAge: undefined });
}

/**
 * 匿名身份中间件：优先 X-Anonymous-Id（供 localStorage 方案），
 * 其次 HttpOnly Cookie；都没有则生成新的 UUID。
 *
 * 匿名 ID 是“持有即可用”的凭证，服务端不收集姓名、学号、手机号。
 */
function identity(req, res, next) {
  try {
    const headerValue = config.allowAnonymousHeader ? req.get("x-anonymous-id") : null;
    const cookieValue = req.cookies?.[config.cookie.name];
    let anonymousId;
    let source = "new";

    if (headerValue) {
      if (!isUuid(headerValue.trim())) {
        throw AppError.badRequest(
          "匿名 ID 格式不正确，应为标准 UUID",
          "INVALID_ANONYMOUS_ID"
        );
      }
      anonymousId = headerValue.trim().toLowerCase();
      source = "header";
    } else if (cookieValue) {
      if (!isUuid(cookieValue)) {
        // 被篡改或过期的 Cookie 不应让请求失败，直接换一个新身份。
        anonymousId = crypto.randomUUID();
        source = "new";
      } else {
        anonymousId = cookieValue.toLowerCase();
        source = "cookie";
      }
    } else {
      anonymousId = crypto.randomUUID();
      source = "new";
    }

    req.anonymousId = anonymousId;
    req.identitySource = source;
    res.locals.anonymousId = anonymousId;
    res.locals.identitySource = source;

    // 首次访问或使用请求头时，顺手写入 HttpOnly Cookie，减少前端泄漏面。
    if (source === "new" || source === "header") {
      setIdentityCookie(res, anonymousId);
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { identity, setIdentityCookie, clearIdentityCookie };
