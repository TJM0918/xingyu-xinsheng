"use strict";

const mongoose = require("mongoose");
const { AppError } = require("./errors");

function toObjectId(value, label = "ID") {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw AppError.badRequest(`${label}格式不正确`, "INVALID_ID");
  }
  return new mongoose.Types.ObjectId(value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 永不返回 null/undefined 的字符串，适合做日志字段。 */
function cleanLogValue(value, max = 120) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]/g, " ").slice(0, max);
}

module.exports = { toObjectId, escapeRegex, cleanLogValue };
