"use strict";

const mongoose = require("mongoose");
const { EMOTIONS, SCENE_TAG_KEYS, CAMPUS_LOCATION_KEYS } = require("../constants");

const comfortSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 1200 },
    provider: { type: String, enum: ["local", "llm"], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const treeholeSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "树洞内容不能为空"],
      trim: true,
      minlength: [1, "树洞内容不能为空"],
      maxlength: [500, "树洞内容不能超过 500 字"],
    },
    emotion: {
      type: String,
      enum: { values: EMOTIONS, message: "情绪类型必须是 positive、negative 或 neutral" },
      required: [true, "情绪类型不能为空"],
      index: true,
    },
    intensity: {
      type: Number,
      required: [true, "情绪强度不能为空"],
      min: [1, "情绪强度不能小于 1"],
      max: [10, "情绪强度不能大于 10"],
      validate: {
        validator: Number.isInteger,
        message: "情绪强度必须是 1~10 的整数",
      },
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    anonymousId: {
      type: String,
      required: true,
      select: false,
    },
    sceneTag: {
      type: String,
      enum: { values: SCENE_TAG_KEYS, message: "场景标签不在允许范围内" },
      default: "other",
      index: true,
    },
    campusLocation: {
      type: String,
      enum: { values: CAMPUS_LOCATION_KEYS, message: "校区/地点不在允许范围内" },
      default: "unspecified",
    },
    /** 时间胶囊：到这个时刻之后才可被公开列表和统计看见。 */
    publishAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    comfort: {
      type: comfortSchema,
      default: undefined,
    },
    resonanceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "hidden"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

treeholeSchema.index({ isPublic: 1, status: 1, publishAt: 1, createdAt: -1 });
treeholeSchema.index({ anonymousId: 1, createdAt: -1 });
treeholeSchema.index({ sceneTag: 1, isPublic: 1, status: 1, createdAt: -1 });

treeholeSchema.virtual("visibility").get(function visibility() {
  if (!this.isPublic) return "private";
  return this.publishAt && this.publishAt.getTime() > Date.now() ? "scheduled" : "public";
});

module.exports = mongoose.model("Treehole", treeholeSchema);
