# 星语心声 · 后端

面向东南大学在校生的同校情绪共鸣空间。后端提供两条彼此隔离的通道：

- **私密树洞**：仅本人可见，本地安全模板或可选 LLM 做“情绪承接”，不分析、不诊断、不建议。
- **寄向天空**：仅公开已发布内容，没有评论区，只有「我也有同感」这一个轻互动。

> 这不是心理咨询、不是社交平台、不是表白墙。  
> 本平台不做心理诊断；出现明确自伤/自杀表达时，内容不会被发布，并返回可立即使用的求助信息。

技术栈：**Node.js 18+ / Express 4 / MongoDB / Mongoose / JavaScript CommonJS**。

> 前端任务拆分与联调清单：[docs/FRONTEND-HANDOFF.md](docs/FRONTEND-HANDOFF.md)

---

## 1. 已实现

### 树洞

- 匿名发布，`content` 最大 500 字，`intensity` 1~10。
- 公开 / 私密严格隔离，私密内容不会进入公开列表、统计或星空数据。
- 东大场景标签：C++ 实验、期末机考、绩点/保研边缘、竞赛备赛、跨校区通勤、小组作业、宿舍关系、失眠等。
- 时间胶囊：`publishAt` 在未来时，仅本人可见；到点后自动进入公开时序流。
- 公开池只按**发布时间**排序，提供 `latest` / `oldest`，**没有热度榜、没有算法推荐、没有评论区**。时间胶囊到点后会作为“新公开”出现在流顶部，同时保留原始创建时间。
- 「我也有同感」按匿名 ID 去重，可切换；不能给自己的树洞点。
- 删除树洞会同步清理共鸣记录。

### 匿名信箱

- 给指定匿名 ID 写信，正文最大 300 字。
- 收件箱、发件箱、未读数、已读、回复、删除。
- 支持 `POST /api/mailbox/reply`（`replyToId + content`）和 `POST /api/mailbox/:id/reply` 两种回复写法。
- 只允许回复自己收到的信，形成“收信人回复 → 原发信人成为收信人”的轮流关系，避免单向连续轰炸。
- `isAnonymous: false` 时也只显示 6 位稳定化名，**不返回可被直接寻址的 `anonymousId`**。
- 信件内禁止交换手机号、微信、QQ、邮箱等联系方式，避免信箱变成社交入口。

### 情绪统计与可视化数据

- 每日情绪分布、24 小时分布、场景标签 Top 5。
- 每周 7 天趋势、总量、均值、主导情绪。
- 实时星空数据：公开树洞映射为 `valence` / `arousal` 点位。
- 私密「情绪自检卡片」：只汇总本人私密记录里的高频场景，不诊断、不下结论。
- 所有统计统一使用 `Asia/Shanghai` 时区。
- 统计口径是“创建时间 + 当前已公开”：定时树洞到点后才进入统计，但计入它被写下的那一天；这样不会把未来的心事提前算进今天的校园情绪。

### 匿名会话与工程能力

- UUID 匿名 ID，`HttpOnly` Cookie 优先，也支持 `X-Anonymous-Id` 请求头（localStorage 方案）。
- Zod 参数校验、统一错误码、请求 ID、Helmet、CORS 白名单、压缩、限流。
- 危机与公域边界风控；被拦截内容不落库，只记录不可逆哈希审计。
- Node 原生测试 + `mongodb-memory-server` 集成测试。

---

## 2. 目录

```text
.
├─ 52-完整体-大字(1).html       # 现有前端展示页（后端默认托管在 /）
├─ src
│  ├─ app.js                    # Express 应用装配
│  ├─ server.js                 # 启动 / 优雅退出
│  ├─ config                  # 环境变量、Mongo 连接
│  ├─ constants.js              # 情绪、场景标签、地点
│  ├─ controllers               # 会话、树洞、信箱、统计、分析
│  ├─ middleware                # 身份、限流、校验、CORS、错误处理
│  ├─ models                    # Treehole / Resonance / Mailbox / ModerationLog
│  ├─ routes                    # API 路由
│  ├─ serializers               # 对外数据形状（剥离 anonymousId）
│  ├─ services                  # 分析器、安抚、风控、审计、危机支持
│  ├─ utils                     # 时区、错误、异步包装、哈希
│  └─ validators                # Zod schemas
├─ tests                        # 单元 + HTTP 集成测试
├─ docs
│  └─ FRONTEND-HANDOFF.md       # 前端交接单 / 任务拆分 / 联调契约
├─ scripts
│  └─ dev-with-memory.js        # 小白一键启动用的临时内存数据库
├─ start-windows.bat            # Windows 双击启动
├─ start-mac.command            # macOS 双击启动
├─ FRONTEND-SETUP.md            # 前端小白使用说明书
├─ .env.example
├─ compose.yaml
└─ Dockerfile
```

---

## 3. 快速开始

> **完全没接触过后端？** 解压后直接双击 `start-windows.bat`（Windows）或 `start-mac.command`（macOS）。  
> 它会自动安装依赖，并用临时内存数据库启动，不需要安装 MongoDB。详细步骤见 [FRONTEND-SETUP.md](FRONTEND-SETUP.md)。

### 3.1 本地

要求：

- Node.js **18.18+**
- MongoDB **6/7**（本地、Docker 或 Atlas 均可）

```bash
npm ci
cp .env.example .env
```

编辑 `.env`，至少修改：

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/xingyu_xinsheng
# 生产必须换掉；本地也建议换
AUDIT_HMAC_SECRET=请替换为-openssl-rand-hex-32-生成的随机串
```

启动：

```bash
npm run dev
# 或 npm start
```

打开 <http://127.0.0.1:3000>，首屏点 **「直接进入星海」** 即可；也可以继续向下滚动看介绍，或点右上角「跳过介绍，直接进入」。

### 3.2 Docker Compose

```bash
# PowerShell: $env:AUDIT_HMAC_SECRET = "..."
# macOS/Linux: export AUDIT_HMAC_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

Mongo 数据保存在 `mongo_data` 卷，应用监听 `3000`。

### 3.3 测试

```bash
npm test
```

测试会启动一个临时 MongoDB（首次运行会下载二进制），不会碰本地数据库。

---

## 4. 匿名身份

服务端不收集姓名、学号、手机号。匿名 ID 就是随机 UUID，持有即可操作自己的树洞和信箱。

优先级：

1. 请求头 `X-Anonymous-Id: <uuid>`
2. `HttpOnly` Cookie `xy_anonymous_id`
3. 都没有则生成新 UUID

```http
GET /api/session
```

```json
{
  "ok": true,
  "data": {
    "anonymousId": "6f0f6b6e-4c35-4d2d-9d9e-1f0f4f6f8a11",
    "transport": "new",
    "cookieName": "xy_anonymous_id",
    "headerName": "X-Anonymous-Id"
  }
}
```

- 同源前端不需要手工存 ID，浏览器会自动带 Cookie。
- 跨域前端（如 Vite `localhost:5173`）可把 `anonymousId` 放 localStorage，并在每次请求带 `X-Anonymous-Id`。同时把前端地址加入 `CORS_ORIGINS`。
- `POST /api/session` 会轮换身份；`DELETE /api/session` 会清除 Cookie。
- **匿名 ID 是 bearer 凭证**。丢失后无法找回自己的树洞/信箱；泄露后他人可操作该身份。

---

## 5. API 约定

### 5.1 成功 / 失败

成功：

```json
{ "ok": true, "data": {}, "meta": {} }
```

失败：

```json
{
  "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "树洞内容不能为空", "details": [] },
  "requestId": "..."
}
```

常见错误码：

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 参数不符合 schema |
| 400 | `INVALID_ANONYMOUS_ID` | 请求头 UUID 非法 |
| 400 | `CANNOT_RESONATE_SELF` | 不能给自己的树洞点共鸣 |
| 401 | `UNAUTHORIZED` | 未识别匿名身份 |
| 404 | `TREEHOLE_NOT_FOUND` / `MAIL_NOT_FOUND` | 不存在，或无权查看 |
| 409 | `DUPLICATE_RESOURCE` | 唯一键冲突 |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体过大 |
| 422 | `CRISIS_SUPPORT` | 危机表达，返回支持资源 |
| 422 | `CONTENT_NEEDS_REWRITE` | 公开内容含身份信息/挂人/联系方式 |
| 422 | `MAILBOX_BOUNDARY` | 信件含联系方式或攻击 |
| 429 | `RATE_LIMITED` | 触发限流 |

`/api/analyze` 额外保持现有前端契约：`payload.data` + `payload.meta.mode`。

### 5.2 元信息

```http
GET /api/meta
GET /api/support/resources
GET /api/health
```

`/api/meta` 返回情绪枚举、场景标签、地点、长度限制、功能开关（如 `publicComments: false`），适合前端动态渲染。

---

## 6. 树洞 API

### 6.1 发布

```http
POST /api/treeholes
Content-Type: application/json
```

```json
{
  "content": "C++ 实验跑到凌晨两点，还是段错误。",
  "emotion": "negative",
  "intensity": 8,
  "isPublic": false,
  "sceneTag": "cpp_lab",
  "campusLocation": "jiulonghu"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `content` | 是 | 1~500 字 |
| `emotion` | 是 | `positive` / `negative` / `neutral` |
| `intensity` | 是 | 1~10 整数 |
| `isPublic` | 否 | 默认 `false`；`false` = 私密 AI 通道 |
| `mode` | 否 | `private` / `public`，传入后优先于 `isPublic` |
| `sceneTag` | 否 | 默认 `other`，枚举见 `/api/meta` |
| `campusLocation` | 否 | 默认 `unspecified`，只做氛围标记 |
| `publishAt` | 否 | 时间胶囊；ISO 8601 或 `YYYY-MM-DD`，仅公开时生效 |

响应（私密模式会带安抚文字）：

```json
{
  "ok": true,
  "data": {
    "id": "674f...",
    "content": "C++ 实验跑到凌晨两点，还是段错误。",
    "emotion": "negative",
    "emotionLabel": "消极",
    "intensity": 8,
    "isPublic": false,
    "visibility": "private",
    "sceneTag": "cpp_lab",
    "sceneTagLabel": "C++实验",
    "campusLocation": "jiulonghu",
    "campusLocationLabel": "九龙湖校区",
    "publishAt": "2026-11-22T12:00:00.000Z",
    "createdAt": "2026-11-22T12:00:00.000Z",
    "resonanceCount": 0,
    "resonated": false,
    "isMine": true,
    "comfort": {
      "text": "我听见了。被“C++实验”反复碰到的时候……",
      "provider": "local",
      "createdAt": "2026-11-22T12:00:01.000Z",
      "note": "这是一段自动生成的陪伴文字，不是心理咨询。"
    }
  },
  "meta": { "visibility": "private", "comfortProvider": "local" }
}
```

- 私密模式不会调用 LLM 时，使用本地安全模板，接口始终可用。
- 公开模式不会生成 AI 解读，符合“AI 不干预公开池”的产品原则。
- 若内容触发危机级别，返回 `422 CRISIS_SUPPORT`，**不会写入数据库**。

### 6.2 公开列表

```http
GET /api/treeholes?page=1&limit=20&emotion=negative&sceneTag=cpp_lab&sort=latest
```

- 只返回 `isPublic:true`、`status:active`、`publishAt <= now` 的树洞。
- `sort` 仅 `latest` / `oldest`，按 `publishAt` 排序，没有热度排序。
- `meta.ranking = "none"`、`meta.comments = "disabled"` 是产品边界的一部分。
- 返回项不含 `anonymousId`。

### 6.3 我的树洞

```http
GET /api/treeholes/mine?page=1&limit=20
```

包含私密、定时未公开、公开的全部本人树洞；私密项带 `comfort`。

### 6.4 详情 / 删除

```http
GET /api/treeholes/:id
DELETE /api/treeholes/:id
```

- 非本人访问私密或定时未公开内容，统一返回 404，避免泄漏“这里有一条内容”。
- 删除仅发布者可用；删除时级联清理共鸣。

### 6.5 我也有同感

```http
POST /api/treeholes/:id/resonate
```

切换式接口：

```json
{
  "ok": true,
  "data": { "treeholeId": "674f...", "resonated": true, "resonanceCount": 12 }
}
```

- 同一个人对同一条只能计一次。
- 不能给自己的树洞点。
- **没有评论接口**；`POST /api/treeholes/:id/comments` 会返回 404。

---

## 7. 匿名信箱 API

### 7.1 发送

```http
POST /api/mailbox
Content-Type: application/json
```

```json
{
  "toId": "6f0f6b6e-4c35-4d2d-9d9e-1f0f4f6f8a11",
  "content": "最近还好吗？看到你也在熬机考。",
  "isAnonymous": true
}
```

- `toId` 为接收者匿名 UUID。
- 正文 1~300 字。
- 不能发给自己。
- 含手机号/微信/QQ/邮箱、“加我”等内容会返回 `422 MAILBOX_BOUNDARY`。
- 接收者回复时，系统按原线程把信发给原发送者。

### 7.2 收件箱 / 发件箱 / 未读数

```http
GET /api/mailbox/inbox?page=1&limit=20&unread=true
GET /api/mailbox/sent?page=1&limit=20
GET /api/mailbox/unread-count
```

### 7.3 阅读 / 回复 / 删除

```http
GET /api/mailbox/:id
PATCH /api/mailbox/:id/read
POST /api/mailbox/reply          # { "replyToId": "...", "content": "..." }
POST /api/mailbox/:id/reply      # { "content": "..." }
DELETE /api/mailbox/:id
```

- 只有收信人能回复某封信；原发送人收到回复后成为该回复的收信人，可继续回复。
- 删除是“按参与方软删除”：收件人删除后自己的收件箱不再出现；双方都删除后文档会被物理删除。
- 返回中只有稳定化名，没有原始 `anonymousId`。

### 7.4 匿名线程

```http
GET /api/mailbox/threads/:threadId?page=1&limit=50
```

返回该线程中当前用户可见的消息；读取后自动把收件消息标为已读。

---

## 8. 情绪统计 API

### 8.1 每日

```http
GET /api/stats/daily?date=2026-11-22
```

```json
{
  "ok": true,
  "data": {
    "date": "2026-11-22",
    "total": 12,
    "distribution": { "positive": 3, "negative": 7, "neutral": 2 },
    "ratios": { "positive": 0.25, "negative": 0.5833, "neutral": 0.1667 },
    "avgIntensity": 6.4,
    "valence": -0.22,
    "arousal": 0.64,
    "dominant": "negative",
    "hourly": [{ "hour": "00", "total": 1, "distribution": { "positive": 0, "negative": 1, "neutral": 0 } }],
    "topTags": [{ "tag": "cpp_lab", "label": "C++实验", "count": 5 }],
    "timezone": "Asia/Shanghai",
    "range": { "from": "...", "to": "..." },
    "generatedAt": "..."
  }
}
```

### 8.2 每周

```http
GET /api/stats/weekly?start=2026-11-22
```

`start` 可以是一周内任意一天，服务端会归一到该周周一；返回 7 天 `days` 与 `trend`。

### 8.3 实时星空

```http
GET /api/stats/realtime?limit=100
```

返回公开池总量、分布、Top 标签，以及最多 200 个星点：

```json
{
  "stars": [
    {
      "id": "674f...",
      "content": "公开内容",
      "emotion": "negative",
      "intensity": 8,
      "sceneTag": "cpp_lab",
      "sceneTagLabel": "C++实验",
      "valence": -0.65,
      "arousal": 0.8,
      "publishAt": "...",
      "createdAt": "..."
    }
  ]
}
```

- 只统计公开、已到公开时间、未隐藏的树洞。
- 私密树洞永远不出现在这里。
- 无热度排序；`stars` 只是最新时序。

### 8.4 私密情绪自检卡片

```http
GET /api/stats/self-check?days=30
```

只聚合当前匿名身份最近 30 天的**私密**记录：

```json
{
  "ok": true,
  "data": {
    "window": { "days": 30, "from": "...", "to": "..." },
    "total": 4,
    "distribution": { "positive": 0, "negative": 3, "neutral": 1 },
    "topTags": [{ "tag": "cpp_lab", "label": "C++实验", "count": 3 }],
    "summary": "最近30天，你多次提到「C++实验」。",
    "recent": [{ "emotion": "negative", "intensity": 8, "sceneTag": "cpp_lab", "sceneTagLabel": "C++实验", "createdAt": "..." }],
    "disclaimer": "这不是心理诊断，只是你自己留下的记录。"
  }
}
```

不返回正文，不做诊断，不推断疾病。

---

## 9. 情绪分析接口

```http
POST /api/analyze
Content-Type: application/json

{ "text": "明天 C++ 实验和期末机考，真的好焦虑，复习不完了" }
```

返回：

```json
{
  "ok": true,
  "data": {
    "valence": -0.48,
    "arousal": 0.55,
    "dominant": "焦虑",
    "emotions": [{ "label": "焦虑", "score": 0.76 }],
    "polarity": "negative",
    "topics": ["学业"],
    "keywords": ["期末", "机考", "实验"],
    "risk": { "level": 0, "signals": [], "needs_support": false },
    "summary": "像是焦虑，和学业有关。不需要马上变好。",
    "needs_support": false,
    "confidence": 0.55
  },
  "meta": { "mode": "local", "latency_ms": 0.8, "version": "1.0.0", "persisted": false }
}
```

- 该接口**不写数据库**，只是前端“点亮一颗星”前的即时分析。
- `risk.level`：`0` 正常、`1` 需关注、`2` 危机。
- level 2 额外返回 `data.support`，前端应展示求助卡片且不要把该句放入星空。
- 这是规则分析器，不是医疗模型。它的价值是“稳定、可解释、永不因外部服务挂掉”，不是诊断。

---

## 10. 风控与隐私设计

### 10.1 三道人话边界

1. **危机优先**：明确自伤/自杀表达先于一切内容判断。返回 `422 CRISIS_SUPPORT`，不存正文，并给出 12356、江苏省大学生心理热线、东大 24 小时热线。
2. **公域去指向**：公开树洞禁止手机号、学号、邮箱、社交账号、“挂人/曝光/人肉”、指向具体个人的攻击与指控。触发返回 `422 CONTENT_NEEDS_REWRITE`，提示“只写自己的感受”。
3. **信箱去社交**：信件禁止交换联系方式；只允许收信人回复，避免陌生人单向轰炸。

### 10.2 匿名不等于无日志

- 被拦截内容**不保存正文**。
- 只写 `ModerationLog`：`scope`、`reasonCodes`、正文 SHA-256、匿名 ID HMAC、IP HMAC、路由、UA、时间。
- 默认保留 180 天，通过 TTL 索引自动过期。
- 生产环境必须配置 `AUDIT_HMAC_SECRET`，否则启动失败。

### 10.3 AI 与私密内容

- 默认使用**本地模板**，私密正文不出服务器。
- 只有显式配置 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 时，私密树洞正文才会发送给该 OpenAI 兼容服务。
- LLM 输出经过安全词护栏；超时、报错或触发护栏时自动回退本地模板。
- 若学校对数据出境/第三方处理有要求，应优先接校内或本地模型，并在产品上明确告知用户。**不要默认把“私密”内容发给第三方。**

### 10.4 不做什么

- 不做心理诊断、不输出疾病标签。
- 不做自由评论区、不做热度榜、不做点赞排行榜。
- 不做匿名 ID 的公开交换、不做撮合交友。
- 不把匿名 ID 返回给其他用户。
- 不把私密内容用于公开统计。

### 10.5 商业化边界

本仓库不包含付费、广告或会员模块。若后续接入商业化，必须遵守一条硬边界：

- **独立入口、独立数据表、独立权限**，不读取树洞/信箱正文，不基于情绪内容做精准营销。
- 不把“树洞流量”直接导给广告主；不做“付费置顶”“情绪热搜”“付费解锁共鸣”。
- 变现只发生在核心共鸣区之外，例如校园周边、线下活动、独立服务入口。

否则产品会迅速退化成“用情绪换流量”的普通社交平台，失去最核心的信任。

---

## 11. 前端接入

单文件展示页已经接入天空、树洞、匿名信箱、统计四个视图，并直接调用后端接口。树洞发布时，前端会先静默调用 `/api/analyze` 得到 `emotion` / `intensity`，只用于决定星点落点，不向用户展示分析结果。你要重写前端时，核心接口如下：

```js
POST /api/analyze
{ text }
```

树洞、信箱、统计的调用示例：

```js
// 1) 同源：Cookie 自动携带
const created = await fetch("/api/treeholes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content,
    emotion: "negative",
    intensity: 8,
    isPublic: true,
    sceneTag: "cpp_lab",
  }),
}).then((r) => r.json());

// 2) 跨域：从 /api/session 拿 anonymousId，存 localStorage
const session = await fetch("http://localhost:3000/api/session", {
  credentials: "include",
}).then((r) => r.json());
localStorage.setItem("xy_anonymous_id", session.data.anonymousId);

await fetch("http://localhost:3000/api/treeholes", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Anonymous-Id": localStorage.getItem("xy_anonymous_id"),
  },
  body: JSON.stringify({ content, emotion: "negative", intensity: 8, isPublic: true }),
});
```

前端需要处理的几个产品规则：

- 私密模式展示 `comfort`，不要展示 `isPublic` 开关之外的“AI 分析报告”。
- 公开模式不要做评论区，只做「我也有同感」按钮；列表不要按 `resonanceCount` 排序。
- `risk.level === 2` 时展示 `data.support`，不要把这句话加入星空。
- 定时树洞在“我的”里显示倒计时，公开池只展示已到点的内容。
- 统计接口全部是公开聚合，不包含私密内容。

---

## 12. 生产部署清单

- [ ] `NODE_ENV=production`
- [ ] 强随机 `AUDIT_HMAC_SECRET`（`openssl rand -hex 32`）
- [ ] HTTPS；生产 Cookie 带 `Secure`（`COOKIE_SECURE` 默认跟随 `NODE_ENV=production`），纯 HTTP 下浏览器不会保存
- [ ] `MONGODB_URI` 使用副本集/Atlas；确认索引已创建
- [ ] 生产 Mongo 开启静态加密与访问审计；私密树洞正文仍是敏感数据
- [ ] `CORS_ORIGINS` 只列真实前端域名；不要用 `*`
- [ ] 反向代理设置 `TRUST_PROXY=1`，否则限流和 `req.ip` 会失真
- [ ] 单实例限流是内存版；多实例请替换为 Redis store
- [ ] 每周检查 `ModerationLog` 体量与 TTL 索引
- [ ] 对公开池做人工抽查；规则不能替代审核
- [ ] 若启用 LLM，完成第三方数据处理告知与校内合规确认
- [ ] 当前单文件前端为演示方便关闭了 CSP；正式前端应拆分为静态资源并开启 CSP/nonce
- [ ] 明确“非心理咨询”声明，并把支持资源放在固定入口
- [ ] 备份策略与删除策略一致：删除树洞会硬删正文与共鸣，审计只留哈希

---

## 13. 已知边界 / 下一阶段

当前版本优先把**核心闭环**做稳：树洞、私密 AI、公开共鸣、信箱、统计、风控。以下能力暂不默认开放，避免在审核人力不足时把产品做成社交平台：

- 同频匿名房间：需要额外的双向同意、超时销毁、消息级风控和实时通道。
- 每周匿名摘选：容易滑向“编辑推荐/热度榜”，需要先定义“无流量机制”的选文规则。
- 管理后台：当前合规日志可直接查 MongoDB；正式运营应补只读后台与权限审计。
- 举报与申诉：公开池需要人工复核入口，建议与学校心理中心/学工线协同设计。

---

## 14. 危机支持

平台不是心理咨询或医疗机构。若你或身边的人正处于危险中：

- 全国统一心理援助热线：**12356**（24 小时）
- 江苏省大学生心理热线：**025-58255200**（24 小时）
- 东南大学校内 24 小时热线：**15251760520**
- 九龙湖校区：**025-52090277**（大学生活动中心 4 楼）
- 四牌楼校区：**025-83793744**（兰园文昌 7 舍一楼）
- 丁家桥校区：**025-83272273**（蔡翘楼 240 室）
- 紧急危险：**110 / 120**

学校联系方式可通过环境变量覆盖：

```dotenv
CAMPUS_COUNSELING_NAME=东南大学心理健康教育中心
CAMPUS_COUNSELING_PHONE=025-52090277
CAMPUS_24H_HOTLINE=15251760520
CAMPUS_COUNSELING_NOTE=...
```

> 以上信息以学校最新通知为准。参考：[东南大学心理健康教育中心](https://cis.seu.edu.cn/54373/list.htm)、[南京 12356 心理援助热线](http://wjw.nanjing.gov.cn/gzdt/202505/t20250523_5568416.html)。

---

## 15. 许可

校内课程/竞赛项目使用；上线前请完成学校的数据安全、内容审核与心理支持流程评估。
