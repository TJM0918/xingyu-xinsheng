"use strict";

const express = require("express");
const controller = require("../controllers/treeholeController");
const { validate } = require("../middleware/validate");
const {
  createTreeholeSchema,
  listTreeholesSchema,
  treeholeIdSchema,
} = require("../validators/schemas");
const { writeLimiter } = require("../middleware/rateLimit");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/",
  writeLimiter,
  validate(createTreeholeSchema, "body"),
  asyncHandler(controller.createTreehole)
);

router.get(
  "/",
  validate(listTreeholesSchema, "query"),
  asyncHandler(controller.listPublicTreeholes)
);

// 必须放在 /:id 之前，避免 "mine" 被当成 ObjectId。
router.get(
  "/mine",
  validate(listTreeholesSchema, "query"),
  asyncHandler(controller.listMyTreeholes)
);

router.post(
  "/:id/resonate",
  writeLimiter,
  validate(treeholeIdSchema, "params"),
  asyncHandler(controller.toggleResonance)
);

router.get(
  "/:id",
  validate(treeholeIdSchema, "params"),
  asyncHandler(controller.getTreehole)
);

router.delete(
  "/:id",
  writeLimiter,
  validate(treeholeIdSchema, "params"),
  asyncHandler(controller.deleteTreehole)
);

module.exports = router;
