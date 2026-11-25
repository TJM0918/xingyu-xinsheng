"use strict";

const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../..");

require("dotenv").config({ path: path.join(ROOT_DIR, ".env") });

function readInt(name, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`环境变量 ${name} 必须是 ${min}~${max} 之间的整数，当前为：${raw}`);
  }
  return value;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const DEV_AUDIT_SECRET = "development-only-audit-secret-do-not-use-in-production";
let auditSecret = process.env.AUDIT_HMAC_SECRET || "";
if (!auditSecret) {
  if (isProduction) {
    throw new Error("生产环境必须设置 AUDIT_HMAC_SECRET（建议使用 openssl rand -hex 32 生成）");
  }
  auditSecret = DEV_AUDIT_SECRET;
}
if (
  isProduction &&
  (auditSecret === DEV_AUDIT_SECRET ||
    auditSecret.length < 32 ||
    /change-me|dev-only|example|replace|请替换/i.test(auditSecret))
) {
  throw new Error("生产环境 AUDIT_HMAC_SECRET 必须是至少 32 位的随机字符串，不能使用示例值");
}

const corsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const cookieName = process.env.ANONYMOUS_COOKIE_NAME || "xy_anonymous_id";
if (!/^[A-Za-z0-9_.-]{1,64}$/.test(cookieName)) {
  throw new Error("ANONYMOUS_COOKIE_NAME 只能包含字母、数字、下划线、点和短横线");
}

const frontendFile = path.resolve(
  ROOT_DIR,
  process.env.FRONTEND_FILE || "52-完整体-大字(1).html"
);

const llmBaseUrl = String(process.env.LLM_BASE_URL || "").replace(/\/+$/, "");
// API_KEY 是 LLM_API_KEY 的别名：部署平台常只让配一个 API_KEY，二者设一个即可
const llmApiKey = String(process.env.LLM_API_KEY || process.env.API_KEY || "");
const llmModel = String(process.env.LLM_MODEL || "");
const llmEnabled = Boolean(llmBaseUrl && llmApiKey && llmModel);

const config = Object.freeze({
  rootDir: ROOT_DIR,
  env: nodeEnv,
  isProduction,
  isTest,
  port: readInt("PORT", 3000, { min: 1, max: 65535 }),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/xingyu_xinsheng",
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : 0,
  timezone: "Asia/Shanghai",
  corsOrigins,
  cookie: Object.freeze({
    name: cookieName,
    days: readInt("ANONYMOUS_COOKIE_DAYS", 365, { min: 1, max: 3650 }),
    secure: readBool("COOKIE_SECURE", isProduction),
    sameSite: "lax",
  }),
  allowAnonymousHeader: readBool("ALLOW_ANONYMOUS_HEADER", true),
  audit: Object.freeze({
    secret: auditSecret,
    retentionDays: readInt("MODERATION_LOG_RETENTION_DAYS", 180, { min: 1, max: 3650 }),
  }),
  rateLimit: Object.freeze({
    enabled: !isTest && readBool("RATE_LIMIT_ENABLED", true),
    globalPer15Min: readInt("RATE_LIMIT_GLOBAL_PER_15MIN", 300, { min: 1 }),
    writePer10Min: readInt("RATE_LIMIT_WRITE_PER_10MIN", 30, { min: 1 }),
    analyzePerMin: readInt("RATE_LIMIT_ANALYZE_PER_MIN", 60, { min: 1 }),
    mailPerHour: readInt("RATE_LIMIT_MAIL_PER_HOUR", 20, { min: 1 }),
  }),
  llm: Object.freeze({
    enabled: llmEnabled,
    baseUrl: llmBaseUrl,
    apiKey: llmApiKey,
    model: llmModel,
    timeoutMs: readInt("LLM_TIMEOUT_MS", 6500, { min: 1500, max: 30000 }),
  }),
  support: Object.freeze({
    campusName: process.env.CAMPUS_COUNSELING_NAME || "东南大学心理健康教育中心",
    campusPhone: process.env.CAMPUS_COUNSELING_PHONE || "025-52090277",
    campusHotline: process.env.CAMPUS_24H_HOTLINE || "15251760520",
    campusNote:
      process.env.CAMPUS_COUNSELING_NOTE ||
      "九龙湖校区大学生活动中心4楼；四牌楼 025-83793744；丁家桥 025-83272273。预约方式以学校最新通知为准。",
  }),
  frontendFile,
  pagination: Object.freeze({
    defaultLimit: 20,
    maxLimit: 50,
  }),
  version: "1.0.0",
});

module.exports = config;
