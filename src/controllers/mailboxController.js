"use strict";

const mongoose = require("mongoose");
const Mailbox = require("../models/Mailbox");
const config = require("../config");
const { enforceContent } = require("../services/moderation");
const { recordModerationEvent } = require("../services/audit");
const { serializeMailbox } = require("../serializers/mailbox");
const { AppError } = require("../utils/errors");
const { stableAlias } = require("../utils/identity");

function paginationMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page * limit < total,
  };
}

async function inspectOrThrow({ req, content }) {
  try {
    return enforceContent(content, { surface: "mailbox" });
  } catch (error) {
    await recordModerationEvent({
      req,
      scope: "mailbox",
      action: "blocked",
      reasons: error.details?.reasons || [],
      content,
    });
    throw error;
  }
}

async function sendMail(req, res) {
  const body = req.validated.body;
  const toId = body.toId.toLowerCase();

  if (toId === req.anonymousId) {
    throw AppError.badRequest("这封信是写给自己的。要不要先放进树洞？", "MAIL_TO_SELF");
  }

  await inspectOrThrow({ req, content: body.content });

  const _id = new mongoose.Types.ObjectId();
  const doc = new Mailbox({
    _id,
    toId,
    fromId: req.anonymousId,
    senderAlias: body.isAnonymous
      ? null
      : stableAlias(req.anonymousId, config.audit.secret),
    content: body.content,
    isAnonymous: body.isAnonymous,
    threadId: _id,
    parentId: null,
  });

  await doc.save();

  res.status(201).json({
    ok: true,
    data: serializeMailbox(doc, { direction: "sent" }),
    meta: { threadId: String(doc.threadId) },
  });
}

async function listInbox(req, res) {
  const { page, limit, unread } = req.validated.query;
  const filter = {
    toId: req.anonymousId,
    recipientDeletedAt: null,
  };
  if (unread === true) filter.readAt = null;

  const skip = (page - 1) * limit;
  const [docs, total, unreadCount] = await Promise.all([
    Mailbox.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Mailbox.countDocuments(filter),
    Mailbox.countDocuments({ toId: req.anonymousId, recipientDeletedAt: null, readAt: null }),
  ]);

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: docs.map((doc) => serializeMailbox(doc, { direction: "inbox" })),
    meta: {
      ...paginationMeta({ page, limit, total }),
      unreadCount,
    },
  });
}

async function listSent(req, res) {
  const { page, limit } = req.validated.query;
  const filter = { fromId: req.anonymousId, senderDeletedAt: null };
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Mailbox.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Mailbox.countDocuments(filter),
  ]);

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: docs.map((doc) => serializeMailbox(doc, { direction: "sent" })),
    meta: paginationMeta({ page, limit, total }),
  });
}

async function getMail(req, res) {
  const { id } = req.validated.params;
  const doc = await Mailbox.findOne({
    _id: id,
    $or: [{ toId: req.anonymousId }, { fromId: req.anonymousId }],
  }).select("+toId +fromId");

  if (!doc) {
    throw AppError.notFound("这封信不存在，或已经删除", "MAIL_NOT_FOUND");
  }

  const isRecipient = String(doc.toId) === req.anonymousId;
  if (isRecipient && doc.recipientDeletedAt) {
    throw AppError.notFound("这封信不存在，或已经删除", "MAIL_NOT_FOUND");
  }
  if (!isRecipient && doc.senderDeletedAt) {
    throw AppError.notFound("这封信不存在，或已经删除", "MAIL_NOT_FOUND");
  }

  if (isRecipient && !doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: serializeMailbox(doc, { direction: isRecipient ? "inbox" : "sent" }),
  });
}

async function replyToMail(req, res) {
  const body = req.validated.body;
  const targetId = req.validated.params?.id || body.replyToId;

  const original = await Mailbox.findOne({
    _id: targetId,
    toId: req.anonymousId,
    recipientDeletedAt: null,
  }).select("+toId +fromId");

  if (!original) {
    // 不区分“不是你的信”和“信不存在”，避免探测他人信箱。
    throw AppError.notFound("只能回复自己收到的信件，或这封信已经不存在", "MAIL_NOT_FOUND");
  }

  await inspectOrThrow({ req, content: body.content });

  const reply = new Mailbox({
    toId: original.fromId,
    fromId: req.anonymousId,
    senderAlias: null,
    content: body.content,
    isAnonymous: true,
    threadId: original.threadId,
    parentId: original._id,
  });

  await reply.save();

  if (!original.readAt) {
    original.readAt = new Date();
    await original.save();
  }

  res.status(201).json({
    ok: true,
    data: serializeMailbox(reply, { direction: "sent" }),
    meta: { threadId: String(reply.threadId), parentId: String(original._id) },
  });
}

async function deleteMail(req, res) {
  const { id } = req.validated.params;
  const doc = await Mailbox.findOne({
    _id: id,
    $or: [{ toId: req.anonymousId }, { fromId: req.anonymousId }],
  }).select("+toId +fromId");

  if (!doc) {
    throw AppError.notFound("这封信不存在，或已经删除", "MAIL_NOT_FOUND");
  }

  const isRecipient = String(doc.toId) === req.anonymousId;
  if (isRecipient) {
    if (doc.recipientDeletedAt) {
      throw AppError.notFound("这封信已经删除了", "MAIL_NOT_FOUND");
    }
    doc.recipientDeletedAt = new Date();
  } else {
    if (doc.senderDeletedAt) {
      throw AppError.notFound("这封信已经删除了", "MAIL_NOT_FOUND");
    }
    doc.senderDeletedAt = new Date();
  }

  // 双方都删除后，正文不再有任何保留价值。
  if (doc.recipientDeletedAt && doc.senderDeletedAt) {
    await doc.deleteOne();
  } else {
    await doc.save();
  }

  res.json({ ok: true, data: { deleted: true, id: String(doc._id) } });
}

async function markRead(req, res) {
  const { id } = req.validated.params;
  const doc = await Mailbox.findOneAndUpdate(
    { _id: id, toId: req.anonymousId, recipientDeletedAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );

  if (!doc) {
    throw AppError.notFound("这封信不存在，或已经删除", "MAIL_NOT_FOUND");
  }

  res.json({
    ok: true,
    data: { id: String(doc._id), readAt: doc.readAt.toISOString() },
  });
}

async function unreadCount(req, res) {
  const count = await Mailbox.countDocuments({
    toId: req.anonymousId,
    recipientDeletedAt: null,
    readAt: null,
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ ok: true, data: { unreadCount: count } });
}

async function getThread(req, res) {
  const { threadId } = req.validated.params;
  const { page, limit } = req.validated.query;
  const now = new Date();
  const baseFilter = {
    threadId,
    $or: [
      { toId: req.anonymousId, recipientDeletedAt: null },
      { fromId: req.anonymousId, senderDeletedAt: null },
    ],
  };

  const [total, exists] = await Promise.all([
    Mailbox.countDocuments(baseFilter),
    Mailbox.exists({ threadId, $or: [{ toId: req.anonymousId }, { fromId: req.anonymousId }] }),
  ]);

  if (!exists) {
    throw AppError.notFound("这个匿名对话不存在", "THREAD_NOT_FOUND");
  }

  await Mailbox.updateMany(
    { threadId, toId: req.anonymousId, recipientDeletedAt: null, readAt: null },
    { $set: { readAt: now } }
  );

  const skip = (page - 1) * limit;
  const docs = await Mailbox.find(baseFilter)
    .select("+toId +fromId")
    .sort({ createdAt: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: {
      threadId: String(threadId),
      messages: docs.map((doc) =>
        serializeMailbox(doc, {
          direction: String(doc.toId) === req.anonymousId ? "inbox" : "sent",
        })
      ),
    },
    meta: paginationMeta({ page, limit, total }),
  });
}

module.exports = {
  sendMail,
  listInbox,
  listSent,
  getMail,
  replyToMail,
  deleteMail,
  markRead,
  unreadCount,
  getThread,
};
