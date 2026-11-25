"use strict";

const config = require("../config");
const { sceneTagLabel } = require("../constants");

// 说明：2026-11-25 移除了“其实”“至少”两个词。
// 它们是中文高频连接词，模型几乎必用，误伤率远高于实际风险；
// “至少”的消解式意味（如“至少你还有…”）由 prompt 约束，不靠词表兜底。
const BANNED_COMFORT_PHRASES = [
  "你应该",
  "建议你",
  "想开点",
  "加油",
  "振作",
  "别想太多",
  "会好起来的",
  "诊断",
  "抑郁症",
];

const OPENERS = {
  焦虑: [
    "我听见了。那种一直悬着、放不下来的感觉，真的很消耗人。",
    "我听见了。脑子停不下来的时候，连休息都像在待命。",
  ],
  悲伤: [
    "我听见了。有些难过不需要理由，也不需要马上被修好。",
    "我听见了。想哭的时候，不用先说服自己“值得哭”。",
  ],
  愤怒: [
    "我听见了。会觉得生气，往往是因为某件事真的越过了你的边界。",
    "我听见了。那股火不是小题大做，它只是需要一个不被评判的地方。",
  ],
  孤独: [
    "我听见了。人在很多人的校园里，也可以觉得很孤单。",
    "我听见了。不是所有孤单都能被一场热闹解决。",
  ],
  疲惫: [
    "我听见了。撑了很久的人，说“累”的时候往往已经撑得太久了。",
    "我听见了。现在这种提不起力气，不代表你变差了。",
  ],
  迷茫: [
    "我听见了。看不清下一步的时候，站在原地也不算错。",
    "我听见了。不是所有问题都要在今天想明白。",
  ],
  自卑: [
    "我听见了。你拿自己和别人比较的时候，可能忘了自己已经走了多远。",
    "我听见了。此刻你对自己的评价，不等于你真实的样子。",
  ],
  喜悦: [
    "这份亮光我接住了。它是真的，你不需要急着把它说小。",
    "我听见了。这样的时刻值得在这里多停一会儿。",
  ],
  期待: [
    "我听见了。心里还留着一点盼头，本身就是很珍贵的事。",
    "我听见了。等着某件事发生的时候，时间会变得很具体。",
  ],
  平静: [
    "我听见了。今天没有很大的起伏，也只是这样安安静静地过去了。",
    "我听见了。平平的一天，也值得被好好放下。",
  ],
};

const CLOSERS = [
  "今晚你不用证明什么，也不用马上好起来。先把这句话放在这里。",
  "你不需要为这种感受解释太多。它可以先被放在这里，不必立刻解决。",
  "在这里，情绪不需要被排版得很整齐。你可以就先这样待一会儿。",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function localComfort({ emotion, intensity, sceneTag, riskLevel }) {
  const scene = sceneTagLabel(sceneTag);
  const opener = pick(OPENERS[emotion] || OPENERS.平静);
  const sceneLine =
    scene && scene !== "其他"
      ? `被“${scene}”反复碰到的时候，人很容易以为只有自己这样。`
      : "有些感受很难被归到某一个具体的原因里。";
  const intensityLine =
    intensity >= 8
      ? "它现在看起来很重，这不代表你会一直被困在这里。"
      : intensity <= 3
        ? "它也许不算汹涌，但依然值得被认真对待。"
        : "它不需要被放大，也不需要被压小。";

  let text = `${opener}${sceneLine}${intensityLine}${pick(CLOSERS)}`;

  if (riskLevel >= 1) {
    text += ` 如果这种撑不住的感觉一直不走，学校 24 小时心理支持热线是 ${config.support.campusHotline}。不用等到很严重才打。`;
  }

  return {
    text,
    provider: "local",
    createdAt: new Date(),
    note: "这是一段自动生成的陪伴文字，不是心理咨询。",
  };
}

function matchedBannedPhrase(text) {
  if (!text) return null;
  return BANNED_COMFORT_PHRASES.find((phrase) => text.includes(phrase)) || null;
}

function isSafeComfort(text) {
  if (!text || text.length < 20 || text.length > 600) return false;
  return !matchedBannedPhrase(text);
}

async function requestLlmComfort({ content, emotion, intensity, sceneTag, riskLevel }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);

  try {
    const systemPrompt = [
      "你在为校园匿名树洞写一段自动生成的陪伴文字，会直接展示给写作者本人。",
      "用平实、日常的中文，60~100 字。不要文学腔、不要比喻、不要排比、不要夜色或星空的意象。",
      "只做三件事：承认这份感受是真实的；说明类似处境里会有类似的感受；给一句不带压力的收束。",
      "硬性限制：",
      "1. 不要用第一人称示好，不说“我陪着”“我在”“我听见了”“我接住了”“我懂你”这类暗示你是个人的话；",
      "2. 不复述、不引用、不转述对方写下的任何内容，包括原话、场景细节和自我评价；",
      "3. 不扮演角色，不给自己起名字，不提及 AI、模型或系统；",
      "4. 不建议、不诊断、不归因、不提问、不承诺、不列步骤、不喊口号；",
      "5. 不使用这些词：你应该、建议你、想开点、加油、振作、别想太多、会好起来的、乖、抱抱。",
      "如果文字里有危机信号，不讨论任何细节，只写这种感受值得被认真对待，并提示可以联系学校的心理支持。",
    ].join("\n");

    const userPrompt = JSON.stringify({
      content,
      emotion,
      intensity,
      scene: sceneTagLabel(sceneTag),
      risk_level: riskLevel,
    });

    const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        temperature: 0.7,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LLM HTTP ${response.status}`);
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content?.trim();
    const banned = matchedBannedPhrase(text);
    if (!isSafeComfort(text)) {
      const reason = !text
        ? "empty"
        : text.length < 20
          ? `too-short:${text.length}`
          : text.length > 600
            ? `too-long:${text.length}`
            : `banned-phrase:${banned}`;
      throw new Error(`LLM comfort failed safety guard: ${reason}`);
    }

    return {
      text,
      provider: "llm",
      createdAt: new Date(),
      note: "这是一段自动生成的陪伴文字，不是心理咨询。",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 生成私密树洞的安抚文字。LLM 不可用、超时或触发安全护栏时，
 * 自动重试一次，仍失败再回退到本地模板；调用方不需要处理失败。
 */
async function generateComfort(input) {
  const fallback = localComfort(input);
  if (!config.llm.enabled) return fallback;

  const ATTEMPTS = 2;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await requestLlmComfort(input);
    } catch (error) {
      console.warn(
        `[comfort] LLM fallback (attempt ${attempt}/${ATTEMPTS}): ${error.message}`
      );
    }
  }

  return fallback;
}

module.exports = { generateComfort, localComfort, isSafeComfort };
