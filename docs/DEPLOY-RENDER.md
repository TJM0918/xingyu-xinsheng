# 部署到 Render + MongoDB Atlas（免费层）

目标：拿到一个后端也活着的 HTTPS 地址，组员和老师点开就能用完整功能（树洞、信箱、统计、情绪分析）。

前置条件：

- 仓库已在 GitHub：`TJM0918/xingyu-xinsheng`（`render.yaml` 就在仓库根目录，Blueprint 会自动读）
- 一个 Render 账号（用 GitHub 登录最快）
- 一个 MongoDB Atlas 账号（免费 M0）

预计耗时 15 分钟，费用 0 元。

---

## 第 1 步：在 Atlas 建一个免费数据库

1. 打开 <https://cloud.mongodb.com>，注册/登录后点 **Create**（或 Build a Database）。
2. 选 **M0 Free**（512 MB，永久免费）。
3. **Provider / Region 选 AWS + Singapore (ap-southeast-1)**——和 Render 的新加坡节点同区，延迟最低。改区不用改代码。
4. 集群建好后，左侧 **Database Access** → Add New Database User：
   - 认证方式选 Password
   - 用户名密码自己定，**密码别用特殊字符 `@ : / ?`**，否则连接串要转义
   - Role 选 `Read and write to any database`
5. 左侧 **Network Access** → Add IP Address → 选 **Allow access from anywhere `0.0.0.0/0`**。
   - 必须这么选：Render 免费实例的出网 IP 是动态的，写死 IP 一定会断。
6. 回到集群页 → **Connect** → Drivers → 复制连接串，形如：

   ```text
   mongodb+srv://<用户名>:<密码>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

7. **手动补上库名**，改成：

   ```text
   mongodb+srv://<用户名>:<密码>@cluster0.xxxxx.mongodb.net/xingyu_xinsheng?retryWrites=true&w=majority
   ```

   `?` 前面那段 `/xingyu_xinsheng` 必须加，否则数据会写进 `test` 库。

---

## 第 2 步：在 Render 用 Blueprint 部署

1. 打开 <https://dashboard.render.com>，用 GitHub 登录。
2. 右上 **New** → **Blueprint** → 授权并选中 `TJM0918/xingyu-xinsheng` 仓库。
3. Render 读到 `render.yaml`，会让你填 **MONGODB_URI**——把第 1 步的完整连接串粘进去。
4. 点 **Apply / Create**。首次构建约 3–6 分钟（它用的是仓库里的 `Dockerfile`）。
5. 构建完成后，服务页面上会给出地址：

   ```text
   https://xingyu-xinsheng.onrender.com
   ```

   名字被你占用时会有后缀，以控制台显示的为准。

`render.yaml` 已经替你配好了这些环境变量：

| 变量 | 值 | 为什么 |
|---|---|---|
| `NODE_ENV` | `production` | 关闭调试输出，开生产校验 |
| `AUDIT_HMAC_SECRET` | Render 随机生成 | 生产环境缺它或太短会直接启动失败 |
| `TRUST_PROXY` | `1` | 前面有一层代理，不设会导致 IP 和限流失真 |
| `COOKIE_SECURE` | `true` | 匿名会话 Cookie 只在 HTTPS 下发送 |
| `CORS_ORIGINS` | 空 | 前端由同一个服务托管，只允许同源 |
| `MONGODB_URI` | 你填的 | 数据库连接 |

---

## 第 3 步：验证（别只看部署成功）

1. 打开 `https://<你的地址>/api/health`，应该看到：

   ```json
   { "ok": true, "data": { "status": "ok", "db": "connected", "version": "1.0.0" } }
   ```

   `db` 不是 `connected` 就说明 Atlas 没连上，先查白名单和密码。
2. 打开首页 `https://<你的地址>/`，能看到星空首页。
3. 发一条树洞 → 切到公开池看有没有出现 → 刷新页面，数据还在（说明真的落库了）。
4. 手机 4G 流量开一次，确认不是只有内网能访问。

> 免费实例 15 分钟无流量会休眠。**第一次访问会转 1 分钟左右**，这是冷启动，不是坏了。

---

## 第 4 步（可选）：接外部服务 / API Key

Render 上**不需要额外授权**：环境变量、出站网络默认就开放，也不限端口。和 Poteto 那套 `previews:env` / `previews:web` 的授权流程完全不是一回事。

代码里相关的是三个变量（`src/config/index.js:61-65`）：

| 变量 | 说明 |
|---|---|
| `API_KEY` 或 `LLM_API_KEY` | 两个名字都认，后者优先；填一个即可 |
| `LLM_BASE_URL` | OpenAI 兼容接口的根地址，例如 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名，例如 `deepseek-chat` |

**三项同时存在才会启用外部模型。** 只填 `API_KEY`、缺另外两个时，`llm.enabled` 为 `false`，安抚文案自动回退到本地安全模板——不会报错，也不会阻塞任何接口。

怎么加：

1. Render 控制台 → 你的服务 → 左侧 **Environment** → **Add Environment Variable**，逐条添加。
2. 或者在第 2 步创建 Blueprint 时直接填——`render.yaml` 里已声明为 `sync: false`，会逐个提示输入。
3. 保存后 Render 会自动重新部署；免费实例冷启动约 1 分钟。

**别做的事**：不要把 key 写进仓库、`.env`、`render.yaml` 的 `value:` 里，更不要放进那个 256 KB 的前端 HTML——前端资产是公开的，谁都能看到。

验证：调用 `POST /api/analyze`，看响应里的 `summary` 是否来自模型而非模板；或看服务日志里有没有 `LLM` 相关的超时/401。

> 出站网络在 Render 上不受限，真正会卡你的是 **Atlas 的白名单**（见第 1 步第 5 点）。如果日志报 `MongooseServerSelectionError`，先回去查白名单，不是 key 的问题。

---

## 已知限制（免费层，够课程演示，不够上线）

- Render 免费 Web 实例：512 MB 内存，15 分钟无流量休眠，冷启动约 1 分钟，每月 750 实例小时（一个服务跑满一个月刚好够）。
- Atlas M0：512 MB 存储、约 500 连接、无自动备份。测试数据可以，真实数据别只放这里。
- 限流是单实例内存版。以后要开多实例，必须换成 Redis store，否则每个实例各算各的。
- 前端是单文件 HTML，`src/app.js` 里为它关掉了 CSP；正式上线前应拆成静态资源并开 CSP。
- 免费实例随时可能被平台重启，长连接/定时任务不要依赖它。

---

## 常见故障

| 现象 | 原因 | 处理 |
|---|---|---|
| 部署成功但一直 `unhealthy` | `/api/health` 返回 503，即数据库没连上 | 查 Atlas 白名单是否 `0.0.0.0/0`、密码是否含未转义字符、连接串是否带库名 |
| 打开页面转圈 1 分钟后才出来 | 免费实例冷启动 | 正常现象；演示前 1 分钟先点一次预热 |
| 登录/匿名身份每次刷新都变 | Cookie 没保存 | 必须走 HTTPS；确认 `COOKIE_SECURE=true` 且 `TRUST_PROXY=1` |
| 构建失败，日志停在 `npm ci` | 锁文件与 `package.json` 不一致 | 本地跑 `npm ci` 确认，再 `git push` |
| 发帖提示 429 | 命中限流 | 等窗口过去；调试期可临时把 `RATE_LIMIT_ENABLED` 设 `false`，**别在演示环境关** |

---

## 不想用了怎么停

Render 控制台里把服务 **Suspend**（保留配置，不再占实例小时），或在 Atlas 里暂停集群。彻底删除：Render 服务 Delete，Atlas 集群 Terminate。两个都是免费层，不删也不会扣钱。
