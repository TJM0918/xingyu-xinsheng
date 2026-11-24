"use strict";

const express = require("express");
const controller = require("../controllers/statsController");
const { validate } = require("../middleware/validate");
const {
  dailyStatsSchema,
  weeklyStatsSchema,
  realtimeStatsSchema,
  selfCheckSchema,
} = require("../validators/schemas");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/daily",
  validate(dailyStatsSchema, "query"),
  asyncHandler(controller.getDailyStats)
);
router.get(
  "/weekly",
  validate(weeklyStatsSchema, "query"),
  asyncHandler(controller.getWeeklyStats)
);
router.get(
  "/realtime",
  validate(realtimeStatsSchema, "query"),
  asyncHandler(controller.getRealtimeStats)
);
router.get(
  "/self-check",
  validate(selfCheckSchema, "query"),
  asyncHandler(controller.getSelfCheck)
);

module.exports = router;
