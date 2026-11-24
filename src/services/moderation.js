"use strict";

const { detectRisk } = require("./analyzer");
const { buildCrisisSupport } = require("./support");
const { AppError } = require("../utils/errors");

const IDENTIFIER_PATTERNS = [
  {
    code: "phone",
    label: "手机号",
    re: /(?:\+?86[-\s]?)?1[3-9]\d{9}/,
  },
  {
    code: "student_id",
    label: "学号/证件号",
    re: /\b(?:20\d{2}|19\d{2})\d{4,8}\b/,
  },
  {
    code: "email",
    label: "邮箱",
    re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  },
  {
    code: "im_account",
    label: "社交账号",
    re: /(?:QQ|qq|微信|wechat|WeChat|vx|VX|小红书|微博|抖音|ins|Instagram)\s*(?:号|ID|id)?\s*[:：]?\s*[A-Za-z0-9_.-]{4,}/,
  },
  {
    code: "contact_exchange",
    label: "交换联系方式",
    re: /加我|私聊|留个联系|留个微信|留个QQ|扫我|二维码|联系方式|手机号|微信号|QQ号/,
  },
];

const CALLOUT_PATTERNS = [
  {
    code: "callout",
    label: "挂人/曝光",
    re: /挂人|曝光|人肉|开盒|实名举报|点名|避雷|扒一扒|求扩散/,
  },
  {
    code: "identity_hint",
    label: "指向具体个人",
    re: /(?:姓名|学号|班级|宿舍号|寝室号|手机号)\s*[:：]?\s*[\u4e00-\u9fa5A-Za-z0-9]{1,20}/,
  },
];

const ABUSE_PATTERNS = [
  {
    code: "targeted_abuse",
    label: "指向性攻击",
    re: /(?:你|他|她|你们|他们|某人|这个人).{0,10}(?:去死|傻逼|贱人|废物|垃圾|恶心|滚|闭嘴|脑残)/,
  },
  {
    code: "threat",
    label: "威胁",
    re: /去死吧|死全家|弄死你|杀了你|人肉你|让你消失|等着报复/,
  },
  {
    code: "defamation",
    label: "公开指控具体个人",
    re: /(?:偷|抄袭|作弊|骗|渣男|小三|绿茶).{0,16}(?:姓名|学号|班级|宿舍|照片|是谁)|(?:曝光|挂).{0,16}(?:偷|抄袭|作弊|骗|渣男|小三|绿茶)/,
  },
];

function collectReasons(content, patterns) {
  // 同时检查 NFKC 归一化后的文本和去掉分隔符的版本，避免全角数字、
  // 零宽字符或 "138-0013-8000" 这类写法绕过联系方式识别。
  const normalized = String(content)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  const compact = normalized.replace(/[\s\-_.·]/g, "");
  const variants = normalized === compact ? [normalized] : [normalized, compact];

  return patterns
    .filter(({ re }) => variants.some((value) => re.test(value)))
    .map(({ code, label }) => ({ code, label }));
}

function uniqueReasons(reasons) {
  const seen = new Set();
  return reasons.filter((reason) => {
    if (seen.has(reason.code)) return false;
    seen.add(reason.code);
    return true;
  });
}

/**
 * 审核“能不能发”。注意：这不是内容好坏判断，只拦截会破坏边界或造成伤害的表达。
 * @param {string} content
 * @param {{surface:"public"|"private"|"mailbox"}} options
 */
function inspectContent(content, { surface }) {
  const risk = detectRisk(content);

  if (risk.level === 2) {
    return {
      allowed: false,
      crisis: true,
      risk,
      reasons: [{ code: "crisis", label: "需要立即获得支持" }],
      support: buildCrisisSupport(),
    };
  }

  // 私密树洞只对“危机”做硬拦截；它不会被公开，也不进入任何统计。
  if (surface === "private") {
    return { allowed: true, crisis: false, risk, reasons: [] };
  }

  const reasons = uniqueReasons([
    ...collectReasons(content, IDENTIFIER_PATTERNS),
    ...collectReasons(content, CALLOUT_PATTERNS),
    ...collectReasons(content, ABUSE_PATTERNS),
  ]);

  if (!reasons.length) {
    return { allowed: true, crisis: false, risk, reasons: [] };
  }

  return {
    allowed: false,
    crisis: false,
    risk,
    reasons,
    support: null,
  };
}

const MESSAGES = {
  public:
    "这段文字里可能包含具体身份信息，或正在指向某个人。这里可以放下自己的感受，但不要挂人、曝光或留下联系方式。试试只写“我经历了什么”。",
  mailbox:
    "信件里不要留下手机号、社交账号等联系方式，也不要指向具体个人。这里可以短暂地交换感受，但不做社交撮合。",
};

function enforceContent(content, { surface }) {
  const result = inspectContent(content, { surface });
  if (result.allowed) return result;

  if (result.crisis) {
    throw new AppError(
      422,
      "CRISIS_SUPPORT",
      "这句话没有被公开。你现在的安全比表达更重要。",
      { support: result.support, reasons: result.reasons }
    );
  }

  throw new AppError(
    422,
    surface === "mailbox" ? "MAILBOX_BOUNDARY" : "CONTENT_NEEDS_REWRITE",
    MESSAGES[surface] || MESSAGES.public,
    { reasons: result.reasons }
  );
}

module.exports = {
  inspectContent,
  enforceContent,
  IDENTIFIER_PATTERNS,
  CALLOUT_PATTERNS,
  ABUSE_PATTERNS,
};
