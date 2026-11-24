# 星语心声 · 前端交接单

> 给前端同学：后端核心接口已经就绪，单文件页面也已接入天空、树洞、匿名信箱、统计四个视图。这份文档保留为任务拆分、字段契约和验收清单；如果继续迭代 UI，以这里的接口为准。
>
> 更完整的接口说明、字段含义、风控边界见 [README.md](../README.md)。  
> 后端启动：`npm install && cp .env.example .env && npm run dev`，默认 <http://127.0.0.1:3000>。

---

## 0. 先对齐一句话

这是**东南大学同校情绪共鸣空间**，不是树洞吐槽墙、不是表白墙、不是心理咨询。

前端所有页面都要守住三个产品规则：

1. **私密内容只给本人看**，公开内容才进入天空/统计。
2. **公开池没有评论区**，只有「我也有同感」一个轻互动。
3. **不做热度榜**，公开池永远按时序展示；不按共鸣数、点赞数排序。

---

## 1. 联调前先跑通

### 1.1 环境要求

| 依赖 | 要求 |
| --- | --- |
| Node.js | **18.18+**（已验证 18.20.8；推荐 20/22 LTS） |
| MongoDB | 本地 MongoDB 6/7，或 Docker |
| 端口 | 默认 `3000`，可改 `PORT` |
| 网络 | 首次 `npm ci` 需要访问 npm registry |

这是 CommonJS 项目，**没有前端构建步骤**，启动后直接访问后端托管的页面。

### 1.2 方式 A：本机 MongoDB

```bash
npm ci
cp .env.example .env
# 修改 .env 里的 MONGODB_URI 和 AUDIT_HMAC_SECRET
npm run dev
```

Windows PowerShell：

```powershell
npm ci
Copy-Item .env.example .env
notepad .env
npm run dev
```

验证：

```bash
curl http://127.0.0.1:3000/api/health
# PowerShell: Invoke-RestMethod http://127.0.0.1:3000/api/health
```

`data.db` 应为 `connected`。

### 1.3 方式 B：Docker Compose

适合不想安装 MongoDB 的同学。先准备 `.env` 里的强随机 `AUDIT_HMAC_SECRET`：

```powershell
# PowerShell
$env:AUDIT_HMAC_SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
docker compose up --build
```

```bash
# macOS / Linux / Git Bash
export AUDIT_HMAC_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

页面：<http://127.0.0.1:3000>。

### 1.4 方式 C：连共享开发库（团队联调）

如果希望所有人的数据互通，不要各自开本地库，而是统一指向一个**开发专用** MongoDB：

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/xingyu_xinsheng_dev
```

- 使用独立的 `_dev` 数据库，不要连生产库。
- MongoDB Atlas 需要把成员出口 IP 加入白名单。
- 所有人启动后操作的是同一份开发数据，适合同步前端联调。
- 不要把这个开发库的 URI 提交到仓库。

### 1.5 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB 没启动；用 Docker Compose 或启动本地 mongod |
| `EADDRINUSE :3000` | 端口被占用；改 `.env` 的 `PORT` 或结束旧进程 |
| `MongoServerError: Authentication failed` | `MONGODB_URI` 用户名/密码/库名不对 |
| `生产环境必须设置 AUDIT_HMAC_SECRET` | 生产模式必须有强随机密钥；本地开发可留空用 fallback，但建议统一设置 |
| 浏览器不保存匿名 Cookie | 生产模式 Cookie 默认 `Secure`；本地 HTTP 调试设 `COOKIE_SECURE=false` |
| `npm test` 首次很慢 | 测试会下载临时 MongoDB 二进制；只有跑测试需要，应用启动不需要 |
| 前端独立端口请求被 CORS 拦截 | 把前端地址加入 `.env` 的 `CORS_ORIGINS`，跨域用 `X-Anonymous-Id` |
| 其他人打不开你的 `localhost:3000` | `localhost` 只在本机；共享请部署或用 tunnel，见下一节 |

### 1.6 让其他人访问你的本机（临时演示）

```bash
# 任选一种 tunnel，不要直接把 3000 暴露到公网
npx localtunnel --port 3000
# 或
cloudflared tunnel --url http://127.0.0.1:3000
```

拿到公网 URL 后：

- 把 URL 加入 `CORS_ORIGINS`（如果前端独立部署）。
- 临时演示可设 `COOKIE_SECURE=false`；正式 HTTPS 环境保持 `true`。
- 不要用真实学生数据做公网演示；演示完关闭 tunnel。


---

## 2. 匿名身份：只做一次

### 同源（推荐）

前端不用手动存 ID，浏览器会自动带 `HttpOnly` Cookie：

```js
// 页面初始化时可选：确认/创建匿名身份
const session = await fetch("/api/session").then((r) => r.json());
// session.data.anonymousId 只用于调试，不要展示、不要拼进 URL
```

### 跨域（Vite / 独立前端）

```js
const API = "http://127.0.0.1:3000";

async function ensureAnonymousId() {
  let id = localStorage.getItem("xy_anonymous_id");
  if (id) return id;

  const res = await fetch(`${API}/api/session`, { credentials: "include" });
  const payload = await res.json();
  id = payload.data.anonymousId;
  localStorage.setItem("xy_anonymous_id", id);
  return id;
}

async function api(path, options = {}) {
  const anonymousId = await ensureAnonymousId();
  return fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Anonymous-Id": anonymousId,
      ...(options.headers || {}),
    },
  });
}
```

**禁止**：把 `anonymousId` 放进 URL、页面文案、埋点、日志、分享链接。  
**禁止**：展示其他用户的 `anonymousId`；信箱里只使用接口返回的 `counterpart.label`。

---

## 3. 统一响应与错误处理

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

前端至少要处理：

| 状态 | 场景 | UI |
| --- | --- | --- |
| 400 | 参数错误 | 就地提示，不要清空已输入内容 |
| 404 | 内容不存在/无权查看 | 统一空状态，不提示“可能是别人的私密内容” |
| 422 `CRISIS_SUPPORT` | 危机表达 | 展示支持卡片，**不要**把内容加入天空 |
| 422 `CONTENT_NEEDS_REWRITE` | 公开内容含身份信息/挂人 | 提示“只写自己的感受”，保留草稿 |
| 422 `MAILBOX_BOUNDARY` | 信件含联系方式/攻击 | 就地提示，保留草稿 |
| 429 | 限流 | 提示“慢一点，稍后再试”，不要报服务器错误 |
| 500 | 服务异常 | 通用错误 + 重试按钮 |

危机卡片至少展示：

```js
error.details.support.hotlines
error.details.support.campus
```

---

## 4. 任务拆分（可直接建 issue）

### P0：匿名会话 + 发布闭环

#### T1. API 客户端与匿名身份

- 封装 `api()`：统一 base URL、Cookie、`X-Anonymous-Id`、JSON 解析、错误码。
- 启动时调用 `GET /api/session`。
- 处理 400 `INVALID_ANONYMOUS_ID`：清 localStorage 后重新建身份。
- **验收**：刷新页面后，`GET /api/treeholes/mine` 仍能拿到自己的树洞；换浏览器后是新的匿名身份。

#### T2. 发布树洞

- 字段：`content`、`isPublic`、`sceneTag`、`campusLocation`、`publishAt`；`emotion`、`intensity` 由前端在提交时静默调用 `/api/analyze` 得到，不展示给用户。
- 模式切换：
  - 私密：`isPublic: false`，仅本人可见；
  - 公开：`isPublic: true`，进入公开池，发布成功后回到天空视图。
- 场景标签从 `GET /api/meta` 的 `sceneTags` 渲染，不要写死。
- 不再让用户选择情绪或强度；分析结果只用于星点位置。
- 时间胶囊：公开时可选 `publishAt`；私密模式不显示定时入口。
- 字数：`content` 最大 500 字，当前页面已统一。
- **验收**：
  - 私密发布后出现 `comfort.text`，公开列表不出现；
  - 公开发布后出现在 `/api/treeholes`，并切回天空视图；
  - 定时发布后 `visibility === "scheduled"`，公开列表暂时不出现。

#### T3. 私密安抚与危机支持

- 私密发布成功后展示 `data.comfort.text`，并展示 `comfort.note`。
- `risk.level === 2` 时不要展示“已发布”，改为展示 `data.support`（analyze）或 `error.details.support`（treehole）。
- 不做“AI 分析报告”、不展示诊断结论、不把私密内容画进星空。
- **验收**：输入明确自伤表达时，页面只出现支持信息，不出现新树洞卡片。

### P0：公开共鸣

#### T4. 公开池

- `GET /api/treeholes?page=1&limit=20&sort=latest`
- 只展示服务端返回的数据，不在前端做“热度排序”。
- 每张卡片：内容、场景标签、时间、共鸣数；不展示个人情绪/强度分析。
- 不显示发布者匿名 ID。
- **验收**：没有评论入口；刷新后顺序稳定；分页正常。

#### T5. 「我也有同感」

- `POST /api/treeholes/:id/resonate`
- 按钮状态用返回的 `resonated` / `resonanceCount`。
- 自己的树洞按钮禁用，并提示“你已经在里面了”。
- **验收**：连续点击可切换；数字不会重复加；不能给自己点。

#### T6. 时间胶囊展示

- 我的列表显示 `visibility === "scheduled"` 和倒计时。
- 到点后自动变成公开；公开池排序按 `publishAt`。
- **验收**：定时内容不会提前出现在公开池；到点后出现在顶部。

### P1：匿名信箱

#### T7. 收件箱 / 发件箱

- `GET /api/mailbox/inbox?page=1&limit=20&unread=true`
- `GET /api/mailbox/sent?page=1&limit=20`
- `GET /api/mailbox/unread-count`
- 展示 `counterpart.label`，不要展示 `toId/fromId`。
- **验收**：未读数正确；已读后数字减少；分页正常。

#### T8. 写信 / 回复 / 删除

- `POST /api/mailbox`：`toId`、`content`、`isAnonymous`。
- 回复只从“收到的信”进入：
  - `POST /api/mailbox/reply` body `{ replyToId, content }`；
  - 或 `POST /api/mailbox/:id/reply` body `{ content }`。
- `DELETE /api/mailbox/:id` 只影响当前参与方视图。
- **验收**：
  - 不能给自己写信；
  - 含微信/手机号被 422 拦截且草稿保留；
  - 回复后原发信人能在收件箱看到；
  - 删除后当前用户收件箱不再出现。

#### T9. 匿名线程

- `GET /api/mailbox/threads/:threadId?page=1&limit=50`
- 只做消息列表，不做“加好友/关注/交换联系方式”。
- **验收**：双方各自能看到自己可见的消息；已读状态正确。

### P1：星空与统计

#### T10. 实时星空

- `GET /api/stats/realtime?limit=100`
- `stars[]` 映射为星点：`valence`、`arousal`、`emotion`、`sceneTagLabel`。
- 总量、分布、Top 标签展示。
- **验收**：私密树洞永远不出现；没有热度排序；空数据有空状态。

#### T11. 每日 / 每周

- `GET /api/stats/daily?date=YYYY-MM-DD`
- `GET /api/stats/weekly?start=YYYY-MM-DD`
- 图表使用返回的 `distribution`、`ratios`、`days`、`trend`、`topTags`。
- **验收**：时区为 `Asia/Shanghai`；周视图固定 7 天；未来日期返回空数据。

### P2：私密自检卡片

#### T12. 情绪自检

- `GET /api/stats/self-check?days=30`
- 展示 `summary`、`topTags`、`recent`、`disclaimer`。
- 不展示诊断结论，不做“抑郁风险评分”。
- **验收**：只包含当前匿名身份的私密记录；换身份后为空。

### P2：体验与联调

- 所有加载态、空状态、错误态、重试。
- 移动端键盘遮挡、长文本换行、500 字计数。
- 危机支持卡片可复制电话号码。
- 全局声明“不是心理咨询”，并固定支持入口。
- 端到端验收：发布 → 私密安抚 / 公开共鸣 → 信箱回复 → 星空统计。

---

## 5. 接口速查

### 会话 / 元信息

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/session` | 获取/创建匿名身份 |
| POST | `/api/session` | 轮换匿名身份 |
| DELETE | `/api/session` | 清除 Cookie |
| GET | `/api/meta` | 枚举、限制、功能开关 |
| GET | `/api/support/resources` | 危机支持资源 |
| GET | `/api/health` | 健康检查 |

### 树洞

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/treeholes` | 发布（私密/公开） |
| GET | `/api/treeholes` | 公开池，仅 `publishAt <= now` |
| GET | `/api/treeholes/mine` | 我的全部树洞 |
| GET | `/api/treeholes/:id` | 详情；私密仅本人可见 |
| DELETE | `/api/treeholes/:id` | 删除本人树洞 |
| POST | `/api/treeholes/:id/resonate` | 切换「我也有同感」 |

### 信箱

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/mailbox` | 发送 |
| GET | `/api/mailbox/inbox` | 收件箱 |
| GET | `/api/mailbox/sent` | 发件箱 |
| GET | `/api/mailbox/unread-count` | 未读数 |
| GET | `/api/mailbox/:id` | 单封详情，自动已读 |
| PATCH | `/api/mailbox/:id/read` | 标记已读 |
| POST | `/api/mailbox/reply` | 按 `replyToId` 回复 |
| POST | `/api/mailbox/:id/reply` | 按路径回复 |
| GET | `/api/mailbox/threads/:threadId` | 匿名线程 |
| DELETE | `/api/mailbox/:id` | 删除当前参与方视图 |

### 统计 / 分析

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/stats/daily?date=YYYY-MM-DD` | 每日分布 |
| GET | `/api/stats/weekly?start=YYYY-MM-DD` | 每周趋势 |
| GET | `/api/stats/realtime?limit=100` | 实时星空 |
| GET | `/api/stats/self-check?days=30` | 私密自检卡片 |
| POST | `/api/analyze` | 现有页面使用的即时情绪分析，不落库 |

---

## 6. 关键字段

### Treehole

```json
{
  "id": "...",
  "content": "...",
  "emotion": "negative",
  "emotionLabel": "消极",
  "intensity": 8,
  "isPublic": true,
  "visibility": "public",
  "sceneTag": "cpp_lab",
  "sceneTagLabel": "C++实验",
  "campusLocation": "jiulonghu",
  "campusLocationLabel": "九龙湖校区",
  "publishAt": "2026-11-22T12:00:00.000Z",
  "createdAt": "2026-11-22T12:00:00.000Z",
  "resonanceCount": 3,
  "resonated": false,
  "isMine": false
}
```

`visibility`：

- `private`：私密，仅本人；
- `scheduled`：已创建但未到公开时间；
- `public`：已公开。

### Mailbox

```json
{
  "id": "...",
  "content": "...",
  "isAnonymous": true,
  "direction": "inbox",
  "counterpart": { "label": "匿名同学" },
  "threadId": "...",
  "parentId": null,
  "readAt": null,
  "isUnread": true,
  "createdAt": "..."
}
```

### Analyze（现有页面）

```json
{
  "data": {
    "valence": -0.48,
    "arousal": 0.55,
    "dominant": "焦虑",
    "emotions": [{ "label": "焦虑", "score": 0.76 }],
    "polarity": "negative",
    "topics": ["学业"],
    "risk": { "level": 1, "signals": ["持续低落或求助信号"] },
    "summary": "像是焦虑，和学业有关。不需要马上变好。",
    "needs_support": true,
    "confidence": 0.55
  },
  "meta": { "mode": "local", "latency_ms": 0.8 }
}
```

`risk.level === 2` 时额外有 `data.support`。

---

## 7. 联调顺序（建议）

```text
Day 1  T1 + T2 + T3        API 客户端、发布、私密安抚
Day 2  T4 + T5 + T6        公开池、共鸣、时间胶囊
Day 3  T7 + T8 + T9        信箱闭环
Day 4  T10 + T11 + T12     星空与统计
Day 5  全链路验收 + 移动端 + 空/错/加载态
```

可以并行的方式：

- 同学 A：会话 + 发布 + 私密安抚
- 同学 B：公开池 + 共鸣 + 时间胶囊
- 同学 C：信箱
- 同学 D：星空/统计/自检卡片
- 一个人最后做公共组件和验收，避免各写一套请求层。

---

## 8. 前端验收清单

- [ ] 匿名 ID 不出现在任何可见文案、URL、埋点里
- [ ] 私密树洞不出现在公开池、实时星空、统计里
- [ ] 公开池没有评论入口
- [ ] 公开池没有按共鸣数/点赞数排序
- [ ] 自己的树洞不能点「我也有同感」
- [ ] 定时树洞到点前不进入公开池
- [ ] 危机表达只出现支持卡片，不出现新内容
- [ ] 公开内容含手机号/学号/挂人时被拦截且保留草稿
- [ ] 信箱不显示原始 `toId/fromId`
- [ ] 回复只能从收到的信进入
- [ ] 未读数、已读、删除状态正确
- [ ] 每日/每周统计时区正确
- [ ] 自检卡片不出现诊断结论
- [ ] 所有接口都有 loading / empty / error / retry
- [ ] 移动端 500 字输入不被键盘遮挡
- [ ] 页面固定展示“不是心理咨询”的支持入口

---

## 9. 可以直接发到群里的消息

```text
@前端同学 后端接口已经就绪，单文件页面已经接入天空、树洞、匿名信箱、统计四个视图，可以直接本地跑起来体验。

本地启动：
npm install
cp .env.example .env   # 改 MONGODB_URI 和 AUDIT_HMAC_SECRET
npm run dev
页面：http://127.0.0.1:3000

交接文档：
docs/FRONTEND-HANDOFF.md
完整接口：README.md

今天先对齐三件事：
1. 匿名身份统一走 /api/session（同源用 Cookie；跨域用 X-Anonymous-Id）；
2. 先做 P0：发布树洞（私密/公开）、私密安抚、公开池 + 我也有同感；
3. 公开池不要做评论区、不要做热度排序，私密内容不要进星空。

请每位同学认领 T1~T12 里的一个模块，今天下班前在文档里更新状态；接口字段有疑问直接发我，不要各自猜契约。
```

---

## 10. 需要产品/后端一起确认的开放问题

1. 私密安抚的 LLM 是否上线？如果上线，需要明确告知用户“私密内容会发送给第三方模型”。
2. 危机支持卡片放在哪些页面？建议：发布页、详情页、信箱、固定入口四处。
3. 时间胶囊到点后是否推送提醒？当前后端只保证“到点可查”，前端可以轮询。
4. 公开池是否需要举报入口？当前只有发布时风控，正式运营建议补人工审核。
5. 同频匿名房间、每周匿名摘选暂未开放；这两项容易把产品做成社交/流量产品，建议等审核人力确定后再做。
```
