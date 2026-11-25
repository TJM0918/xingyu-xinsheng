"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// 必须在 require 之前设置：config 在模块加载时读取环境变量
process.env.API_KEY = "test-key";
process.env.LLM_BASE_URL = "https://llm.example.invalid/v1";
process.env.LLM_MODEL = "test-model";
process.env.LLM_TIMEOUT_MS = "5000";

const { generateComfort, isSafeComfort } = require("../src/services/comfort");

const GOOD =
  "我听见了。其实你现在这种提不起力气的感觉，不代表你变差了。至少今晚你不用证明什么，也不用马上好起来。";
const BANNED =
  "你应该早点睡，想开点就好了，别想太多，明天会好起来的，振作一点。";

function stubFetch(contents) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    const content = contents[Math.min(calls.length - 1, contents.length - 1)];
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    };
  };
  return { calls, restore: () => { global.fetch = original; } };
}

test("护栏识别：命中禁用词表即不安全", () => {
  assert.equal(isSafeComfort(GOOD), true);
  assert.equal(isSafeComfort(BANNED), false);
  assert.equal(isSafeComfort("太短"), false);
  assert.equal(isSafeComfort(""), false);
});

test("“其实”“至少”已按产品决定移出词表，不再拦截", () => {
  assert.equal(
    isSafeComfort(
      "我听见了。其实有些难受说不上原因，至少今晚可以先把它放在这里，不用马上好起来。"
    ),
    true
  );
});

test("命中护栏后重试一次，第二次通过则采用模型文字", async () => {
  const stub = stubFetch([BANNED, GOOD]);
  try {
    const result = await generateComfort({
      content: "今天很累",
      emotion: "疲惫",
      intensity: 6,
      sceneTag: "other",
      riskLevel: 0,
    });
    assert.equal(stub.calls.length, 2, "应该重试一次");
    assert.equal(result.provider, "llm");
    assert.equal(stub.calls[0].url, "https://llm.example.invalid/v1/chat/completions");
    assert.equal(stub.calls[0].body.model, "test-model");
    assert.match(
      String(stub.calls[0].body.messages[0].content),
      /自动生成的陪伴文字/,
      "system prompt 应该说明这是自动生成的文字"
    );
    assert.doesNotMatch(
      String(stub.calls[0].body.messages[0].content),
      /守夜人/,
      "system prompt 不应再让模型扮演人格化角色"
    );
  } finally {
    stub.restore();
  }
});

test("4xx 属于确定性失败，不重试以免双倍消耗配额", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return { ok: false, status: 429, json: async () => ({}) };
  };
  try {
    const result = await generateComfort({
      content: "今天很累",
      emotion: "疲惫",
      intensity: 6,
      sceneTag: "other",
      riskLevel: 0,
    });
    assert.equal(calls, 1, "429 不应该重试");
    assert.equal(result.provider, "local");
  } finally {
    global.fetch = original;
  }
});

test("两次都命中护栏时回退本地模板", async () => {
  const stub = stubFetch([BANNED, BANNED]);
  try {
    const result = await generateComfort({
      content: "今天很累",
      emotion: "疲惫",
      intensity: 6,
      sceneTag: "other",
      riskLevel: 0,
    });
    assert.equal(stub.calls.length, 2);
    assert.equal(result.provider, "local");
    assert.ok(result.text.length > 20);
  } finally {
    stub.restore();
  }
});
