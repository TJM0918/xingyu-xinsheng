"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { analyzeText, detectRisk } = require("../src/services/analyzer");

test("负面学业表达：有情绪、有主题，但不误报危机", () => {
  const result = analyzeText("明天 C++ 实验和期末机考，真的好焦虑，复习不完了");
  assert.equal(result.polarity, "negative");
  assert.equal(result.dominant, "焦虑");
  assert.ok(result.valence < -0.15);
  assert.ok(result.topics.includes("学业"));
  assert.equal(result.risk.level, 0);
  assert.equal(result.needs_support, false);
});

test("积极表达：valence 为正，情绪为喜悦", () => {
  const result = analyzeText("拿到 offer 了，特别开心，感觉一切值得！");
  assert.equal(result.polarity, "positive");
  assert.ok(result.valence > 0.15);
  assert.equal(result.dominant, "喜悦");
  assert.equal(result.risk.level, 0);
});

test("明确的自伤表达：直接进入危机级别并附支持信息", () => {
  const result = analyzeText("我不想活了，真的撑不下去了");
  assert.equal(result.risk.level, 2);
  assert.equal(result.needs_support, true);
  assert.ok(result.valence <= -0.85);
  assert.ok(result.support);
  assert.ok(result.support.hotlines.some((item) => item.phone === "12356"));
});

test("“想死你了”不是危机表达", () => {
  assert.equal(detectRisk("想死你了，什么时候回来").level, 0);
});

test("否定式表达不误报危机", () => {
  assert.equal(detectRisk("我不想死，我想好好活着").level, 0);
  assert.equal(detectRisk("我不会自杀，只是最近有点撑不住").level, 1);
});

test("“笑死”不触发危机，但保留正向情绪", () => {
  const result = analyzeText("笑死，高数终于过了");
  assert.equal(result.risk.level, 0);
  assert.equal(result.polarity, "positive");
});

test("持续低落表达进入 level 1，而不是 crisis", () => {
  const result = analyzeText("最近一直失眠，好累，没人懂");
  assert.equal(result.risk.level, 1);
  assert.equal(result.needs_support, true);
});

test("分析器返回前端约定的稳定字段", () => {
  const result = analyzeText("今天下雨了");
  for (const key of [
    "valence",
    "arousal",
    "dominant",
    "emotions",
    "polarity",
    "topics",
    "keywords",
    "risk",
    "summary",
    "needs_support",
    "confidence",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(result, key), `missing ${key}`);
  }
  assert.ok(Array.isArray(result.emotions));
  assert.ok(result.valence >= -1 && result.valence <= 1);
  assert.ok(result.arousal >= 0.12 && result.arousal <= 1);
});
