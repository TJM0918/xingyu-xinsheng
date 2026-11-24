"use strict";

const config = require("../config");
const { analyzeText } = require("../services/analyzer");

function analyze(req, res) {
  const started = process.hrtime.bigint();
  const data = analyzeText(req.validated.body.text);
  const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;

  // 与现有前端契约保持一致：payload.data + payload.meta.mode。
  res.json({
    ok: true,
    data,
    meta: {
      mode: "local",
      latency_ms: Math.round(latencyMs * 10) / 10,
      version: config.version,
      persisted: false,
    },
  });
}

module.exports = { analyze };
