"use strict";

const config = require("../config");

/**
 * 危机支持卡片。只提供“此刻先保证安全”的信息，不做诊断、不承诺疗效。
 * 联系方式以学校最新通知为准，可通过环境变量覆盖。
 */
function buildCrisisSupport() {
  return {
    kind: "crisis_support",
    title: "这句话里有需要被认真接住的信号",
    message:
      "先不用一个人扛。请把安全放在第一位：如果你可能马上伤害自己，请立刻联系身边可信任的人、拨打 120，或前往最近的急诊。",
    actions: [
      "先把手机放下，去一个有其他人的地方，告诉一个人你现在不太好。",
      "如果危险就在眼前，请拨打 110 或 120。",
      "你不需要等到“足够严重”才值得被帮助。",
    ],
    hotlines: [
      {
        name: "全国统一心理援助热线",
        phone: "12356",
        note: "全年响应，24 小时",
      },
      {
        name: "江苏省大学生心理热线",
        phone: "025-58255200",
        note: "24 小时公益热线",
      },
      {
        name: "东南大学校内 24 小时热线",
        phone: config.support.campusHotline,
        note: "夜间心理危机支持",
      },
    ],
    campus: {
      name: config.support.campusName,
      phone: config.support.campusPhone,
      note: config.support.campusNote,
    },
    disclaimer:
      "星语心声不是心理咨询或医疗平台。这段信息不能替代专业帮助，但可以陪你走到下一步。",
  };
}

function buildSupportResources() {
  return {
    title: "如果此刻不太好",
    message: "你不需要先证明自己“够严重”，才配得到帮助。",
    hotlines: buildCrisisSupport().hotlines,
    campus: buildCrisisSupport().campus,
    disclaimer: buildCrisisSupport().disclaimer,
  };
}

module.exports = { buildCrisisSupport, buildSupportResources };
