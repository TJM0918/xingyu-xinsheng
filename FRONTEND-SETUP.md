# 星语心声 · 前端同学使用说明书（小白版）

> 这份文档是给**完全没接触过后端**的前端同学看的。  
> 你不需要看懂后端代码，也不需要安装 MongoDB、Docker，按下面步骤操作就能在自己电脑上跑起来。
>
> 如果只想先看到页面、联调接口，**只做第 3 步或第 4 步即可**。

---

## 0. 先看结论

你会得到一个压缩包，解压后：

- Windows：双击 `start-windows.bat`
- macOS：双击 `start-mac.command`
- 等 1~10 分钟（第一次会下载依赖）
- 浏览器打开 <http://localhost:3000>
- 点 **「直接进入星海」** 即可开始使用
- 想了解产品，再继续向下滚动看介绍

这个“一键模式”会使用一个**临时内存数据库**：

- 不需要安装 MongoDB；
- 不需要改任何配置；
- 每次关闭服务，测试数据会清空；
- 非常适合前端联调、做页面、截图、演示；
- 不适合存真实数据。

如果你需要“关掉再打开数据还在”，看第 11 节的可选持久化方式。

---

## 1. 你需要准备什么

只需要一样东西：

### Node.js

Node.js 是一个运行 JavaScript 的程序。这个后端需要它。

- 版本要求：**18.18 或更高**
- 推荐安装：**Node.js 20 LTS** 或 **22 LTS**
- 下载地址：<https://nodejs.org/zh-cn>

安装时注意：

1. 选择 **LTS** 版本，不要选 Current。
2. Windows 安装向导里勾选 **Add to PATH**（默认就是勾选的）。
3. 安装完成后，**重新打开**终端或重启电脑，让命令生效。

### 怎么检查装好了

Windows：

1. 按 `Win + R`
2. 输入 `cmd`
3. 按回车
4. 在黑色窗口输入：

```bat
node -v
npm -v
```

macOS：

1. 打开“终端”（Terminal）
2. 输入：

```bash
node -v
npm -v
```

如果出现类似：

```text
v20.11.1
10.2.4
```

说明安装成功。

如果提示：

```text
'node' 不是内部或外部命令
```

说明没装好，或者装完没有重开终端。重新安装 Node.js LTS，并确认勾选 Add to PATH。

---

## 2. 先把压缩包解压

### Windows

1. 找到 `xingyu-xinsheng-frontend-kit.zip`
2. 右键
3. 选择“全部解压缩”
4. 解压到简单路径，例如：

```text
D:\xingyu-xinsheng
```

不要直接双击压缩包里的文件，那样不能正常运行。

### macOS

1. 双击 zip，系统会自动解压
2. 把解压出来的文件夹拖到“下载”或“文稿”
3. 路径尽量简单，例如：

```text
~/dev/xingyu-xinsheng
```

### 解压后应该看到

```text
start-windows.bat
start-mac.command
package.json
package-lock.json
src/
52-完整体-大字(1).html
FRONTEND-SETUP.md
docs/
```

如果缺少 `package.json` 或 `src/`，说明解压不完整，重新解压。

---

## 3. Windows 一键启动（推荐）

### 3.1 双击启动

进入解压后的文件夹，双击：

```text
start-windows.bat
```

会出现一个黑色窗口。

### 3.2 第一次运行会发生什么

- 自动检查 Node.js 版本；
- 自动创建 `.env` 配置文件；
- 自动执行 `npm install` 安装依赖；
- 自动下载一个临时 MongoDB；
- 自动启动后端。

第一次可能需要 **3~10 分钟**，取决于网速。  
窗口里会显示类似：

```text
第一次运行，正在安装依赖，可能需要 3~10 分钟...
请不要关闭这个窗口。
```

**不要关窗口，不要按键盘，等它跑完。**

### 3.3 看到什么算成功

最后会出现：

```text
====================================================
  启动成功！
  浏览器打开：http://localhost:3000
  健康检查：  http://localhost:3000/api/health
====================================================
```

这时：

1. 打开浏览器
2. 地址栏输入：

```text
http://localhost:3000
```

3. 能看到“星海 / 星语心声”页面，就是成功了。

### 3.4 如果窗口一闪就没了

说明启动过程中出错了。用下面的方式重新打开，才能看到报错：

1. 在文件夹空白处按住 `Shift`，右键
2. 选择“在此处打开 PowerShell 窗口”或“在终端中打开”
3. 输入：

```powershell
.\start-windows.bat
```

4. 把窗口里的报错截图发给后端同学。

### 3.5 怎么停止

在那个黑色窗口按：

```text
Ctrl + C
```

然后关闭窗口。

> 一键模式使用内存数据库，停止后数据会清空。  
> 下次启动会重新生成一份干净数据。

---

## 4. macOS 一键启动（推荐）

### 4.1 第一次需要给执行权限

macOS 可能会阻止 `.command` 文件运行。打开“终端”，执行：

```bash
cd ~/dev/xingyu-xinsheng
chmod +x start-mac.command
```

> 把 `~/dev/xingyu-xinsheng` 换成你实际解压的路径。  
> 偷懒方法：输入 `cd `（注意后面有空格），然后把文件夹拖进终端，按回车。

### 4.2 双击启动

双击：

```text
start-mac.command
```

> Linux 用户：在终端执行 `bash start-mac.command` 即可。

如果系统提示“无法打开，因为来自身份不明的开发者”：

1. 右键点击 `start-mac.command`
2. 选择“打开”
3. 在弹窗里再点“打开”

### 4.3 成功标志

和 Windows 一样，看到：

```text
启动成功！
浏览器打开：http://localhost:3000
```

然后浏览器打开 <http://localhost:3000>。

### 4.4 怎么停止

在终端窗口按：

```text
Control + C
```

---

## 5. 确认服务真的成功了

### 5.1 打开健康检查

浏览器访问：

```text
http://localhost:3000/api/health
```

如果看到类似：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "db": "connected"
  }
}
```

说明后端和数据库都正常。

如果 `db` 是 `disconnected`，或者页面打不开，看第 12 节。

### 5.2 打开首页

浏览器访问：

```text
http://localhost:3000/
```

看到首屏后，点 **「直接进入星海」** 即可进入功能界面；如果还想看介绍，继续向下滚动即可。

### 5.3 如果浏览器显示“无法访问此网站”

1. 回到黑色窗口，确认没有退出；
2. 确认窗口最后没有红色报错；
3. 确认端口是 `3000`；
4. 如果被占用，看第 12.3 节改端口。

---

## 6. 这个页面现在能做什么

单文件页面已经接入全部核心功能，进入舷窗后顶部有四个入口：

### 天空

- 查看公开树洞的共鸣流
- 点击「我也有同感」
- 写一条心事
- 公开树洞会以星点进入星空

### 树洞

- **广场**：所有已公开树洞，按公开时间排序，没有评论区
- **我的**：自己的私密、定时、公开树洞；私密内容会显示 AI 安抚
- **写一条**：
  - 私密：仅自己可见，不进入公开池/星空/统计
  - 公开 · 即时发布：发布成功后自动回到天空视图
  - 公开 · 预计时间发布：选择时间，到点后才进入天空
  - 校区/地点
  - 不展示场景标签、个人情绪或强度分析；系统在提交时静默分析，只用于决定星点位置

### 匿名信箱

- **收件箱**：收到的信、未读状态
- **发件箱**：寄出的信
- **写一封信**：粘贴对方匿名 ID 才能寄
- 打开信后可以回复、删除
- 不展示对方的原始匿名 ID，只显示「匿名同学」

> 想看自己的匿名 ID：点右上角「我的匿名 ID」，复制后发给想通信的同学。  
> 平台没有通讯录，也不会推荐好友。

### 统计

- 今晚公开心事总量、整体强度、主导情绪
- 情绪分布、本周趋势、私密自检
- 本周 7 天趋势
- 私密自检卡片
- 「需要帮助？」支持入口

### 这些行为是故意的

- 公开池没有评论、没有热度榜、没有点赞排名
- 私密内容不会进入星空/统计
- 危机表达会返回支持卡片，不发布
- 信箱不交换手机号/微信/QQ

接口细节：

- [docs/FRONTEND-HANDOFF.md](docs/FRONTEND-HANDOFF.md)
- [README.md](README.md)

你不需要一次看完。先跑起来，再按页面功能逐个体验。

---

## 7. 前端怎么调用接口（先看这一节）

### 7.1 同源方式（推荐）

如果页面就是通过 `http://localhost:3000` 打开的，直接写：

```js
const res = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "期末机考好焦虑" }),
});

const payload = await res.json();
console.log(payload.data.risk.level);
```

不需要手动处理匿名 ID，浏览器会自动带 Cookie。

### 7.2 前端独立启动（Vite / 5173 端口）

如果页面跑在 `http://localhost:5173`，后端在 `3000`，属于跨域。

1. 打开 `.env`，加上：

```dotenv
CORS_ORIGINS=http://localhost:5173
```

2. 重启后端（Ctrl+C 后重新双击启动脚本）。
3. 前端先请求：

```js
const res = await fetch("http://localhost:3000/api/session", {
  credentials: "include",
});
const payload = await res.json();
localStorage.setItem("xy_anonymous_id", payload.data.anonymousId);
```

4. 后续请求带：

```js
headers: {
  "Content-Type": "application/json",
  "X-Anonymous-Id": localStorage.getItem("xy_anonymous_id"),
}
```

> 不要把 `anonymousId` 显示在页面上，不要放进 URL，不要发到埋点。

### 7.3 统一返回格式

成功：

```json
{ "ok": true, "data": {}, "meta": {} }
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "树洞内容不能为空"
  }
}
```

### 7.4 必须处理的异常

| 状态 | 含义 | 页面应该怎么做 |
| --- | --- | --- |
| 400 | 参数不对 | 提示用户，保留已输入内容 |
| 404 | 内容不存在 | 显示空状态 |
| 422 `CRISIS_SUPPORT` | 危机表达 | 显示支持卡片，不发布内容 |
| 422 `CONTENT_NEEDS_REWRITE` | 公开内容含挂人/身份信息 | 提示只写自己的感受，保留草稿 |
| 422 `MAILBOX_BOUNDARY` | 信件含联系方式 | 提示不要交换联系方式 |
| 429 | 请求太频繁 | 提示稍后再试 |

危机支持信息在：

```js
error.details.support.hotlines
error.details.support.campus
```

---

## 8. 数据存在哪里？为什么重启就没了？

一键模式使用**内存数据库**：

- 数据只存在运行中的进程里；
- 关闭窗口后清空；
- 每次启动都是全新环境。

这对前端联调是好事：

- 不怕弄脏数据；
- 不需要清理；
- 每个人环境一致。

但如果你需要“关掉再打开数据还在”，看第 11 节。

---

## 9. 常用操作

### 9.1 重新启动

关闭黑色窗口，重新双击启动脚本。

### 9.2 修改端口

如果 3000 被占用：

1. 用记事本打开 `.env`
2. 修改：

```dotenv
PORT=3001
```

3. 重新启动
4. 浏览器访问 `http://localhost:3001`

### 9.3 清空数据

一键模式直接关闭再启动即可。

### 9.4 查看接口列表

浏览器打开：

```text
http://localhost:3000/api
```

---

## 10. 手动启动（双击失败时再用）

如果双击脚本没有反应，可以手动打开终端。

### Windows

```powershell
cd D:\xingyu-xinsheng
npm install
npm run dev:memory
```

### macOS / Linux

```bash
cd ~/dev/xingyu-xinsheng
npm install
npm run dev:memory
```

看到“启动成功”后打开 <http://localhost:3000>。

> `npm install` 只需要第一次执行。之后直接 `npm run dev:memory`。

---

## 11. 可选：需要数据持久化时

如果你希望关掉再打开数据还在，三选一。

### 方式 A：Docker（推荐给不想装 MongoDB 的同学）

需要先安装 Docker Desktop。

1. 复制配置：

```powershell
Copy-Item .env.example .env
```

2. 打开 `.env`，把 `AUDIT_HMAC_SECRET` 改成长随机值，例如：

```dotenv
AUDIT_HMAC_SECRET=9f8a7c6d5e4b3a2918273645f6e7d8c9
```

3. 启动：

```powershell
docker compose up --build
```

4. 打开 <http://localhost:3000>
5. 停止：

```powershell
docker compose down
```

> 数据在 Docker volume 里。只有确认要清空时才执行 `docker compose down -v`。

### 方式 B：本机 MongoDB

安装 MongoDB 6/7，启动服务，然后：

```bash
npm ci --omit=dev
cp .env.example .env
npm run dev
```

### 方式 C：团队共享开发库

找后端同学要一个**开发专用**的 MongoDB URI，写进 `.env`：

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/xingyu_xinsheng_dev
```

不要连生产库，不要把这个 URI 发到群里。

---

## 12. 常见问题

### 12.1 `'node' 不是内部或外部命令`

Node.js 没装好，或者装完没有重开终端。

处理：

1. 重新安装 Node.js LTS；
2. 安装时勾选 Add to PATH；
3. 重启电脑；
4. 再执行 `node -v`。

### 12.2 `npm install` 很慢 / 卡住

第一次需要下载很多文件，3~10 分钟正常。

如果超过 15 分钟：

1. 检查网络；
2. 检查公司/学校代理；
3. 换网络重试；
4. 仍然失败就把窗口报错截图发给后端。

### 12.3 `EADDRINUSE: address already in use :3000`

3000 端口被占用了。

处理：

1. 关闭之前打开的黑色窗口；
2. 还是不行就修改 `.env`：

```dotenv
PORT=3001
```

3. 重新启动，访问 `http://localhost:3001`。

### 12.4 浏览器打不开 `localhost:3000`

按顺序检查：

1. 黑色窗口还在运行吗？
2. 窗口里有没有红色报错？
3. 访问 `http://localhost:3000/api/health` 能不能打开？
4. 是不是把端口改成了 3001？
5. 有没有开 VPN / 代理导致 localhost 被拦截？

### 12.5 页面能打开，但接口 404

确认你访问的是：

```text
http://localhost:3000
```

不是：

```text
http://localhost:5173
```

如果前端独立运行，按第 7.2 节配置 CORS。

### 12.6 浏览器不保存匿名 Cookie

一键模式已经设置为本地可用的 Cookie。  
如果你是生产模式（`NODE_ENV=production`）却用 HTTP 打开，需要：

```dotenv
COOKIE_SECURE=false
```

正式 HTTPS 环境必须保持 `true`。

### 12.7 重启后数据没了

一键模式是内存数据库，正常现象。  
需要持久化看第 11 节。

### 12.8 macOS 提示“无法打开，因为来自身份不明的开发者”

右键 `start-mac.command` → 打开 → 再点“打开”。

或者终端执行：

```bash
chmod +x start-mac.command
./start-mac.command
```

### 12.9 我不小心关了窗口，数据还能恢复吗？

一键模式不能恢复，重新启动即可。  
需要保留数据请使用第 11 节的持久化方式。

---

## 13. 千万不要做这些事

1. **不要把 `.env` 发到群里。** 里面可能有数据库密码。
2. **不要把 `node_modules` 打包发人。** 每个人自己 `npm install`。
3. **不要把开发服务器直接暴露到公网。** 临时演示用 tunnel 也要演示完就关。
4. **不要在公开池做评论区。** 后端没有评论接口，这是产品边界。
5. **不要按共鸣数/点赞数做热度排序。** 公开池只按时间。
6. **不要展示其他用户的 `anonymousId`。** 信箱只显示 `counterpart.label`。
7. **不要把真实学生隐私数据放进演示环境。**
8. **不要直接双击 `src/server.js`。** 用启动脚本或 `npm run dev:memory`。

---

## 14. 遇到问题怎么求助

不要只发“跑不起来”。把下面信息一起发：

```text
系统：Windows 11 / macOS 14 / Ubuntu 22.04
Node 版本：node -v 的输出
启动方式：双击脚本 / npm run dev:memory
执行命令：...
完整报错：终端最后 20 行
健康检查：http://localhost:3000/api/health 返回什么
```

最好再附一张黑色窗口的截图。

---

## 15. 启动验收清单

- [ ] 已安装 Node.js 18.18+，`node -v` 有输出
- [ ] 已解压压缩包，能看到 `package.json` 和 `src/`
- [ ] 双击启动脚本后，窗口没有闪退
- [ ] 终端出现“启动成功”
- [ ] 浏览器能打开 <http://localhost:3000>
- [ ] `/api/health` 返回 `db: "connected"`
- [ ] 控制台没有 CORS 报错
- [ ] 进入舷窗后能看到「天空 / 树洞 / 信箱 / 统计」四个入口
- [ ] 能写一条公开树洞并在天空看到
- [ ] 能写一条私密树洞并看到 AI 安抚
- [ ] 能打开「我的匿名 ID」并复制
- [ ] 知道怎么停止服务（Ctrl+C）
- [ ] 知道数据重启会清空

---

## 16. 版本更新

拿到新压缩包后：

1. 关闭旧服务；
2. 解压新包到新目录；
3. 把旧的 `.env` 复制到新目录（如果有）；
4. 重新双击启动脚本；
5. 如果这次更新涉及依赖变化，启动脚本不会自动重装时，在文件夹里打开终端执行 `npm install`。

> 不要覆盖 `.env` 里的共享数据库配置。

---

## 17. 一句话记住

**双击启动 → 等“启动成功” → 打开 `http://localhost:3000` → 点「直接进入星海」。**  
**私密内容只给本人看，公开池只留「我也有同感」。**
