"use strict";

const {
  sceneTagLabel,
  campusLocationLabel,
  EMOTION_LABELS,
} = require("../constants");

function plain(doc) {
  return typeof doc?.toObject === "function" ? doc.toObject() : doc;
}

function computeVisibility(raw) {
  if (!raw.isPublic) return "private";
  if (raw.publishAt && new Date(raw.publishAt).getTime() > Date.now()) return "scheduled";
  return "public";
}

/**
 * 树洞对外的稳定形状。永远不返回 anonymousId；私密安抚只返回给本人。
 */
function serializeTreehole(doc, { isMine = false, resonated = false, includeComfort = false } = {}) {
  const raw = plain(doc);
  if (!raw) return null;

  const visibility = computeVisibility(raw);
  const result = {
    id: String(raw._id),
    content: raw.content,
    emotion: raw.emotion,
    emotionLabel: EMOTION_LABELS[raw.emotion] || raw.emotion,
    intensity: raw.intensity,
    isPublic: Boolean(raw.isPublic),
    visibility,
    sceneTag: raw.sceneTag,
    sceneTagLabel: sceneTagLabel(raw.sceneTag),
    campusLocation: raw.campusLocation,
    campusLocationLabel: campusLocationLabel(raw.campusLocation),
    publishAt: raw.publishAt ? new Date(raw.publishAt).toISOString() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
    resonanceCount: raw.resonanceCount || 0,
    resonated: Boolean(resonated),
    isMine,
  };

  if (includeComfort && isMine && raw.comfort?.text) {
    result.comfort = {
      text: raw.comfort.text,
      provider: raw.comfort.provider,
      createdAt: raw.comfort.createdAt
        ? new Date(raw.comfort.createdAt).toISOString()
        : null,
      note: "这是一段自动生成的陪伴文字，不是心理咨询。",
    };
  }

  return result;
}

module.exports = { serializeTreehole, computeVisibility };
