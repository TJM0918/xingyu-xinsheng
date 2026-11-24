"use strict";

const EMOTIONS = Object.freeze(["positive", "negative", "neutral"]);

const EMOTION_LABELS = Object.freeze({
  positive: "积极",
  negative: "消极",
  neutral: "中性",
});

/** 东大专属场景标签：共鸣来自“处境相同”，而不是抽象情绪。 */
const SCENE_TAGS = Object.freeze({
  cpp_lab: "C++实验",
  final_exam: "期末机考",
  gpa: "绩点/保研边缘",
  competition: "竞赛备赛",
  postgrad: "保研/考研",
  club: "社团内耗",
  shuttle: "跨校区通勤",
  canteen: "食堂",
  group_project: "小组作业",
  peer_pressure: "同辈压力",
  dorm: "宿舍关系",
  internship: "实习/秋招",
  family: "家庭",
  relationship: "关系",
  sleep: "失眠",
  self_doubt: "自我怀疑",
  other: "其他",
});

const SCENE_TAG_KEYS = Object.freeze(Object.keys(SCENE_TAGS));

const CAMPUS_LOCATIONS = Object.freeze({
  jiulonghu: "九龙湖校区",
  sipailou: "四牌楼校区",
  dingjiaqiao: "丁家桥校区",
  suzhou: "苏州校区",
  library: "图书馆",
  teaching_building: "教学楼",
  dorm: "宿舍",
  canteen: "食堂",
  sports_field: "操场",
  other: "其他",
  unspecified: "不标记",
});

const CAMPUS_LOCATION_KEYS = Object.freeze(Object.keys(CAMPUS_LOCATIONS));

const POLARITY_LABELS = Object.freeze({
  positive: "积极",
  negative: "消极",
  neutral: "中性",
  mixed: "复杂",
});

function sceneTagLabel(key) {
  return SCENE_TAGS[key] || SCENE_TAGS.other;
}

function campusLocationLabel(key) {
  return CAMPUS_LOCATIONS[key] || CAMPUS_LOCATIONS.unspecified;
}

module.exports = {
  EMOTIONS,
  EMOTION_LABELS,
  SCENE_TAGS,
  SCENE_TAG_KEYS,
  CAMPUS_LOCATIONS,
  CAMPUS_LOCATION_KEYS,
  POLARITY_LABELS,
  sceneTagLabel,
  campusLocationLabel,
};
