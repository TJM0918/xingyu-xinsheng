"use strict";

const express = require("express");
const sessionController = require("../controllers/sessionController");
const { sessionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/", sessionController.getSession);
router.post("/", sessionLimiter, sessionController.rotateSession);
router.delete("/", sessionController.deleteSession);

module.exports = router;
