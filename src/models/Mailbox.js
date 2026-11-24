"use strict";

const mongoose = require("mongoose");

const mailboxSchema = new mongoose.Schema(
  {
    toId: {
      type: String,
      required: true,
      select: false,
    },
    fromId: {
      type: String,
      required: true,
      select: false,
    },
    /** 不匿名时也只展示稳定化名，不展示可被直接寻址的 anonymousId。 */
    senderAlias: {
      type: String,
      default: null,
      maxlength: 16,
    },
    content: {
      type: String,
      required: [true, "信件内容不能为空"],
      trim: true,
      maxlength: [300, "信件内容不能超过 300 字"],
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mailbox",
      default: null,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    recipientDeletedAt: {
      type: Date,
      default: null,
    },
    senderDeletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

mailboxSchema.index({ toId: 1, recipientDeletedAt: 1, createdAt: -1 });
mailboxSchema.index({ fromId: 1, senderDeletedAt: 1, createdAt: -1 });
mailboxSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model("Mailbox", mailboxSchema);
