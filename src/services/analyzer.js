"use strict";

const { buildCrisisSupport } = require("./support");

/**
 * 一个刻意保持“保守”的中文规则分析器：
 * - 只做情绪/主题粗分，不做心理诊断；
 * - 危机识别优先于情绪识别；
 * - 即使模型不可用，/api/analyze 也永远有结果。
 */
const EMOTION_LEXICON = Object.freeze({
  焦虑: [
    "焦虑", "紧张", "担心", "压力", "害怕", "不安", "考砸", "挂科", "来不及",
    "ddl", "DDL", "内耗", "期末", "考试", "复习", "绩点", "内卷", "不敢",
    "发抖", "心慌", "保研", "机考", "实验", "答辩", "竞赛", "卷", "怕",
  ],
  悲伤: [
    "难过", "伤心", "失落", "想哭", "哭了", "委屈", "心痛", "遗憾", "难受",
    "emo", "分手", "失望", "离开", "失去", "低落", "低落", "眼泪", "破防",
  ],
  愤怒: [
    "生气", "愤怒", "讨厌", "恶心", "凭什么", "无语", "烦死", "气死", "离谱",
    "过分", "火大", "恼火", "不公平", "憋屈",
  ],
  孤独: [
    "孤独", "一个人", "没人", "寂寞", "融不进去", "格格不入", "被孤立",
    "没人懂", "没朋友", "孤零零", "空荡荡",
  ],
  疲惫: [
    "累", "疲惫", "好困", "熬夜", "通宵", "麻了", "撑不住", "没力气",
    "提不起", "消耗", "睡不着", "困", "倦", "筋疲力尽", "硬撑",
  ],
  迷茫: [
    "迷茫", "不知道", "没方向", "困惑", "怎么办", "未来", "意义", "无措",
    "看不清", "走一步看一步",
  ],
  自卑: [
    "废物", "自卑", "不如", "配不上", "差劲", "丢人", "没用", "讨厌自己",
    "失败", "不够好", "比不上", "很差",
  ],
  喜悦: [
    "开心", "高兴", "快乐", "幸福", "太好了", "激动", "满足", "值得",
    "上岸", "过了", "夸", "成功", "拿到", "不错", "顺利", "惊喜", "幸运",
  ],
  平静: [
    "平静", "安稳", "还好", "无所谓", "就这样", "放松", "习惯了", "普通",
    "平淡", "安静",
  ],
  期待: [
    "期待", "盼望", "希望", "憧憬", "马上", "等着", "回家", "想去", "盼着",
  ],
});

const TOPIC_LEXICON = Object.freeze({
  学业: [
    "考试", "期末", "绩点", "保研", "考研", "论文", "答辩", "作业", "课程",
    "老师", "上课", "图书馆", "机考", "实验", "竞赛", "学分", "培养方案",
  ],
  人际: ["室友", "同学", "朋友", "社团", "宿舍", "社交", "关系", "小组", "队友"],
  恋爱: ["恋爱", "男朋友", "女朋友", "分手", "表白", "暗恋", "异地", "喜欢的人"],
  家庭: ["爸妈", "父母", "家里", "家人", "回家", "亲戚"],
  就业: ["实习", "求职", "面试", "简历", "就业", "工作", "offer", "秋招", "春招"],
  经济: ["生活费", "穷", "兼职", "学费", "花呗", "钱"],
  健康: ["失眠", "睡不着", "头痛", "生病", "熬夜", "身体", "医院", "吃药"],
  自我: ["自己", "价值", "存在", "性格", "未来", "意义", "人生"],
  校园: ["食堂", "校车", "通勤", "九龙湖", "四牌楼", "丁家桥", "苏州校区", "操场"],
});

const POSITIVE_LABELS = new Set(["喜悦", "期待"]);
const NEGATIVE_LABELS = new Set(["焦虑", "悲伤", "愤怒", "孤独", "疲惫", "迷茫", "自卑"]);

const CRISIS_PATTERNS = [
  /(?:我|自己).{0,10}(?<!不)(?:想|要|准备|打算|计划).{0,8}(?:去死|死掉|自杀|结束生命|消失)/,
  /(?<!不)(?<!不想)(?<!不会)(?<!没有)(?<!并不)自杀(?!式)/,
  /(?<!不)(?<!不想)(?<!不会)(?<!没有)(?<!并不)自残(?!式)/,
  /割腕|跳楼(?!机)|上吊|吞药|烧炭|卧轨|(?<!不)(?<!不要)轻生/,
  /遗书|遗言/,
  /活不下去|不想活(?:了|着)?|不想再活|活着没(?:有)?(?:意思|意义)/,
  /死了算了|不如死|(?<!不)(?<!不想)(?<!不是)想死(?!你|我)|想一了百了|一了百了/,
  /(?<!不)(?<!不想)想消失|彻底睡过去|不用(?:再)?醒来|没有我(?:会)?更好/,
  /(?:从|在).{0,10}(?:世界|人间|天台|楼顶).{0,12}(?:消失|跳下去|离开)/,
  /(?:最后一条|最后一次).{0,12}(?:留言|消息|帖子|说话)/,
  /(?<!不)(?<!不想)(?<!不要)(?:想|要)去死/,
  /(?:结束|了结)(?:这)?(?:一切|自己|生命)/,
];

const DISTRESS_PATTERNS = [
  /撑不住/, /快崩/, /崩溃/, /没人(?:懂|理|在乎)/, /孤独/, /失眠/, /讨厌自己/,
  /没价值/, /好累/, /想哭/, /绝望/, /无助/, /喘不过气/, /不想起床/,
  /没有意义/, /浑浑噩噩/, /害怕明天/, /熬不下去/, /看不到希望/, /麻木/,
  /不想说话/, /空空的/, /好难受/, /不想存在/, /厌世/,
];

const INTENSIFIERS = ["太", "特别", "真的", "非常", "完全", "彻底", "一直", "反复", "超级", "极其"];

function countOccurrences(text, word) {
  if (!word) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const at = text.indexOf(word, from);
    if (at === -1) return count;
    count += 1;
    from = at + Math.max(1, word.length);
  }
}

function detectRisk(text) {
  const level2 = CRISIS_PATTERNS.some((re) => re.test(text));
  if (level2) {
    return {
      level: 2,
      signals: ["危机表达"],
      needs_support: true,
    };
  }
  const level1 = DISTRESS_PATTERNS.some((re) => re.test(text));
  return {
    level: level1 ? 1 : 0,
    signals: level1 ? ["持续低落或求助信号"] : [],
    needs_support: level1,
  };
}

function scoreEmotions(text) {
  const rows = [];
  const matchedKeywords = [];

  for (const [label, words] of Object.entries(EMOTION_LEXICON)) {
    let count = 0;
    const matched = [];
    for (const word of words) {
      const hits = countOccurrences(text, word);
      if (!hits) continue;
      count += hits;
      matched.push(word);
      matchedKeywords.push(word);
    }
    if (count > 0) {
      rows.push({
        label,
        count,
        matched,
        score: Math.min(0.97, 0.4 + count * 0.12),
      });
    }
  }

  rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"));
  return { rows, matchedKeywords };
}

function scoreTopics(text) {
  const topics = [];
  for (const [topic, words] of Object.entries(TOPIC_LEXICON)) {
    if (words.some((word) => text.includes(word))) topics.push(topic);
  }
  return topics.slice(0, 3);
}

function buildSummary(dominant, topics, polarity, riskLevel) {
  if (riskLevel === 2) return "这句话里有需要被认真接住的信号。先别一个人扛。";
  const topic = topics[0] ? `，和${topics[0]}有关` : "";
  if (polarity === "positive") return `像是${dominant}，也带着一点亮光${topic}。`;
  if (polarity === "negative") return `像是${dominant}${topic}。不需要马上变好。`;
  return `更像是${dominant}，没有很强烈的起伏${topic}。`;
}

/**
 * @param {string} rawText
 * @returns {{
 *   valence:number, arousal:number, dominant:string,
 *   emotions:Array<{label:string,score:number}>, polarity:string,
 *   topics:string[], keywords:string[], risk:{level:number,signals:string[],needs_support:boolean},
 *   summary:string, needs_support:boolean, confidence:number, support?:object
 * }}
 */
function analyzeText(rawText) {
  const text = String(rawText || "")
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .trim();

  const risk = detectRisk(text);
  const { rows, matchedKeywords } = scoreEmotions(text);
  const topics = scoreTopics(text);

  const pos = rows
    .filter((row) => POSITIVE_LABELS.has(row.label))
    .reduce((sum, row) => sum + row.count, 0);
  const neg = rows
    .filter((row) => NEGATIVE_LABELS.has(row.label))
    .reduce((sum, row) => sum + row.count, 0);

  let valence = ((pos - neg) / (pos + neg + 1.5)) * 1.2;
  valence = Math.max(-1, Math.min(1, valence));

  const bangs = (text.match(/[!！]/g) || []).length;
  const repeated = /([!！?？。])\1{1,}/.test(text) ? 0.06 : 0;
  const intensifierHits = INTENSIFIERS.reduce(
    (sum, word) => sum + (text.includes(word) ? 1 : 0),
    0
  );
  const negEnergy = (neg / (pos + neg + 1)) * 0.36;
  let arousal = 0.26 + bangs * 0.055 + repeated + Math.min(0.12, intensifierHits * 0.025) + negEnergy;
  if (rows.some((row) => row.label === "平静") && neg === 0) arousal *= 0.82;
  arousal = Math.max(0.12, Math.min(1, arousal));

  let polarity = valence > 0.15 ? "positive" : valence < -0.15 ? "negative" : "neutral";
  if (polarity === "negative" && valence > -0.16) valence = -0.16;
  if (polarity === "positive" && valence < 0.16) valence = 0.16;

  if (risk.level === 2) {
    valence = Math.min(valence, -0.85);
    arousal = Math.max(arousal, 0.7);
    polarity = "negative";
  }

  const dominant = rows[0]?.label || "平静";
  const emotions = rows.length
    ? rows.slice(0, 3).map(({ label, score }) => ({ label, score: Number(score.toFixed(2)) }))
    : [{ label: "平静", score: 0.4 }];

  const uniqueKeywords = [...new Set(matchedKeywords)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 6);

  const confidence = Number(
    Math.min(
      0.88,
      0.28 + Math.min(0.48, rows.reduce((sum, row) => sum + row.count, 0) * 0.055) + (topics.length ? 0.05 : 0)
    ).toFixed(2)
  );

  const result = {
    valence: Number(valence.toFixed(2)),
    arousal: Number(arousal.toFixed(2)),
    dominant,
    emotions,
    polarity,
    topics: topics.length ? topics : ["其他"],
    keywords: uniqueKeywords,
    risk,
    summary: buildSummary(dominant, topics, polarity, risk.level),
    needs_support: risk.needs_support,
    confidence,
  };

  if (risk.level === 2) result.support = buildCrisisSupport();
  return result;
}

module.exports = { analyzeText, detectRisk };
