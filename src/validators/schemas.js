"use strict";

const { z } = require("zod");
const {
  EMOTIONS,
  SCENE_TAG_KEYS,
  CAMPUS_LOCATION_KEYS,
} = require("../constants");
const { parseDateInput } = require("../utils/date");

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_RE, "ID 格式不正确");

const uuidSchema = z
  .string()
  .trim()
  .regex(UUID_RE, "匿名 ID 必须是标准 UUID");

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean({ error: "必须是布尔值" }));

const pageSchema = z.coerce
  .number({ error: "页码必须是数字" })
  .int("页码必须是整数")
  .min(1, "页码最小为 1")
  .max(100000, "页码过大")
  .default(1);

const limitSchema = z.coerce
  .number({ error: "每页数量必须是数字" })
  .int("每页数量必须是整数")
  .min(1, "每页至少 1 条")
  .max(50, "每页最多 50 条")
  .default(20);

const paginationShape = {
  page: pageSchema,
  limit: limitSchema,
};

const publishAtSchema = z
  .string()
  .trim()
  .min(1, "公开时间不能为空")
  .max(40, "公开时间格式不正确");

const createTreeholeSchema = z
  .object({
    content: z
      .string({ required_error: "树洞内容不能为空", invalid_type_error: "树洞内容必须是文本" })
      .trim()
      .min(1, "树洞内容不能为空")
      .max(500, "树洞内容不能超过 500 字"),
    emotion: z.enum(EMOTIONS, {
      error: "情绪类型必须是 positive、negative 或 neutral",
    }),
    intensity: z.coerce
      .number({ error: "情绪强度必须是数字" })
      .int("情绪强度必须是 1~10 的整数")
      .min(1, "情绪强度不能小于 1")
      .max(10, "情绪强度不能大于 10"),
    isPublic: booleanFromForm.default(false),
    /** 便捷字段：传入后优先于 isPublic。 */
    mode: z.enum(["private", "public"], { error: "mode 必须是 private 或 public" }).optional(),
    sceneTag: z
      .enum(SCENE_TAG_KEYS, { error: "场景标签不在允许范围内" })
      .default("other"),
    campusLocation: z
      .enum(CAMPUS_LOCATION_KEYS, { error: "地点不在允许范围内" })
      .default("unspecified"),
    publishAt: publishAtSchema.optional(),
  })
  .transform((data) => ({
    ...data,
    isPublic: data.mode ? data.mode === "public" : data.isPublic,
  }))
  .superRefine((data, ctx) => {
    if (!data.publishAt) return;

    let publishAt;
    try {
      publishAt = parseDateInput(data.publishAt, "公开时间");
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publishAt"],
        message: error.message,
      });
      return;
    }

    if (!data.isPublic) return;

    const now = Date.now();
    if (publishAt.getTime() <= now + 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publishAt"],
        message: "定时公开必须晚于当前时间至少 1 分钟",
      });
    }
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
    if (publishAt.getTime() > now + twoYears) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publishAt"],
        message: "定时公开最多支持两年后",
      });
    }
  });

const listTreeholesSchema = z.object({
  ...paginationShape,
  emotion: z.enum(EMOTIONS, { error: "情绪类型不在允许范围内" }).optional(),
  sceneTag: z.enum(SCENE_TAG_KEYS, { error: "场景标签不在允许范围内" }).optional(),
  sort: z.enum(["latest", "oldest"], { error: "sort 必须是 latest 或 oldest" }).default("latest"),
});

const treeholeIdSchema = z.object({
  id: objectIdSchema,
});

const sendMailboxSchema = z.object({
  toId: uuidSchema,
  content: z
    .string({ error: "信件内容必须是文本" })
    .trim()
    .min(1, "信件内容不能为空")
    .max(300, "信件内容不能超过 300 字"),
  isAnonymous: booleanFromForm.default(true),
});

const replyMailboxBodySchema = z.object({
  content: z
    .string({ error: "回复内容必须是文本" })
    .trim()
    .min(1, "回复内容不能为空")
    .max(300, "回复内容不能超过 300 字"),
});

const replyByBodySchema = replyMailboxBodySchema.extend({
  replyToId: objectIdSchema,
});

const mailboxListSchema = z.object({
  ...paginationShape,
  unread: booleanFromForm.optional(),
});

const mailboxIdSchema = z.object({
  id: objectIdSchema,
});

const mailboxThreadParamsSchema = z.object({
  threadId: objectIdSchema,
});

const dailyStatsSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(DATE_ONLY_RE, "date 必须是 YYYY-MM-DD")
    .optional(),
});

const weeklyStatsSchema = z.object({
  start: z
    .string()
    .trim()
    .regex(DATE_ONLY_RE, "start 必须是 YYYY-MM-DD")
    .optional(),
});

const realtimeStatsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const selfCheckSchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

const analyzeSchema = z.object({
  text: z
    .string({ error: "text 必须是字符串" })
    .trim()
    .min(1, "text 不能为空")
    .max(1000, "text 不能超过 1000 字"),
});

module.exports = {
  createTreeholeSchema,
  listTreeholesSchema,
  treeholeIdSchema,
  sendMailboxSchema,
  replyMailboxBodySchema,
  replyByBodySchema,
  mailboxListSchema,
  mailboxIdSchema,
  mailboxThreadParamsSchema,
  dailyStatsSchema,
  weeklyStatsSchema,
  realtimeStatsSchema,
  selfCheckSchema,
  analyzeSchema,
  objectIdSchema,
};
