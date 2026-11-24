"use strict";

const crypto = require("node:crypto");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function newAnonymousId() {
  return crypto.randomUUID();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hmacHex(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

/** 只用于审计关联，不可逆。 */
function hashIdentity(anonymousId, secret) {
  return hmacHex(anonymousId, secret).slice(0, 32);
}

function hashIp(ip, secret) {
  return hmacHex(ip || "unknown", secret).slice(0, 32);
}

/**
 * 非匿名信件的稳定化名。绝不返回原始 anonymousId，避免把“匿名 ID”
 * 变成可被陌生人反复骚扰的联系方式。
 */
function stableAlias(anonymousId, secret) {
  return hmacHex(anonymousId, secret).slice(0, 6).toUpperCase();
}

module.exports = {
  isUuid,
  newAnonymousId,
  sha256,
  hashIdentity,
  hashIp,
  stableAlias,
};
