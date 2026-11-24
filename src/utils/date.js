"use strict";

/**
 * 平台统一使用 Asia/Shanghai。中国不实行夏令时，固定 +08:00，
 * 因而可以直接用毫秒偏移做日/周边界计算，避免引入额外时区依赖。
 */
const TIMEZONE = "Asia/Shanghai";
const OFFSET_MINUTES = 8 * 60;
const OFFSET_MS = OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function assertValidDate(date, label = "日期") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError(`${label}无效`);
  }
  return date;
}

/** 将任意时刻格式化为上海时区的 YYYY-MM-DD。 */
function formatDateOnly(date = new Date()) {
  assertValidDate(date);
  const shifted = new Date(date.getTime() + OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 解析 YYYY-MM-DD（按上海时区 00:00 解释），并拒绝 2026-02-31 这类假日期。 */
function parseDateOnly(value) {
  if (typeof value !== "string") throw new TypeError("日期必须是 YYYY-MM-DD 字符串");
  const match = DATE_ONLY_RE.exec(value);
  if (!match) throw new RangeError("日期格式必须是 YYYY-MM-DD");
  const [, y, m, d] = match;
  const utc = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const date = new Date(utc - OFFSET_MS);
  if (formatDateOnly(date) !== value) throw new RangeError(`不存在的日期：${value}`);
  return date;
}

/** 上海时区当天 00:00:00.000 对应的绝对时刻。 */
function startOfDayShanghai(date = new Date()) {
  return parseDateOnly(formatDateOnly(assertValidDate(date)));
}

/** 加若干天。上海时区无夏令时，直接加 24h 是安全的。 */
function addDays(date, days) {
  return new Date(assertValidDate(date).getTime() + days * DAY_MS);
}

/** 本周一 00:00（上海时区）。周日属于上一周的周一~周日区间。 */
function startOfWeekShanghai(date = new Date()) {
  const localDateOnly = formatDateOnly(assertValidDate(date));
  const utcMidnight = new Date(`${localDateOnly}T00:00:00.000Z`);
  const weekday = utcMidnight.getUTCDay(); // 0=Sun, 1=Mon...
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(parseDateOnly(localDateOnly), -daysSinceMonday);
}

const LOCAL_DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
const ZONED_DATE_TIME_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/** 解析 ISO 时间或 YYYY-MM-DD；date-only 按上海时区当天 00:00。 */
function parseDateInput(value, label = "时间") {
  if (value instanceof Date) return assertValidDate(value, label);
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label}不能为空`);

  const input = value.trim();
  if (DATE_ONLY_RE.test(input)) return parseDateOnly(input);

  // 没有时区的 datetime-local 一律按上海时区解释，避免服务器部署在 UTC 时偏移 8 小时。
  if (LOCAL_DATE_TIME_RE.test(input)) {
    return assertValidDate(new Date(`${input.replace(" ", "T")}+08:00`), label);
  }
  if (!ZONED_DATE_TIME_RE.test(input)) {
    throw new RangeError(`${label}必须包含时区，例如 2027-01-01T09:00:00+08:00`);
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) throw new RangeError(`${label}格式不正确`);
  return date;
}

function enumerateDays(start, endExclusive) {
  const days = [];
  for (let cursor = start; cursor < endExclusive; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

/** 当前小时的起点（上海时区），用于实时统计窗口。 */
function startOfHourShanghai(date = new Date()) {
  const dayStart = startOfDayShanghai(date);
  const hours = Math.floor((date.getTime() - dayStart.getTime()) / 3_600_000);
  return new Date(dayStart.getTime() + hours * 3_600_000);
}

function toIsoString(date) {
  return assertValidDate(date).toISOString();
}

module.exports = {
  TIMEZONE,
  OFFSET_MINUTES,
  DAY_MS,
  formatDateOnly,
  parseDateOnly,
  startOfDayShanghai,
  startOfWeekShanghai,
  addDays,
  parseDateInput,
  enumerateDays,
  startOfHourShanghai,
  toIsoString,
};
