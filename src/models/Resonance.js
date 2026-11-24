"use strict";

const mongoose = require("mongoose");

const resonanceSchema = new mongoose.Schema(
  {
    treeholeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Treehole",
      required: true,
      index: true,
    },
    anonymousId: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// 一个人对同一条树洞只能留下一次“我也有同感”。
resonanceSchema.index({ treeholeId: 1, anonymousId: 1 }, { unique: true });

module.exports = mongoose.model("Resonance", resonanceSchema);
