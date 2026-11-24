"use strict";

const express = require("express");
const analyzeController = require("../controllers/analyzeController");
const metaController = require("../controllers/metaController");
const { validate } = require("../middleware/validate");
const { analyzeSchema } = require("../validators/schemas");
const { analyzeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/analyze", analyzeLimiter, validate(analyzeSchema, "body"), analyzeController.analyze);
router.get("/support/resources", metaController.resources);
router.get("/meta", metaController.meta);

module.exports = router;
