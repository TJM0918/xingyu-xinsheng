"use strict";

const Treehole = require("../models/Treehole");
const Resonance = require("../models/Resonance");
const { enforceContent } = require("../services/moderation");
const { recordModerationEvent } = require("../services/audit");
const { generateComfort } = require("../services/comfort");
const { serializeTreehole } = require("../serializers/treehole");
const { AppError } = require("../utils/errors");
const { parseDateInput } = require("../utils/date");

function paginationMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page * limit < total,
  };
}

async function findResonatedIds(anonymousId, ids) {
  if (!ids.length) return new Set();
  const rows = await Resonance.find({
    anonymousId,
    treeholeId: { $in: ids },
  })
    .select("treeholeId")
    .lean();
  return new Set(rows.map((row) => String(row.treeholeId)));
}

async function createTreehole(req, res) {
  const body = req.validated.body;
  const surface = body.isPublic ? "public" : "private";

  let inspection;
  try {
    inspection = enforceContent(body.content, { surface });
  } catch (error) {
    await recordModerationEvent({
      req,
      scope: surface,
      action: "blocked",
      reasons: error.details?.reasons || [],
      content: body.content,
    });
    throw error;
  }

  const isPublic = body.isPublic;
  const publishAt =
    isPublic && body.publishAt
      ? parseDateInput(body.publishAt, "公开时间")
      : new Date();

  const doc = new Treehole({
    content: body.content,
    emotion: body.emotion,
    intensity: body.intensity,
    isPublic,
    anonymousId: req.anonymousId,
    sceneTag: body.sceneTag,
    campusLocation: body.campusLocation,
    publishAt,
    resonanceCount: 0,
    status: "active",
  });

  if (!isPublic) {
    doc.comfort = await generateComfort({
      content: body.content,
      emotion: body.emotion,
      intensity: body.intensity,
      sceneTag: body.sceneTag,
      riskLevel: inspection.risk.level,
    });
  }

  await doc.save();

  res.status(201).json({
    ok: true,
    data: serializeTreehole(doc, { isMine: true, includeComfort: !isPublic }),
    meta: {
      visibility: isPublic
        ? publishAt.getTime() > Date.now()
          ? "scheduled"
          : "public"
        : "private",
      comfortProvider: doc.comfort?.provider || null,
    },
  });
}

async function listPublicTreeholes(req, res) {
  const { page, limit, emotion, sceneTag, sort } = req.validated.query;
  const now = new Date();

  const filter = {
    isPublic: true,
    status: "active",
    publishAt: { $lte: now },
  };
  if (emotion) filter.emotion = emotion;
  if (sceneTag) filter.sceneTag = sceneTag;

  const sortSpec =
    sort === "oldest" ? { publishAt: 1, _id: 1 } : { publishAt: -1, _id: -1 };
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Treehole.find(filter).sort(sortSpec).skip(skip).limit(limit).lean(),
    Treehole.countDocuments(filter),
  ]);

  const resonatedIds = await findResonatedIds(
    req.anonymousId,
    docs.map((doc) => doc._id)
  );

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: docs.map((doc) =>
      serializeTreehole(doc, { resonated: resonatedIds.has(String(doc._id)) })
    ),
    meta: {
      ...paginationMeta({ page, limit, total }),
      sort,
      ranking: "none",
      comments: "disabled",
    },
  });
}

async function listMyTreeholes(req, res) {
  const { page, limit, emotion, sceneTag, sort } = req.validated.query;
  const filter = { anonymousId: req.anonymousId, status: "active" };
  if (emotion) filter.emotion = emotion;
  if (sceneTag) filter.sceneTag = sceneTag;

  const sortSpec = sort === "oldest" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Treehole.find(filter).sort(sortSpec).skip(skip).limit(limit).lean(),
    Treehole.countDocuments(filter),
  ]);

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: docs.map((doc) =>
      serializeTreehole(doc, { isMine: true, includeComfort: !doc.isPublic })
    ),
    meta: paginationMeta({ page, limit, total }),
  });
}

async function getTreehole(req, res) {
  const { id } = req.validated.params;
  const doc = await Treehole.findById(id).select("+anonymousId").lean();

  if (!doc || doc.status !== "active") {
    throw AppError.notFound("这条树洞不存在，或已经被收起来了", "TREEHOLE_NOT_FOUND");
  }

  const isMine = doc.anonymousId === req.anonymousId;
  const isPublished = Boolean(doc.isPublic) && new Date(doc.publishAt).getTime() <= Date.now();

  // 私密 / 定时未公开的树洞，对其他人一律表现为“不存在”。
  if (!isMine && !isPublished) {
    throw AppError.notFound("这条树洞不存在，或还没有到公开时间", "TREEHOLE_NOT_FOUND");
  }

  const resonated = isMine
    ? false
    : Boolean(
        await Resonance.exists({
          treeholeId: doc._id,
          anonymousId: req.anonymousId,
        })
      );

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: serializeTreehole(doc, {
      isMine,
      resonated,
      includeComfort: isMine && !doc.isPublic,
    }),
  });
}

async function deleteTreehole(req, res) {
  const { id } = req.validated.params;
  const doc = await Treehole.findOne({
    _id: id,
    anonymousId: req.anonymousId,
    status: "active",
  });

  if (!doc) {
    throw AppError.notFound("这条树洞不存在，或已经删除", "TREEHOLE_NOT_FOUND");
  }

  await Promise.all([
    doc.deleteOne(),
    Resonance.deleteMany({ treeholeId: doc._id }),
  ]);

  await recordModerationEvent({
    req,
    scope: doc.isPublic ? "public" : "private",
    action: "deleted",
    reasons: [{ code: "owner_deleted", label: "发布者删除" }],
    content: doc.content,
  });

  res.json({ ok: true, data: { deleted: true, id: String(doc._id) } });
}

async function toggleResonance(req, res) {
  const { id } = req.validated.params;
  const now = new Date();
  const treehole = await Treehole.findOne({
    _id: id,
    isPublic: true,
    status: "active",
    publishAt: { $lte: now },
  })
    .select("+anonymousId")
    .lean();

  if (!treehole) {
    throw AppError.notFound("这条树洞不存在，或还没有到公开时间", "TREEHOLE_NOT_FOUND");
  }

  if (treehole.anonymousId === req.anonymousId) {
    throw AppError.badRequest(
      "不用对自己的树洞点“我也有同感”。你已经在里面了。",
      "CANNOT_RESONATE_SELF"
    );
  }

  const filter = { treeholeId: treehole._id, anonymousId: req.anonymousId };
  const existing = await Resonance.findOne(filter).select("_id").lean();

  let resonated;
  if (existing) {
    await Resonance.deleteOne({ _id: existing._id });
    resonated = false;
  } else {
    try {
      await Resonance.create(filter);
      resonated = true;
    } catch (error) {
      // 并发双击时唯一索引会拦住第二次，按“已共鸣”处理，不能反向删除。
      if (error?.code !== 11000) throw error;
      resonated = true;
    }
  }

  const resonanceCount = await Resonance.countDocuments({ treeholeId: treehole._id });
  await Treehole.updateOne(
    { _id: treehole._id },
    { $set: { resonanceCount } }
  );

  res.json({
    ok: true,
    data: {
      treeholeId: String(treehole._id),
      resonated,
      resonanceCount,
    },
  });
}

module.exports = {
  createTreehole,
  listPublicTreeholes,
  listMyTreeholes,
  getTreehole,
  deleteTreehole,
  toggleResonance,
};
