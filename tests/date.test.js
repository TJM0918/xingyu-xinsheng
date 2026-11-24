"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatDateOnly,
  parseDateOnly,
  startOfDayShanghai,
  startOfWeekShanghai,
  addDays,
  enumerateDays,
  parseDateInput,
} = require("../src/utils/date");

test("上海时区日界：00:00 对应前一天 16:00Z", () => {
  const date = parseDateOnly("2026-11-22");
  assert.equal(date.toISOString(), "2026-11-21T16:00:00.000Z");
  assert.equal(formatDateOnly(date), "2026-11-22");
});

test("startOfDayShanghai 对凌晨和深夜都落在同一天", () => {
  const early = startOfDayShanghai(new Date("2026-11-22T00:05:00+08:00"));
  const late = startOfDayShanghai(new Date("2026-11-22T23:55:00+08:00"));
  assert.equal(early.toISOString(), "2026-11-21T16:00:00.000Z");
  assert.equal(early.toISOString(), late.toISOString());
});

test("周起点为周一（周日属于上一周）", () => {
  const sunday = startOfWeekShanghai(new Date("2026-11-22T12:00:00+08:00"));
  assert.equal(formatDateOnly(sunday), "2026-11-16");
  assert.equal(sunday.toISOString(), "2026-11-15T16:00:00.000Z");
});

test("addDays / enumerateDays 生成 7 天且无重叠", () => {
  const start = parseDateOnly("2026-11-16");
  const days = enumerateDays(start, addDays(start, 7));
  assert.equal(days.length, 7);
  assert.equal(formatDateOnly(days[0]), "2026-11-16");
  assert.equal(formatDateOnly(days[6]), "2026-11-22");
});

test("拒绝不存在的日期和错误格式", () => {
  assert.throws(() => parseDateOnly("2026-02-31"), /不存在的日期/);
  assert.throws(() => parseDateOnly("2026/02/01"), /YYYY-MM-DD/);
});

test("parseDateInput 支持 date-only 与 ISO", () => {
  assert.equal(parseDateInput("2026-11-22").toISOString(), "2026-11-21T16:00:00.000Z");
  assert.equal(
    parseDateInput("2026-11-22T20:00:00+08:00").toISOString(),
    "2026-11-22T12:00:00.000Z"
  );
  assert.equal(
    parseDateInput("2026-11-22 20:00").toISOString(),
    "2026-11-22T12:00:00.000Z"
  );
  assert.equal(
    parseDateInput("2026-11-22T20:00:00").toISOString(),
    "2026-11-22T12:00:00.000Z"
  );
  assert.throws(() => parseDateInput("2026-11-22T20:00:00abc"), /时区|格式/);
});
