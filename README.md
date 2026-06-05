[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook（语境单词本）

本地优先的轻量语境词汇复习工具。适合在看外语视频时记录生词、原句、本地视频片段、截图、音频和标签，再用 FSRS 算法安排复习。

> 当前项目是本地 Web 应用。数据默认保存在你电脑上的 SQLite 数据库和 `uploads/` 文件夹里，不需要云账号。

## 主要功能

- 围绕真实语境制卡：目标单词、当前语境释义、原句、备注、标签。
- 一个词义条目可关联多个语境实例，适合记录同一含义在不同视频里的用法。
- 本地媒体附件：视频 `mp4`，音频 `mp3`，图片 `jpg / png / webp`。
- FSRS 间隔复习：只保留 `Again` / `Good` 两个评分按钮。
- 词义条目列表、搜索、标签筛选、收藏、统计。
- ZIP 导入导出：支持个人完整备份和纯卡片分享。
- V2 制卡页 AI 建议：可配置 OpenAI-compatible API，用于建议语境释义和用法说明；API Key 只保存在本地。

## 数据位置与磁盘占用提醒

应用默认把数据保存在运行目录下。上传视频、截图、音频后，`uploads/` 目录可能持续变大，占用较多磁盘空间。

默认本地数据：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

不建议放在这些位置运行：

- `/usr/local`、`/opt` 等通常需要 `sudo` 或 root 权限的目录。
- `C:\Program Files` 等系统保护目录。
- 临时目录、下载缓存目录、会被系统或清理工具自动删除的位置。
- 空间很小、同步规则不清楚、可能被网盘自动清理或限额的位置。

## 运行环境

| 环境 | 要求 | 说明 |
|------|------|------|
| Node.js | 推荐 Node.js 22 LTS；至少使用满足当前 Vite 要求的 Node 版本 | 前端构建、开发服务和后端服务都依赖 Node.js。安装脚本会尝试补齐。 |
| npm | 跟随 Node.js 安装 | 仓库包含 `package-lock.json`，安装依赖使用 `npm ci`。 |
| Git | 克隆 GitHub 仓库时需要 | 安装脚本会检查并尝试补齐。 |
| 浏览器 | Chrome / Edge / Firefox / Safari 等现代浏览器 | 应用通过本地 Web 页面使用。 |
| C/C++ 构建工具 | 可能需要 | `better-sqlite3` 是 native module；如果当前系统和 Node 版本没有可用预编译包，`npm ci` 会尝试本地编译。 |

安装脚本会先检查本机已有环境。Linux / WSL 只有在缺少 Git 或 Node.js/npm 时，才会尝试通过 `apt-get` 补齐依赖；如果基础环境已满足，会跳过 `apt-get`，避免触发系统里无关的第三方软件源问题。macOS 脚本会在缺少依赖时尝试使用 Homebrew。Windows 原生脚本会在缺少依赖时尝试使用 `winget`。如果这些包管理器不可用，或当前用户没有安装权限，需要手动安装缺失环境后重试。

## 安装前说明与免责声明

据作者当前认知，本项目自有源码不包含任何恶意代码。安装脚本会检查本机环境，并在受支持的平台上尝试安装缺失依赖，例如 Git、Node.js、npm 和 native build tools。

项目安装会通过系统包管理器和 npm 获取第三方软件与依赖。安装和使用过程中仍可能受到系统权限、网络状态、包管理器可用性、杀毒软件、企业设备策略、磁盘空间、第三方依赖供应链、Node native module 编译结果等因素影响。用户运行安装脚本、安装依赖、修改系统环境、上传和保存本地文件所产生的问题与后果，由用户自行承担。

如果脚本无法自动补齐环境，会输出缺少的工具和建议处理方式；此时需要用户按自己的系统手动安装后再重试。

## 一键安装

### Linux / macOS / WSL

复制下面命令运行即可。脚本会把项目安装到当前目录：

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

脚本会自动检查 Git、Node.js/npm 等依赖；已安装的依赖会直接复用。Linux / WSL 如果基础依赖已满足，会跳过 `apt-get`。

如需先查看脚本内容，可访问：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

高级用法：指定安装目录

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

先进入你想安装项目文件的空目录，再复制下面命令运行。脚本会把项目文件直接安装到当前目录，不会再创建下一层目录：

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

脚本会自动检查 Git、Node.js/npm 等依赖；已安装的依赖会直接复用。

如需先查看脚本内容，可访问：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

高级用法：指定安装目录

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### 遇到问题怎么办

- 如果提示命令不存在，请关闭终端后重新打开，再运行一次安装命令。
- Linux / WSL 如果 `apt-get update` 报 Docker、Chromium、Snap、GPG key 等错误，通常是系统已有 apt 源或未完成包配置异常，不是本项目依赖这些软件。可以先修复/禁用对应 apt 源，或手动安装 Git、Node.js 20+ 和 npm 后重试。
- macOS 如果弹出 Xcode Command Line Tools 安装窗口，请点击“安装”，完成后重新运行安装命令。
- Windows 如果提示需要安装编译环境，请按脚本提示继续；这是部分依赖编译时可能需要的环境。

## 更新到最新版

如果你已经安装过，进入项目目录后运行：

Linux / macOS / WSL / Git Bash：

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows 原生 PowerShell：

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

也可以重新运行一键安装命令。脚本发现安装目录里已有 Git 仓库时，会自动执行 `git pull --ff-only`、`npm ci` 和 `npm run build`。

如果在项目目录里重新运行一键安装命令，脚本会更新当前项目目录，不会再创建下一层同名目录。如果在项目外运行，请先进入一个空目录，或显式设置同一个 `CVN_HOME`；脚本不会把项目文件混入非空的普通目录。

## 手动安装

如果一键脚本无法补齐环境，可先手动安装 Node.js 22 LTS、npm、Git，以及可能需要的 native build tools，然后执行下面命令。

Linux / macOS / WSL / Git Bash：

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows 原生 PowerShell：

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

后端默认地址：

```text
http://localhost:3107
```

## 环境变量

<!-- AUTO-GENERATED:ENV -->
| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 否 | `3107` | 后端 Express 服务端口。Vite 开发服务会把 `/api` 代理到该端口。 |
| `DATABASE_PATH` | 否 | `./data/context-vocabulary-notebook.sqlite` | SQLite 数据库路径。相对路径会按项目根目录解析。 |
| `UPLOADS_DIR` | 否 | `./uploads` | 上传媒体文件保存目录。相对路径会按项目根目录解析。 |
<!-- /AUTO-GENERATED:ENV -->

开发时如需修改前端端口，可在运行命令时设置 `CLIENT_PORT`，默认 `5173`。该变量不在 `.env.example` 中，通常不需要配置。

## 常用命令

<!-- AUTO-GENERATED:SCRIPTS -->
| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动后端开发服务和 Vite 前端开发服务。 |
| `npm run dev:client` | 只启动 Vite 前端开发服务，默认监听 `0.0.0.0:5173`。 |
| `npm run dev:server` | 只启动后端 Express 开发服务，默认监听 `localhost:3107`。 |
| `npm run build` | 先执行类型检查，再构建前端和后端。 |
| `npm test` | 运行 Vitest 单元 / 集成测试。 |
| `npm run test:e2e` | 运行 Playwright E2E 测试；没有测试文件时也通过。 |
| `npm run typecheck` | 运行前端和 Node 侧 TypeScript 类型检查。 |
| `npm run lint` | 当前等同于 `npm run typecheck`。 |
<!-- /AUTO-GENERATED:SCRIPTS -->

## 数据与备份

默认数据都在项目目录下：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

备份时建议一起保存：

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

恢复时把这些文件放回同一个项目目录，再启动应用。

应用内也提供 ZIP 导入导出：

- 完整备份：包含卡片、语境、媒体、标签、收藏、复习状态、FSRS 状态、复习记录和用户设置。
- 纯卡片分享：不包含个人复习进度、收藏状态、用户设置。

AI API Key 属于本地敏感配置，不会随导出文件带走；换设备后需要重新填写。

## 媒体文件建议

| 类型 | 支持格式 | 建议大小 |
|------|----------|----------|
| 视频 | `mp4` | 单文件 300MB 以内 |
| 音频 | `mp3` | 单文件 50MB 以内 |
| 图片 | `jpg` / `png` / `webp` | 单文件 10MB 以内 |

## AI 建议配置

制卡页支持可选 AI 建议。需要在设置页添加 OpenAI-compatible API 配置：

- 显示名称
- Base URL
- API Key
- Model

说明：

- 不配置 AI 也可以正常手动制卡和复习。
- API Key 存在本地数据库中，界面会做遮罩显示。
- API Key 不会包含在导出文件里。
- AI 只用于制卡时建议语境释义和用法说明，不是内置词典，也不是自动制卡。

## 常见问题

### 端口被占用

修改 `.env`：

```env
PORT=3108
```

如果前端端口 `5173` 被占用：

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci 在 better-sqlite3 处失败

优先使用 Node.js 22 LTS。`better-sqlite3` 是 native module；如果当前系统和 Node 版本没有可用预编译包，安装时会尝试本地编译。

Linux / WSL：

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS：

```bash
xcode-select --install
```

Windows 原生环境需要可用的 Python 和 Visual Studio Build Tools / MSVC native build 环境。如果这些工具配置不熟，建议改用 WSL，或先手动安装缺失环境后重试。

### 页面能打开，但 API 请求失败

确认后端运行：

```text
http://localhost:3107/api/health
```

正常返回：

```json
{"ok":true}
```

### 想换安装目录

移动整个项目目录即可。若 `.env` 使用相对路径，数据库和上传目录会继续相对新目录解析。若 `.env` 写了绝对路径，需要同步修改。

## 开发说明

本项目技术栈：

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

第一版坚持本地优先，不内置词库，不接词典，不做网站视频链接，不做同步。当前 V2 只增加制卡时 AI 建议能力。

## 许可证

本项目使用 MIT License。详见 [`LICENSE`](./LICENSE)。
