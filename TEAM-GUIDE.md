# 星语心声 · 组员使用与协作教程

> 团队：**桃源餐厅结义**  
> 作品：**星语心声**（东南大学同校情绪共鸣空间）  
> 仓库：<https://github.com/TJM0918/xingyu-xinsheng>
>
> 这份教程面向第一次参与项目的组员。你不需要理解全部后端代码，按步骤完成环境、启动、使用和提交即可。

---

## 0. 先记住三件事

1. **作品名是“星语心声”，团队名是“桃源餐厅结义”。**
2. 不要再用旧压缩包，统一从 GitHub 仓库拉取最新代码。
3. 不要提交 `node_modules`、`.env`、日志、本地数据库或别人的电脑上的工具目录。

---

## 1. 你需要安装什么

### 必须安装

| 软件 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | **18.18+**，推荐 20/22 LTS | 运行后端和前端 |
| Git | 最新版 | 拉取/提交代码 |

### 推荐安装

| 软件 | 用途 |
| --- | --- |
| GitHub Desktop | 不熟悉命令行时，用它克隆、提交、推送 |
| VS Code | 编辑代码 |
| Docker Desktop（可选） | 需要持久化数据库时使用 |

> 只跑“一键演示模式”不需要安装 MongoDB，也不需要 Docker。

### 检查 Node

打开终端：

```bash
node -v
npm -v
```

应看到 `v20.x` 或更高。  
如果提示“不是内部或外部命令”，重新安装 Node.js LTS，安装时勾选 **Add to PATH**，然后重启终端。

---

## 2. 第一次获取项目

### 方式 A：GitHub Desktop（推荐给不熟命令行的组员）

1. 打开 <https://desktop.github.com/> 安装 GitHub Desktop。
2. 登录 GitHub 账号。
3. 点击 **File → Clone repository**。
4. 选择 **URL**，粘贴：

```text
https://github.com/TJM0918/xingyu-xinsheng.git
```

5. 选择本地目录，例如：

```text
D:\dev\xingyu-xinsheng
```

6. 点击 **Clone**。

> 仓库目前是 Public，只克隆不需要被邀请。  
> 如果要推送代码，仓库所有者需要在 GitHub 的 **Settings → Collaborators → Add people** 里邀请你。

### 方式 B：命令行

```bash
git clone https://github.com/TJM0918/xingyu-xinsheng.git
cd xingyu-xinsheng
```

如果 `git` 命令不可用，先安装 Git for Windows，或者使用 GitHub Desktop。

### 不要用旧压缩包

旧压缩包不会自动更新。  
统一使用 GitHub 仓库，后续 `git pull` 才能拿到最新代码。

---

## 3. 第一次启动

### 3.1 进入项目目录

```powershell
cd D:\dev\xingyu-xinsheng
```

路径换成你自己的。

### 3.2 安装依赖

```bash
npm ci
```

如果 `npm ci` 报找不到 `package-lock.json`，说明仓库没克隆完整，重新克隆。

### 3.3 创建本地配置

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

macOS / Linux：

```bash
cp .env.example .env
```

本地演示模式不需要修改 `.env`。

### 3.4 启动

推荐的一键演示模式：

```bash
npm run dev:memory
```

Windows 也可以直接双击：

```text
start-windows.bat
```

macOS：

```bash
chmod +x start-mac.command
./start-mac.command
```

看到：

```text
启动成功！
浏览器打开：http://localhost:3000
```

即成功。

### 3.5 打开页面

```text
http://localhost:3000
```

首屏点击 **「直接进入星海」**，不用滚到底。

### 3.6 停止

在终端按：

```text
Ctrl + C
```

一键演示模式使用临时内存数据库，关闭后数据会清空。

---

## 4. 页面怎么用

进入后顶部有四个入口：

```text
天空 / 树洞 / 信箱 / 统计
```

### 4.1 天空

- 查看公开树洞
- 点击「我也有同感」
- 右侧公开共鸣卡片
- 点击「写一条心事」
- 发布公开树洞后会回到天空视图

### 4.2 树洞

- **广场**：所有已公开树洞，按公开时间排序
- **我的**：自己的私密、定时、公开树洞
- **写一条**：
  - 私密：仅自己可见，不进入公开池、星空或统计
  - 公开 · 即时发布：发布后直接回到天空
  - 公开 · 预计时间发布：选择时间，到点后才进入天空
  - 校区/地点可选
  - 不再选择场景标签、情绪或强度

> 系统会在提交时静默分析情绪，只用来决定星点落在哪一段，不向用户展示分析结果。

### 4.3 匿名信箱

- **收件箱**：收到的信
- **发件箱**：寄出的信
- **写一封信**：需要粘贴对方的匿名 ID
- 打开信后可以回复、删除
- 不展示对方原始匿名 ID

### 4.4 统计

- 今晚公开心事数量
- 整体强度
- 主导情绪
- 情绪分布
- 本周趋势
- 私密自检卡片

> 私密树洞不会进入任何公开统计。

### 4.5 我的匿名 ID

右上角「我的匿名 ID」可以：

- 查看当前匿名身份
- 复制给想通信的同学
- 换一个匿名身份

换身份后，当前浏览器将看不到原来的树洞和信箱，这是正常设计。

### 4.6 产品边界

- 公开池没有评论区
- 没有热度榜、点赞排名
- 只保留「我也有同感」
- 不做心理诊断
- 危机表达只展示支持卡片，不发布
- 不做匿名 ID 公开交换

---

## 5. 日常开发流程

### 5.1 开始前先拉最新代码

```bash
git switch main
git pull
```

如果依赖有变化：

```bash
npm ci
```

然后启动：

```bash
npm run dev:memory
```

### 5.2 建自己的分支

不要直接在 `main` 上改。

```bash
git switch -c feature/你的名字-功能
```

例如：

```bash
git switch -c feature/zhangsan-treehole-ui
```

### 5.3 修改并自测

至少跑：

```bash
npm run check
npm test
```

再打开页面走一遍相关功能。

### 5.4 提交

先看改了什么：

```bash
git status
git diff
```

再提交：

```bash
git add .
git commit -m "feat: 描述这次改动"
git push -u origin feature/你的名字-功能
```

### 5.5 发起 Pull Request

在 GitHub 页面点击 **Compare & pull request**，填写：

- 改了什么
- 怎么测试
- 截图（如果涉及 UI）

让仓库所有者合并到 `main`。

### 5.6 合并后更新本地

```bash
git switch main
git pull
```

---

## 6. Git 提交规范

推荐格式：

```text
feat: 新功能
fix: 修复问题
docs: 文档
test: 测试
chore: 配置/依赖
refactor: 重构
```

示例：

```text
feat: 增加预计时间发布
fix: 发布后回到天空视图
docs: 补充组员使用教程
```

### 设置提交身份

第一次使用 Git 时：

```bash
git config user.name "桃源餐厅结义 · 你的名字"
git config user.email "你的邮箱@example.com"
```

如果老师要求统一团队署名，可以统一写：

```bash
git config user.name "桃源餐厅结义"
git config user.email "2759914731@qq.com"
```

> 不要使用别人的姓名和邮箱。

---

## 7. 绝对不要提交

以下内容已在 `.gitignore` 中，但不要手动强加：

```text
node_modules/
.env
*.log
*.zip
tools/
coverage/
```

另外不要提交：

- 本地 MongoDB 数据
- 个人隐私、真实学生姓名、学号、手机号
- 大体积截图/视频
- 别人的 token、密码、代理配置
- `dist` 之外的构建产物

---

## 8. 常见问题

### 8.1 `node` 不是内部或外部命令

Node.js 没装好，或安装后没重启终端。安装 LTS，勾选 Add to PATH，重启终端。

### 8.2 `npm ci` 很慢

第一次安装依赖需要时间。  
如果网络慢，可以临时：

```bash
npm config set registry https://registry.npmmirror.com
npm ci
```

### 8.3 `EADDRINUSE :3000`

3000 端口被占用。修改 `.env`：

```dotenv
PORT=3001
```

重新启动，打开 `http://localhost:3001`。

### 8.4 页面能打开但接口 404

确认访问的是：

```text
http://localhost:3000
```

不是前端的 5173 端口。前端独立运行时需要配置 CORS。

### 8.5 浏览器不保存匿名 Cookie

本地 HTTP 调试时确认 `.env`：

```dotenv
COOKIE_SECURE=false
NODE_ENV=development
```

生产 HTTPS 才设 `true`。

### 8.6 `git pull` 冲突

不要直接 `git push -f`。  
先：

```bash
git status
```

把自己未提交的改动 `git stash` 或先提交，再拉取；解决不了就把冲突文件发群里。

### 8.7 GitHub 推送失败

- 确认自己已被仓库所有者邀请为 Collaborator
- 确认 GitHub 账号已登录
- 公司/学校网络可能需要代理
- 不要在教程里复制别人的 `127.0.0.1:10809` 代理配置，每台机器不同

### 8.8 关闭后数据没了

一键演示模式是内存数据库，正常。需要持久化时使用 Docker 或本机 MongoDB，见 `FRONTEND-SETUP.md` 第 11 节。

### 8.9 页面没有最新改动

- 确认 `git pull` 成功
- 重启 `npm run dev:memory`
- 浏览器 `Ctrl + F5` 强制刷新

---

## 9. 求助时发什么

不要只发“跑不起来”。把下面信息一起发：

```text
系统：Windows 11 / macOS 14 / Ubuntu 22.04
Node 版本：node -v
启动方式：npm run dev:memory / start-windows.bat
执行命令：...
完整报错：终端最后 20 行
git 状态：git status --short
页面地址：http://localhost:3000
```

最好附一张终端或页面截图。

---

## 10. 快速命令

```bash
# 第一次
git clone https://github.com/TJM0918/xingyu-xinsheng.git
cd xingyu-xinsheng
npm ci
cp .env.example .env
npm run dev:memory

# 日常
git switch main
git pull
npm ci
npm run dev:memory

# 开分支
git switch -c feature/你的名字-功能

# 提交
git add .
git commit -m "feat: 描述改动"
git push -u origin feature/你的名字-功能
```

Windows 如果使用仓库里的 PortableGit：

```powershell
tools\PortableGit\cmd\git.exe clone https://github.com/TJM0918/xingyu-xinsheng.git
```

> `tools/` 不会提交到仓库，只是本机的便携 Git；其他组员克隆后没有这个目录，需要自己安装 Git 或 GitHub Desktop。

---

## 11. 第一次启动验收清单

- [ ] `node -v` 有输出，版本 18.18+
- [ ] 已从 GitHub 克隆最新仓库
- [ ] `npm ci` 成功
- [ ] 已创建 `.env`
- [ ] `npm run dev:memory` 显示启动成功
- [ ] 浏览器能打开 <http://localhost:3000>
- [ ] 首屏点「直接进入星海」能进入
- [ ] 天空/树洞/信箱/统计四个入口都能打开
- [ ] 即时发布后回到天空
- [ ] 预计时间发布后进入「我的」
- [ ] 私密发布能看到安抚卡片
- [ ] 没有场景标签、个人情绪/强度分析
- [ ] 知道怎么停止（Ctrl+C）
- [ ] 知道数据重启会清空

---

## 12. 相关文档

- [README.md](README.md)：完整 API 与部署说明
- [FRONTEND-SETUP.md](FRONTEND-SETUP.md)：小白启动手册
- [docs/FRONTEND-HANDOFF.md](docs/FRONTEND-HANDOFF.md)：接口字段、任务拆分与验收
- [GIT-LOG.txt](GIT-LOG.txt)：提交记录索引

---

**最后一句：先 `git pull`，再启动；不要用旧压缩包，不要提交 `.env` 和 `node_modules`。**
