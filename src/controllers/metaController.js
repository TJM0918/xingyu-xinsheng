"use strict";

const config = require("../config");
const {
  EMOTION_LABELS,
  SCENE_TAGS,
  CAMPUS_LOCATIONS,
} = require("../constants");
const { buildSupportResources } = require("../services/support");

function resources(req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({ ok: true, data: buildSupportResources() });
}

function meta(req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({
    ok: true,
    data: {
      version: config.version,
      timezone: config.timezone,
      emotions: Object.entries(EMOTION_LABELS).map(([value, label]) => ({ value, label })),
      sceneTags: Object.entries(SCENE_TAGS).map(([value, label]) => ({ value, label })),
      campusLocations: Object.entries(CAMPUS_LOCATIONS).map(([value, label]) => ({ value, label })),
      limits: {
        treeholeContent: 500,
        mailboxContent: 300,
        intensityMin: 1,
        intensityMax: 10,
        pageSizeMax: config.pagination.maxLimit,
        timeCapsuleMaxYears: 2,
      },
      features: {
        privateComfort: true,
        comfortProvider: config.llm.enabled ? "llm-with-local-fallback" : "local",
        publicComments: false,
        resonanceOnly: true,
        heatRanking: false,
        timeCapsule: true,
        realtimeSky: true,
      },
    },
  });
}

module.exports = { resources, meta };
