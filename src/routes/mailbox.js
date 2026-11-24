"use strict";

const express = require("express");
const controller = require("../controllers/mailboxController");
const { validate } = require("../middleware/validate");
const {
  sendMailboxSchema,
  replyMailboxBodySchema,
  replyByBodySchema,
  mailboxListSchema,
  mailboxIdSchema,
  mailboxThreadParamsSchema,
} = require("../validators/schemas");
const { mailLimiter } = require("../middleware/rateLimit");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/",
  mailLimiter,
  validate(sendMailboxSchema, "body"),
  asyncHandler(controller.sendMail)
);

router.get(
  "/inbox",
  validate(mailboxListSchema, "query"),
  asyncHandler(controller.listInbox)
);
router.get(
  "/sent",
  validate(mailboxListSchema, "query"),
  asyncHandler(controller.listSent)
);
router.get("/unread-count", asyncHandler(controller.unreadCount));

// 回复：兼容 POST /api/mailbox/reply { replyToId, content } 与
// POST /api/mailbox/:id/reply { content } 两种写法。
router.post(
  "/reply",
  mailLimiter,
  validate(replyByBodySchema, "body"),
  asyncHandler(controller.replyToMail)
);

router.get(
  "/threads/:threadId",
  validate(mailboxThreadParamsSchema, "params"),
  validate(mailboxListSchema, "query"),
  asyncHandler(controller.getThread)
);

router.post(
  "/:id/reply",
  mailLimiter,
  validate(mailboxIdSchema, "params"),
  validate(replyMailboxBodySchema, "body"),
  asyncHandler(controller.replyToMail)
);

router.patch(
  "/:id/read",
  validate(mailboxIdSchema, "params"),
  asyncHandler(controller.markRead)
);

router.get(
  "/:id",
  validate(mailboxIdSchema, "params"),
  asyncHandler(controller.getMail)
);

router.delete(
  "/:id",
  validate(mailboxIdSchema, "params"),
  asyncHandler(controller.deleteMail)
);

module.exports = router;
