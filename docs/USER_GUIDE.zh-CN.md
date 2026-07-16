# Context Vocabulary Notebook — 中文用户手册

[English](./USER_GUIDE.md) | [简体中文](./USER_GUIDE.zh-CN.md)

本手册集中说明安装、更新、本地识别、配置、备份和故障排查。产品简介请看
[中文 README](../README.zh-CN.md)。

## 1. 实际安装的是什么

语境单词本是一个在自己电脑上运行的本地 Web 应用，通过现代浏览器访问。它不是
托管在云端的服务，目前也不提供原生桌面安装包。

默认核心数据都在项目目录：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

媒体支持 `mp4` 视频、`mp3` 音频，以及 `jpg`、`png`、`webp` 图片。批量导入
处理本地 MP4 片段，不支持视频网站链接。

## 2. 环境要求

| 组件 | 要求 |
|---|---|
| Node.js | `20.19+` 或 `22.12+`；推荐 Node.js 22 LTS。 |
| npm | 随 Node.js 安装；依赖使用 `npm ci`。 |
| Git | 克隆和更新仓库需要。 |
| 浏览器 | 当前版本的 Chrome、Edge、Firefox 或 Safari。 |
| 原生构建工具 | `better-sqlite3` 没有匹配的预编译包时可能需要。 |
| ffmpeg | 可选；提取音频、帧和分析片段时需要。 |
| Tesseract | 可选；本地图片或视频帧 OCR 需要。 |
| whisper.cpp + 模型 | 可选；本地语音识别需要。 |

在 Windows 上，WSL 通常更容易配置 Node、Git、ffmpeg、Tesseract 和原生
构建工具；Windows 原生 PowerShell 也已支持。

## 3. 安装核心应用

请选一个能长期保留、空间足够的文件夹。不要放进系统保护目录、临时目录，或可能
被同步与清理工具自动删除的目录。

请先进入这个空目录，再执行一键安装命令。仓库会直接克隆到当前目录，
不会额外创建同名项目子目录。

### Linux、macOS 或 WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

核心安装脚本会：

- 复用兼容的 Git、Node.js 和 npm；
- 首次克隆到空目录，已有仓库则执行 `git pull --ff-only`；
- 只在 `.env` 不存在时创建它；
- 执行 `npm ci --prefer-offline --no-audit --no-fund` 和 `npm run build`；
- 在真实出错步骤立即停止，不会错误报告“安装完成”；
- 不删除 SQLite 数据库或 `uploads/` 媒体。

如果目标目录不是空目录且不是本项目，脚本会拒绝写入。

## 4. 启动与第一次使用

在项目目录运行：

```bash
npm run dev
```

然后打开：

- 应用：<http://localhost:5173>
- 后端健康检查：<http://localhost:3107/api/health>

普通网页应用和 API 默认只绑定 localhost。只有用户明确启用时，设备同步才会启动
独立、受限且需要设备凭据的监听器。不要把普通应用直接暴露到公网。

建议先手动创建第一张卡片。需要处理多个本地 MP4 时，从新建页进入“批量导入”。
复习时用 `Again` 或 `Good` 反馈，FSRS 会计算下次到期时间。

Android 安装、配对、局域网防火墙、Tailscale Serve 和 WSL mirrored 网络说明见
[Android 离线复习与同步](./ANDROID_SYNC.zh-CN.md)。

## 5. 更新

进入已安装的项目目录，运行：

```bash
git pull --ff-only
npm ci --prefer-offline --no-audit --no-fund
npm run build
npm run dev
```

PowerShell 使用同样的命令。也可以重新执行核心一键安装命令；脚本会保留 `.env`、
数据库和媒体。

## 6. 可选的本地 OCR 与语音识别

核心应用不依赖 OCR/STT。只有希望从本地媒体提取候选句子和单词时才需要安装：

- ffmpeg 提取音频和视频帧；
- Tesseract 识别图片或视频帧中的可见文字；
- whisper.cpp 配合 Whisper 模型识别语音。

### Linux、macOS 或 WSL 识别安装器

在项目目录运行：

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=eng+chi_sim bash
```

### Windows 识别安装器

英文 OCR：

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

英文和简体中文 OCR：

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Windows 脚本会先复用系统里可用的 FFmpeg；缺失时下载 BtbN 长期保留的 `latest`
Windows 构建，并使用发布页 SHA-256 清单校验。脚本还会配置 Tesseract 与所选
traineddata，下载并校验 whisper.cpp 和默认的 `ggml-small.bin`，最后把本地路径
写入 `.env`。工具放在 `tools/`，模型放在 `models/`；再次运行会复用校验通过的文件。

核心安装和本地识别安装刻意分成两步。Whisper 默认模型占数百 MB，更大的模型可能
需要数 GB 空间。

安装后在设置页点击 **我已安装，重新检测**。服务会重新读取 `.env`，通常不用手动
重启后端。

### 手动配置识别

自行安装工具后，在 `.env` 写入绝对路径：

```env
CVN_FFMPEG_PATH=/absolute/path/to/ffmpeg

CVN_STT_PROVIDER=whisper.cpp
CVN_WHISPER_CPP_PATH=/absolute/path/to/whisper-cli
CVN_WHISPER_CPP_MODEL=/absolute/path/to/ggml-small.bin
CVN_WHISPER_CPP_TIMEOUT_MS=120000

CVN_OCR_PROVIDER=tesseract
CVN_TESSERACT_PATH=/absolute/path/to/tesseract
CVN_TESSERACT_LANG=eng
CVN_TESSERACT_TIMEOUT_MS=30000
```

Windows 示例：

```env
CVN_FFMPEG_PATH=C:\Apps\context-vocabulary-notebook\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=C:\Apps\context-vocabulary-notebook\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=C:\Apps\context-vocabulary-notebook\models\ggml-small.bin
CVN_TESSERACT_PATH=C:\Apps\context-vocabulary-notebook\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```

常见 Tesseract 语言码有 `eng`、`chi_sim`、`jpn`、`kor`、`fra`、`deu`、
`spa`、`rus`；多语言用 `+` 连接。

## 7. 高级安装

### 指定安装目录

Linux、macOS 或 WSL：

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell：

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### 让核心安装器尝试安装可选系统工具

普通首次使用不需要这些开关：

```bash
export CVN_INSTALL_FFMPEG=1
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

安装器源码：

- [Linux/macOS/WSL](https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh)
- [Windows PowerShell](https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1)

### 手动安装

```bash
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci --prefer-offline --no-audit --no-fund
npm run dev
```

PowerShell 用 `Copy-Item .env.example .env` 代替 `cp`。

## 8. 配置参考

| 变量 | 默认值 | 用途 |
|---|---|---|
| `PORT` | `3107` | Express API 端口；Vite 把 `/api`、`/uploads` 代理到这里。 |
| `DATABASE_PATH` | `./data/context-vocabulary-notebook.sqlite` | SQLite 数据库路径。 |
| `UPLOADS_DIR` | `./uploads` | 上传媒体目录。 |
| `CLIENT_PORT` | `5173` | Vite 开发端口。 |
| `HOST` | `127.0.0.1` | 普通网页/API 绑定地址；只在明确理解风险时修改。 |
| `CVN_DEVICE_SYNC` | `1` | 启用只供 Tailscale Serve 使用的 localhost 上游。 |
| `SYNC_PORT` | `3108` | 只供 Tailscale Serve 代理的 HTTP 上游端口。 |
| `CVN_LAN_SYNC` | `0` | 局域网 HTTPS 的可选环境变量覆盖。 |
| `LAN_SYNC_PORT` | `3109` | 固定证书局域网 HTTPS 端口。 |
| `SYNC_IDENTITY_DIR` | `data/sync-identity` | PC 身份密钥/证书目录；ZIP 备份排除。 |
| `CVN_HOME` | 当前目录 | 安装目标目录。 |
| `CVN_INSTALL_FFMPEG` | `0` | 让核心安装器尝试安装 ffmpeg。 |
| `CVN_INSTALL_TESSERACT` | `0` | 让核心安装器尝试安装 Tesseract。 |
| `CVN_FFMPEG_PATH` | `ffmpeg` | ffmpeg 命令或绝对路径。 |
| `CVN_STT_PROVIDER` | `whisper.cpp` | 可设 `whisper.cpp` 或 `disabled`。 |
| `CVN_WHISPER_CPP_PATH` | `whisper-cli` | whisper.cpp 可执行文件。 |
| `CVN_WHISPER_CPP_MODEL` | 空 | 本地 STT 必需的模型路径。 |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | `120000` | 单次语音识别超时。 |
| `CVN_OCR_PROVIDER` | `tesseract` | 可设 `tesseract` 或 `disabled`。 |
| `CVN_TESSERACT_PATH` | `tesseract` | Tesseract 可执行文件。 |
| `CVN_TESSERACT_LANG` | 自动选择 | 如 `eng+chi_sim`。 |
| `CVN_TESSERACT_TIMEOUT_MS` | `30000` | 单次 OCR 超时。 |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | `0` | 本地失败后是否允许云端回退；默认关闭。 |
| `ALLOW_PRIVATE_AI_PROVIDER_URLS` | `false` | 是否允许可信的回环/私网 AI 地址；默认阻止。 |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | 服务端默认值 | 本地识别就绪检查超时。 |

必须在执行 `npm run dev` 前同时通过进程环境设置端口，确保 Express 与 Vite
代理读取同一个 API 端口：

```bash
PORT=3117 CLIENT_PORT=5174 npm run dev
```

```powershell
$env:PORT = "3117"
$env:CLIENT_PORT = "5174"
npm run dev
```

不要只在 `.env` 修改 `PORT`：Vite 在加载配置时就读取代理目标，早于该文件写入
`process.env`。

## 9. 数据、导出与备份

数据库、媒体和本地配置应一起备份：

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

恢复时把它们放回同一个项目目录再启动。
这个文件系统备份包含 `.env` 和 SQLite 数据库，因此可能包含 API Key，必须按
敏感文件保管。

应用内 ZIP 导出有两种：

- 完整个人备份：卡片、语境、媒体、标签、收藏、FSRS 状态、复习记录和设置；
- 纯卡片分享：不带个人复习进度、收藏和设置。

API Key 不会进入应用内 ZIP 导出；这个保证不适用于手动复制目录或上面的 `tar`
文件系统备份。

普通附件的强制单文件上限：视频 300 MB、音频 50 MB、图片 10 MB。批量导入和
卡片转写另有 100 MB 单文件硬上限。`uploads/` 会随着媒体增加而持续变大。

## 10. 可选 OpenAI-compatible AI

在设置里填写显示名称、Base URL、API Key 和模型。AI 不是必需功能，可建议语境
释义、用法、整句翻译、词形还原和拼写检查。DeepSeek 等 OpenAI-compatible 文本
模型不替代本地 OCR/STT：Tesseract 识别可见文字，whisper.cpp 识别语音。API Key
保存在本地、界面遮罩显示，并从应用内 ZIP 导出中排除。AI 建议会把请求文本发送
给配置的服务商，卡片云端转写会发送音频；开启
`CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` 后，本地片段识别失败还可能发送帧图或音频。

出于 SSRF 防护，默认拒绝回环地址和私网 Base URL。只有明确使用并信任 Ollama、
LM Studio 或私网网关时，才设置 `ALLOW_PRIVATE_AI_PROVIDER_URLS=true`。

## 11. 故障排查

### 安装器访问不了 GitHub

如果还没出现安装日志，`curl` 或 `irm` 就报 `SSL connection timeout`、
`connection refused` 或无法访问 `raw.githubusercontent.com`，说明脚本尚未开始。
先用浏览器测试 raw 链接，再检查本机代理。

WSL mirrored 网络通常能通过 `127.0.0.1` 访问 Windows 代理。如果 Clash/TUN
解析出 `198.18.x.x` fake IP，而 WSL 直连超时，可以显式测试本地 HTTP 代理：

```bash
curl -I -x http://127.0.0.1:7897 https://raw.githubusercontent.com/
```

端口以你的代理配置为准，不要写死临时 WSL 或 Windows 局域网 IP。请确保启动 Git、
npm 或安装器的同一个 shell 中，`HTTPS_PROXY`、`HTTP_PROXY` 与 `NO_PROXY` 一致。

### Node 或原生依赖安装失败

升级到 Node.js `20.19+` 或 `22.12+`。Windows 原生编译 `better-sqlite3` 可能需要
Python 和 Visual Studio Build Tools / MSVC，也可改用 WSL。Linux 上无关的损坏
apt 软件源必须先修复或禁用，安装器才能正常调用 `apt-get`。

### `git pull --ff-only` 拒绝更新

运行 `git status`，提交、暂存或处理本地修改。安装器不会覆盖本地修改或改写历史。

### 本地识别仍显示未配置

确认识别脚本已完成、`.env` 中对应 `CVN_*` 路径存在，并从同一个项目目录启动。
停止占用 `3107` 的旧进程，点击 **我已安装，重新检测**，必要时重启 `npm run dev`。

### 没有识别到句子

字幕不存在、过小或模糊时 OCR 无法恢复文字，此时需要 whisper.cpp 从清晰语音识别；
两者都没有时只能手动填写。`Audio extraction failed` 通常表示 ffmpeg 不可用、路径
错误，或源媒体无法被 ffmpeg 读取。

### Tesseract 或 Whisper 数据缺失

安装目标 Tesseract traineddata，并设置 `CVN_TESSERACT_LANG`。应用本身不内置
Whisper 模型；识别一键脚本会下载并配置默认 `ggml-small.bin`，手动配置则必须把
`CVN_WHISPER_CPP_MODEL` 指向模型绝对路径。

## 12. 开发命令

| 命令 | 用途 |
|---|---|
| `npm run dev` | 同时启动 Express 与 Vite。 |
| `npm run dev:client` | 在 `0.0.0.0:5173` 启动 Vite。 |
| `npm run dev:server` | 在所有网络接口的 `3107` 端口启动 Express。 |
| `npm run typecheck` | 检查前后端 TypeScript。 |
| `npm test` | 运行 Vitest。 |
| `npm run test:e2e` | 运行 Playwright 端到端测试。 |
| `npm run build` | 类型检查并构建前后端。 |
| `npm run readme:i18n:check` | 校验多语言 README 结构和事实。 |
| `npm run smoke:install` | 验证首次安装、更新与数据保留。 |

分发修改前请阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)、
[SECURITY.md](../SECURITY.md) 和 [MIT 许可证](../LICENSE)。
