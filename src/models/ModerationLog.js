"use strict";

const mongoose = require("mongoose");
const config = require("../config");

const moderationLogSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["public", "private", "mailbox"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["blocked", "hidden", "deleted"],
      required: true,
    },
    reasonCodes: {
      type: [String],
      default: [],
    },
    /** 不可逆摘要，不保存正文。 */
    contentHash: {
      type: String,
      default: null,
      index: true,
    },
    identityHash: {
      type: String,
      default: null,
      index: true,
    },
    ipHash: {
      type: String,
      default: null,
    },
    route: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

moderationLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: config.audit.retentionDays * 24 * 60 * 60 }
);

module.exports = mongoose.model("ModerationLog", moderationLogSchema);
