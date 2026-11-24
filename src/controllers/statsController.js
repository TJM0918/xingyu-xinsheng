"use strict";

const Treehole = require("../models/Treehole");
const config = require("../config");
const { EMOTIONS, sceneTagLabel } = require("../constants");
const {
  addDays,
  enumerateDays,
  formatDateOnly,
  parseDateOnly,
  startOfDayShanghai,
  startOfWeekShanghai,
} = require("../utils/date");
const { AppError } = require("../utils/errors");

const EMOTION_VALENCE = Object.freeze({
  positive: 0.65,
  negative: -0.65,
  neutral: 0,
});

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function safeDate(value) {
  try {
    return parseDateOnly(value);
  } catch (error) {
    throw AppError.badRequest(error.message, "INVALID_DATE");
  }
}

function emptyDistribution() {
  return { positive: 0, negative: 0, neutral: 0 };
}

function buildDistribution(rows) {
  const distribution = emptyDistribution();
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(distribution, row._id)) {
      distribution[row._id] = row.count;
    }
  }
  return distribution;
}

function pickDominant(distribution) {
  let dominant = "neutral";
  let max = 0;
  for (const emotion of EMOTIONS) {
    if (distribution[emotion] > max) {
      max = distribution[emotion];
      dominant = emotion;
    }
  }
  return dominant;
}

function totalsFromRows(rows) {
  const distribution = buildDistribution(rows);
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  const weightedIntensity = rows.reduce(
    (sum, row) => sum + (row.avgIntensity || 0) * row.count,
    0
  );
  const avgIntensity = total ? weightedIntensity / total : 0;
  const valence = total
    ? EMOTIONS.reduce(
        (sum, emotion) => sum + distribution[emotion] * EMOTION_VALENCE[emotion],
        0
      ) / total
    : 0;

  return {
    total,
    distribution,
    ratios: {
      positive: total ? round(distribution.positive / total, 4) : 0,
      negative: total ? round(distribution.negative / total, 4) : 0,
      neutral: total ? round(distribution.neutral / total, 4) : 0,
    },
    avgIntensity: round(avgIntensity, 1),
    valence: round(valence, 2),
    arousal: round(avgIntensity / 10, 2),
    dominant: pickDominant(distribution),
  };
}

function shapeTags(tagRows) {
  return (tagRows || []).map((row) => ({
    tag: row._id,
    label: sceneTagLabel(row._id),
    count: row.count,
  }));
}

function shapeHourly(hourRows) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour: String(hour).padStart(2, "0"),
    total: 0,
    distribution: emptyDistribution(),
  }));

  for (const row of hourRows || []) {
    const hour = row._id?.hour;
    const emotion = row._id?.emotion;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    if (!EMOTIONS.includes(emotion)) continue;
    buckets[hour].distribution[emotion] = row.count;
    buckets[hour].total += row.count;
  }

  return buckets;
}

function buildMatch({ from, to, now = new Date() }) {
  return {
    isPublic: true,
    status: "active",
    publishAt: { $lte: now },
    createdAt: { $gte: from, $lt: to },
  };
}

function dailyFacetPipeline(match) {
  return [
    { $match: match },
    {
      $facet: {
        emotions: [
          {
            $group: {
              _id: "$emotion",
              count: { $sum: 1 },
              avgIntensity: { $avg: "$intensity" },
            },
          },
        ],
        hours: [
          {
            $group: {
              _id: {
                hour: { $hour: { date: "$createdAt", timezone: config.timezone } },
                emotion: "$emotion",
              },
              count: { $sum: 1 },
            },
          },
        ],
        tags: [
          { $group: { _id: "$sceneTag", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
      },
    },
  ];
}

async function dailyData({ from, to, date }) {
  const [facet] = await Treehole.aggregate(dailyFacetPipeline(buildMatch({ from, to })));
  const emotionRows = facet?.emotions || [];
  const totals = totalsFromRows(emotionRows);

  return {
    date,
    total: totals.total,
    distribution: totals.distribution,
    ratios: totals.ratios,
    avgIntensity: totals.avgIntensity,
    valence: totals.valence,
    arousal: totals.arousal,
    dominant: totals.dominant,
    byEmotion: EMOTIONS.map((emotion) => {
      const row = emotionRows.find((item) => item._id === emotion);
      return {
        emotion,
        count: row?.count || 0,
        avgIntensity: row?.avgIntensity ? round(row.avgIntensity, 1) : 0,
        ratio: totals.total ? round((row?.count || 0) / totals.total, 4) : 0,
      };
    }),
    hourly: shapeHourly(facet?.hours),
    topTags: shapeTags(facet?.tags),
  };
}

async function getDailyStats(req, res) {
  const { date } = req.validated.query;
  const targetDate = date || formatDateOnly(new Date());
  const from = safeDate(targetDate);
  const to = addDays(from, 1);
  const data = await dailyData({ from, to, date: targetDate });

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.json({
    ok: true,
    data: {
      ...data,
      timezone: config.timezone,
      range: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
    },
  });
}

async function getWeeklyStats(req, res) {
  const { start } = req.validated.query;
  const anchor = start ? safeDate(start) : new Date();
  const weekStart = startOfWeekShanghai(anchor);
  const weekEnd = addDays(weekStart, 7);

  const pipeline = [
    { $match: buildMatch({ from: weekStart, to: weekEnd }) },
    {
      $facet: {
        byDay: [
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                    timezone: config.timezone,
                  },
                },
                emotion: "$emotion",
              },
              count: { $sum: 1 },
              avgIntensity: { $avg: "$intensity" },
            },
          },
        ],
        tags: [
          { $group: { _id: "$sceneTag", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
      },
    },
  ];

  const [facet] = await Treehole.aggregate(pipeline);
  const byDay = facet?.byDay || [];

  const days = enumerateDays(weekStart, weekEnd).map((day) => {
    const date = formatDateOnly(day);
    const rows = byDay
      .filter((row) => row._id.date === date)
      .map((row) => ({ _id: row._id.emotion, count: row.count, avgIntensity: row.avgIntensity }));
    const totals = totalsFromRows(rows);
    return {
      date,
      total: totals.total,
      distribution: totals.distribution,
      valence: totals.valence,
      arousal: totals.arousal,
      avgIntensity: totals.avgIntensity,
      dominant: totals.dominant,
    };
  });

  const allRows = byDay.map((row) => ({
    _id: row._id.emotion,
    count: row.count,
    avgIntensity: row.avgIntensity,
  }));
  const totals = totalsFromRows(allRows);

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.json({
    ok: true,
    data: {
      startDate: formatDateOnly(weekStart),
      endDate: formatDateOnly(addDays(weekEnd, -1)),
      timezone: config.timezone,
      range: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
      total: totals.total,
      distribution: totals.distribution,
      ratios: totals.ratios,
      avgIntensity: totals.avgIntensity,
      valence: totals.valence,
      arousal: totals.arousal,
      dominant: totals.dominant,
      days,
      trend: days.map((day) => ({
        date: day.date,
        total: day.total,
        valence: day.valence,
        arousal: day.arousal,
      })),
      topTags: shapeTags(facet?.tags),
      generatedAt: new Date().toISOString(),
    },
  });
}

async function getRealtimeStats(req, res) {
  const { limit } = req.validated.query;
  const now = new Date();
  const match = {
    isPublic: true,
    status: "active",
    publishAt: { $lte: now },
  };

  const [facetRows, stars] = await Promise.all([
    Treehole.aggregate([
      { $match: match },
      {
        $facet: {
          emotions: [
            {
              $group: {
                _id: "$emotion",
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" },
              },
            },
          ],
          tags: [
            { $group: { _id: "$sceneTag", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 5 },
          ],
        },
      },
    ]),
    Treehole.find(match)
      .sort({ publishAt: -1, _id: -1 })
      .limit(limit)
      .select("content emotion intensity sceneTag publishAt createdAt")
      .lean(),
  ]);

  const facet = facetRows[0] || {};
  const totals = totalsFromRows(facet.emotions || []);

  res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
  res.json({
    ok: true,
    data: {
      total: totals.total,
      distribution: totals.distribution,
      ratios: totals.ratios,
      avgIntensity: totals.avgIntensity,
      valence: totals.valence,
      arousal: totals.arousal,
      dominant: totals.dominant,
      topTags: shapeTags(facet.tags),
      stars: stars.map((star) => ({
        id: String(star._id),
        content: star.content,
        emotion: star.emotion,
        intensity: star.intensity,
        sceneTag: star.sceneTag,
        sceneTagLabel: sceneTagLabel(star.sceneTag),
        valence: EMOTION_VALENCE[star.emotion] ?? 0,
        arousal: round((star.intensity || 0) / 10, 2),
        publishAt: star.publishAt ? new Date(star.publishAt).toISOString() : null,
        createdAt: star.createdAt ? new Date(star.createdAt).toISOString() : null,
      })),
      timezone: config.timezone,
      generatedAt: now.toISOString(),
    },
  });
}

async function getSelfCheck(req, res) {
  const { days } = req.validated.query;
  const now = new Date();
  const to = addDays(startOfDayShanghai(now), 1);
  const from = addDays(to, -days);
  const match = {
    anonymousId: req.anonymousId,
    isPublic: false,
    status: "active",
    createdAt: { $gte: from, $lt: to },
  };

  const [facetRows, recent] = await Promise.all([
    Treehole.aggregate([
      { $match: match },
      {
        $facet: {
          emotions: [
            {
              $group: {
                _id: "$emotion",
                count: { $sum: 1 },
                avgIntensity: { $avg: "$intensity" },
              },
            },
          ],
          tags: [
            { $group: { _id: "$sceneTag", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 3 },
          ],
        },
      },
    ]),
    Treehole.find(match)
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .select("emotion intensity sceneTag createdAt")
      .lean(),
  ]);

  const facet = facetRows[0] || {};
  const totals = totalsFromRows(facet.emotions || []);
  const topTags = shapeTags(facet.tags);
  const top = topTags[0];

  let summary = "最近还没有留下私密记录。";
  if (top) {
    summary =
      top.count > 1
        ? `最近${days}天，你多次提到「${top.label}」。`
        : `最近${days}天，你留下过一次关于「${top.label}」的记录。`;
  }

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    data: {
      window: {
        days,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      total: totals.total,
      distribution: totals.distribution,
      ratios: totals.ratios,
      avgIntensity: totals.avgIntensity,
      dominant: totals.dominant,
      topTags,
      summary,
      recent: recent.map((item) => ({
        emotion: item.emotion,
        intensity: item.intensity,
        sceneTag: item.sceneTag,
        sceneTagLabel: sceneTagLabel(item.sceneTag),
        createdAt: new Date(item.createdAt).toISOString(),
      })),
      disclaimer: "这不是心理诊断，只是你自己留下的记录。",
      timezone: config.timezone,
      generatedAt: now.toISOString(),
    },
  });
}

module.exports = { getDailyStats, getWeeklyStats, getRealtimeStats, getSelfCheck };

