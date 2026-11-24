"use strict";

const ModerationLog = require("../models/ModerationLog");
const { hashIdentity, hashIp, sha256 } = require("../utils/identity");
const { cleanLogValue } = require("../utils/misc");
const config = require("../config");

/**
 * 只记录“发生了哪类拦截”的不可逆摘要，不保存被拦截正文。
 * 这样既能做滥用追踪，又不会把用户想删掉的话再留一份。
 */
async function recordModerationEvent({ req, scope, action, reasons = [], content = "" }) {
  try {
    await ModerationLog.create({
      scope,
      action,
      reasonCodes: reasons.map((reason) => reason.code).filter(Boolean),
      contentHash: content ? sha256(content) : null,
      identityHash: req.anonymousId
        ? hashIdentity(req.anonymousId, config.audit.secret)
        : null,
      ipHash: hashIp(req.ip, config.audit.secret),
      route: cleanLogValue(req.originalUrl?.split("?")[0], 160),
      method: req.method,
      userAgent: cleanLogValue(req.get("user-agent"), 180),
    });
  } catch (error) {
    // 审计失败不能影响主请求，也不能把正文写进日志。
    console.error("[audit] failed to record moderation event:", error.message);
  }
}

module.exports = { recordModerationEvent };
