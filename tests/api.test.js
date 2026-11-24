"use strict";

process.env.NODE_ENV = "test";
process.env.AUDIT_HMAC_SECRET = "test-audit-secret";
process.env.RATE_LIMIT_ENABLED = "false";

const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { createApp } = require("../src/app");
const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const Treehole = require("../src/models/Treehole");
const Resonance = require("../src/models/Resonance");
const Mailbox = require("../src/models/Mailbox");
const ModerationLog = require("../src/models/ModerationLog");
const { formatDateOnly } = require("../src/utils/date");

let mongod;
let app;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());
  app = createApp();
});

after(async () => {
  await disconnectDatabase();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    Treehole.deleteMany({}),
    Resonance.deleteMany({}),
    Mailbox.deleteMany({}),
    ModerationLog.deleteMany({}),
  ]);
});

async function newSession() {
  const agent = request.agent(app);
  const res = await agent.get("/api/session").expect(200);
  return { agent, id: res.body.data.anonymousId };
}

async function createPublic(agent, overrides = {}) {
  return agent
    .post("/api/treeholes")
    .send({
      content: "期末机考和 C++ 实验挤在一起，真的有点喘不过气。",
      emotion: "negative",
      intensity: 8,
      isPublic: true,
      sceneTag: "cpp_lab",
      ...overrides,
    })
    .expect(201);
}

test("健康检查与前端 analyze 契约", async () => {
  const health = await request(app).get("/api/health").expect(200);
  assert.equal(health.body.data.db, "connected");

  const analyze = await request(app)
    .post("/api/analyze")
    .send({ text: "明天 C++ 实验，好焦虑，感觉复习不完" })
    .expect(200);

  assert.equal(analyze.body.ok, true);
  assert.equal(analyze.body.meta.mode, "local");
  assert.equal(analyze.body.data.polarity, "negative");
  assert.ok(Array.isArray(analyze.body.data.emotions));
  assert.equal(typeof analyze.body.data.risk.level, "number");
});

test("匿名会话：Cookie 保持同一个 UUID，轮换后得到新身份", async () => {
  const { agent, id } = await newSession();
  assert.match(id, /^[0-9a-f-]{36}$/i);

  const again = await agent.get("/api/session").expect(200);
  assert.equal(again.body.data.anonymousId, id);

  const rotated = await agent.post("/api/session").expect(201);
  assert.notEqual(rotated.body.data.anonymousId, id);
  const afterRotate = await agent.get("/api/session").expect(200);
  assert.equal(afterRotate.body.data.anonymousId, rotated.body.data.anonymousId);
});

test("私密树洞：只本人可见，返回本地 AI 安抚，不进入公开池", async () => {
  const { agent, id } = await newSession();
  const res = await agent
    .post("/api/treeholes")
    .send({
      content: "C++ 实验一直报错，我怀疑只有我这么笨。",
      emotion: "negative",
      intensity: 9,
      isPublic: false,
      sceneTag: "cpp_lab",
    })
    .expect(201);

  assert.equal(res.body.data.visibility, "private");
  assert.equal(res.body.data.isMine, true);
  assert.ok(res.body.data.comfort.text.length > 20);
  assert.equal(res.body.data.comfort.provider, "local");
  assert.equal(JSON.stringify(res.body).includes(id), false);

  const publicList = await request(app).get("/api/treeholes").expect(200);
  assert.equal(publicList.body.data.length, 0);

  const mine = await agent.get("/api/treeholes/mine").expect(200);
  assert.equal(mine.body.data.length, 1);
  assert.ok(mine.body.data[0].comfort);

  const other = await newSession();
  await other.agent.get(`/api/treeholes/${res.body.data.id}`).expect(404);
});

test("公开树洞：分页时序流，陌生人只能看到公开内容", async () => {
  const a = await newSession();
  const created = await createPublic(a.agent);

  assert.equal(created.body.data.visibility, "public");
  assert.equal(created.body.data.comfort, undefined);

  const b = await newSession();
  const list = await b.agent.get("/api/treeholes?page=1&limit=10").expect(200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].isMine, false);
  assert.equal(list.body.data[0].resonated, false);
  assert.equal(list.body.meta.ranking, "none");
  assert.equal(list.body.meta.comments, "disabled");
  assert.equal(JSON.stringify(list.body).includes(a.id), false);
});

test("共鸣是唯一互动：可切换、不可给自己点、没有评论区", async () => {
  const a = await newSession();
  const created = await createPublic(a.agent);
  const b = await newSession();
  const id = created.body.data.id;

  const first = await b.agent.post(`/api/treeholes/${id}/resonate`).expect(200);
  assert.equal(first.body.data.resonated, true);
  assert.equal(first.body.data.resonanceCount, 1);

  const second = await b.agent.post(`/api/treeholes/${id}/resonate`).expect(200);
  assert.equal(second.body.data.resonated, false);
  assert.equal(second.body.data.resonanceCount, 0);

  const self = await a.agent.post(`/api/treeholes/${id}/resonate`).expect(400);
  assert.equal(self.body.error.code, "CANNOT_RESONATE_SELF");

  await b.agent.post(`/api/treeholes/${id}/comments`).send({ content: "hi" }).expect(404);
});

test("时间胶囊：未来公开的树洞不出现在广场，但本人可见", async () => {
  const a = await newSession();
  const publishAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const created = await createPublic(a.agent, { publishAt });
  assert.equal(created.body.data.visibility, "scheduled");

  const publicList = await request(app).get("/api/treeholes").expect(200);
  assert.equal(publicList.body.data.length, 0);

  const mine = await a.agent.get("/api/treeholes/mine").expect(200);
  assert.equal(mine.body.data[0].visibility, "scheduled");

  const b = await newSession();
  await b.agent.get(`/api/treeholes/${created.body.data.id}`).expect(404);
  await a.agent.get(`/api/treeholes/${created.body.data.id}`).expect(200);
});

test("删除树洞：只有发布者能删除，关联共鸣一起清理", async () => {
  const a = await newSession();
  const b = await newSession();
  const created = await createPublic(a.agent);
  const id = created.body.data.id;

  await b.agent.post(`/api/treeholes/${id}/resonate`).expect(200);
  await b.agent.delete(`/api/treeholes/${id}`).expect(404);
  await a.agent.delete(`/api/treeholes/${id}`).expect(200);

  await a.agent.get(`/api/treeholes/${id}`).expect(404);
  assert.equal(await Resonance.countDocuments({}), 0);
});

test("风控：危机表达被拦截且不落库，同时返回求助信息", async () => {
  const { agent } = await newSession();
  const res = await agent
    .post("/api/treeholes")
    .send({
      content: "我不想活了，真的想消失",
      emotion: "negative",
      intensity: 10,
      isPublic: false,
    })
    .expect(422);

  assert.equal(res.body.error.code, "CRISIS_SUPPORT");
  assert.ok(res.body.error.details.support.hotlines.length >= 3);
  assert.equal(await Treehole.countDocuments({}), 0);
  assert.equal(await ModerationLog.countDocuments({ scope: "private" }), 1);
});

test("风控：公开内容含具体身份信息时要求重写", async () => {
  const { agent } = await newSession();
  const res = await agent
    .post("/api/treeholes")
    .send({
      content: "曝光一下，张三，学号 202312345678，手机 13800138000",
      emotion: "negative",
      intensity: 7,
      isPublic: true,
    })
    .expect(422);

  assert.equal(res.body.error.code, "CONTENT_NEEDS_REWRITE");
  assert.equal(await Treehole.countDocuments({}), 0);
});

test("匿名信箱：发送、未读、阅读、回复、线程与删除", async () => {
  const a = await newSession();
  const b = await newSession();

  const sent = await a.agent
    .post("/api/mailbox")
    .send({ toId: b.id, content: "最近还好吗？看到你也在熬机考。", isAnonymous: true })
    .expect(201);

  assert.equal(sent.body.data.direction, "sent");
  const threadId = sent.body.data.threadId;

  const unread = await b.agent.get("/api/mailbox/unread-count").expect(200);
  assert.equal(unread.body.data.unreadCount, 1);

  const inbox = await b.agent.get("/api/mailbox/inbox").expect(200);
  assert.equal(inbox.body.data.length, 1);
  assert.equal(inbox.body.data[0].isUnread, true);
  assert.equal(inbox.body.data[0].counterpart.label, "匿名同学");

  const opened = await b.agent.get(`/api/mailbox/${sent.body.data.id}`).expect(200);
  assert.equal(opened.body.data.direction, "inbox");
  assert.ok(opened.body.data.readAt);

  const reply = await b.agent
    .post("/api/mailbox/reply")
    .send({ replyToId: sent.body.data.id, content: "还好，谢谢你也在。今晚早点睡。" })
    .expect(201);
  assert.equal(reply.body.data.threadId, threadId);

  const aInbox = await a.agent.get("/api/mailbox/inbox").expect(200);
  assert.equal(aInbox.body.data.length, 1);
  assert.match(aInbox.body.data[0].content, /今晚早点睡/);

  const thread = await b.agent.get(`/api/mailbox/threads/${threadId}`).expect(200);
  assert.equal(thread.body.data.messages.length, 2);

  await b.agent.delete(`/api/mailbox/${sent.body.data.id}`).expect(200);
  const bInboxAfter = await b.agent.get("/api/mailbox/inbox").expect(200);
  assert.equal(bInboxAfter.body.data.length, 0);
});

test("信箱边界：不能发给自己，也不能交换联系方式", async () => {
  const a = await newSession();
  const b = await newSession();

  const self = await a.agent
    .post("/api/mailbox")
    .send({ toId: a.id, content: "写给自己的信", isAnonymous: true })
    .expect(400);
  assert.equal(self.body.error.code, "MAIL_TO_SELF");

  const contact = await a.agent
    .post("/api/mailbox")
    .send({ toId: b.id, content: "加我微信 abc12345", isAnonymous: false })
    .expect(422);
  assert.equal(contact.body.error.code, "MAILBOX_BOUNDARY");

  assert.equal(await Mailbox.countDocuments({}), 0);
});

test("统计：每日/每周/实时只统计已公开树洞", async () => {
  const a = await newSession();
  await createPublic(a.agent, {
    content: "复习不完，真的很焦虑。",
    emotion: "negative",
    intensity: 8,
  });
  await createPublic(a.agent, {
    content: "拿到 offer 了，今天特别开心！",
    emotion: "positive",
    intensity: 4,
  });
  await a.agent
    .post("/api/treeholes")
    .send({
      content: "这是一条只有我能看见的私密记录。",
      emotion: "negative",
      intensity: 10,
      isPublic: false,
      sceneTag: "sleep",
    })
    .expect(201);

  const today = formatDateOnly(new Date());
  const daily = await request(app).get(`/api/stats/daily?date=${today}`).expect(200);
  assert.equal(daily.body.data.total, 2);
  assert.equal(daily.body.data.distribution.negative, 1);
  assert.equal(daily.body.data.distribution.positive, 1);
  assert.equal(daily.body.data.distribution.neutral, 0);
  assert.equal(daily.body.data.hourly.length, 24);

  const weekly = await request(app).get(`/api/stats/weekly?start=${today}`).expect(200);
  assert.equal(weekly.body.data.total, 2);
  assert.equal(weekly.body.data.days.length, 7);

  const realtime = await request(app).get("/api/stats/realtime?limit=1").expect(200);
  assert.equal(realtime.body.data.total, 2);
  assert.equal(realtime.body.data.stars.length, 1);
  assert.equal(JSON.stringify(realtime.body).includes(a.id), false);

  const selfCheck = await a.agent.get("/api/stats/self-check?days=30").expect(200);
  assert.equal(selfCheck.body.data.total, 1);
  assert.equal(selfCheck.body.data.topTags[0].tag, "sleep");
  assert.match(selfCheck.body.data.summary, /失眠/);

  const b = await newSession();
  const bSelfCheck = await b.agent.get("/api/stats/self-check?days=30").expect(200);
  assert.equal(bSelfCheck.body.data.total, 0);

  await request(app).get("/api/stats/daily?date=2026-02-31").expect(400);
});

test("元信息与支持资源可被前端直接读取", async () => {
  const meta = await request(app).get("/api/meta").expect(200);
  assert.equal(meta.body.data.features.publicComments, false);
  assert.equal(meta.body.data.features.heatRanking, false);
  assert.ok(meta.body.data.sceneTags.some((tag) => tag.value === "cpp_lab"));

  const support = await request(app).get("/api/support/resources").expect(200);
  assert.ok(support.body.data.hotlines.some((item) => item.phone === "12356"));
});

test("参数错误统一为 ok:false + 稳定错误码", async () => {
  const res = await request(app)
    .post("/api/treeholes")
    .send({ content: "", emotion: "nope", intensity: 99 })
    .expect(400);

  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.ok(Array.isArray(res.body.error.details));
});

test("根路径托管现有前端，未知 API 返回 JSON 404", async () => {
  const page = await request(app).get("/").expect(200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.text, /星海|星语心声/);

  const missing = await request(app).get("/api/not-exist").expect(404);
  assert.equal(missing.body.ok, false);
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND");
  assert.ok(missing.body.requestId);
});
