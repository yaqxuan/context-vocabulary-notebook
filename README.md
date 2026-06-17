[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook（语境单词本）

一个本地优先的语境单词本，帮助你从真实视频、音频、字幕和课程里积累词汇。

它不是让你背孤立单词，而是把单词出现时的原句、语境释义、截图、视频/音频片段、备注和标签一起保存。之后复习时，你看到的不只是一个词，而是当时真正遇到它的上下文。

适合：

- 看外语视频、课程、影视或听力材料时记录生词。
- 想要类似 Anki 的间隔复习，但希望卡片带有更丰富语境。
- 偏好本地数据、不想为了单词本注册云账号的学习者。

> 当前项目是本地 Web 应用。数据默认保存在你电脑上的 SQLite 数据库和 `uploads/` 文件夹里，不需要云账号。

## Demo

![Context Vocabulary Notebook 制卡示例](./docs/demo/01-create-card.png)

## 主要功能

- 围绕真实语境制卡：目标单词、当前语境释义、原句、备注、标签。
- 保存本地媒体附件：视频 `mp4`，音频 `mp3`，图片 `jpg / png / webp`。
- 本地剪辑分析：默认使用本机 whisper.cpp 做语音识别、Tesseract 做图片/视频帧 OCR，用来帮助识别原句。
- 批量剪辑导入：一次导入多个视频/音频/图片片段，逐条检查识别出的句子并制卡。
- 一个词义条目可关联多个语境实例，适合记录同一含义在不同材料里的用法。
- 使用 FSRS 间隔复习，让单词回到你遇到它的上下文里。
- 词义条目列表、搜索、标签筛选、收藏、统计。
- ZIP 导入导出：支持个人完整备份和仅卡片分享。
- V2 制卡页 AI 建议：可配置 OpenAI-compatible API，用于语境释义、用法说明、整句翻译、词形还原和拼写检查；API Key 只保存在本地。批量剪辑中的候选词默认由本地规则辅助生成；DeepSeek 等文本模型不承担 OCR/STT。

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
| ffmpeg | 视频/音频剪辑分析需要；核心安装不强制 | 从视频提取音频时使用。安装脚本会检查 ffmpeg；缺少 ffmpeg 不会阻止核心应用安装。设置 `CVN_INSTALL_FFMPEG=1` 可让安装脚本尝试补齐。 |
| Tesseract OCR | 本地 OCR 默认使用；核心安装不强制 | 识别图片或视频帧里的可见文字。安装脚本会检查 Tesseract；缺少时 readiness endpoint / UI 会提示。Linux/WSL/macOS 可设置 `CVN_INSTALL_TESSERACT=1` 让脚本尝试通过 apt/brew 安装；Windows 可尝试 winget 安装或手动安装。 |
| whisper.cpp + Whisper 模型 | 本地语音识别默认使用；核心安装不强制 | 识别音频或视频里的语音。安装脚本只提示状态，不会自动安装 whisper.cpp 或模型。需要手动下载模型并配置 `CVN_WHISPER_CPP_PATH`、`CVN_WHISPER_CPP_MODEL`。 |

安装脚本会先检查本机已有环境。Linux / WSL 只有在缺少 Git 或 Node.js/npm 时，才会尝试通过 `apt-get` 补齐依赖；如果基础环境已满足，会跳过 `apt-get`，避免触发系统里无关的第三方软件源问题。macOS 脚本会在缺少依赖时尝试使用 Homebrew。Windows 原生脚本会在缺少依赖时尝试使用 `winget`。如果这些包管理器不可用，或当前用户没有安装权限，需要手动安装缺失环境后重试。

### WSL / Windows 原生选择建议

- WSL 通常最稳：Node、Git、ffmpeg、Tesseract 和 native build tools 的安装路径更接近 Linux，遇到 `better-sqlite3` / `node-gyp` 编译问题时也更容易处理。
- Windows 原生 PowerShell 可以安装：脚本会复用已有 Git / Node.js / npm，缺少时才尝试 `winget`；如果 `npm ci` 在 `better-sqlite3` 处失败，需要按提示安装 Python 和 Visual Studio Build Tools / MSVC，或改用 WSL。
- OCR 后续可以配置成功：安装 ffmpeg、Tesseract 和目标语言 traineddata 后，在设置页点击“本地识别配置”重新检测即可。
- STT 需要单独安装 whisper.cpp，并手动下载 Whisper ggml 模型；一键安装脚本不会自动下载模型，避免默认安装过大、过慢或选错语言/精度。
- Windows 配好 ffmpeg / Tesseract / whisper.cpp 后，通常需要重新打开 PowerShell，再启动 `npm run dev`，让服务进程读到新的 PATH 和 `.env`。

## 安装前说明与免责声明

据作者当前认知，本项目自有源码不包含任何恶意代码。安装脚本会检查本机环境，并在受支持的平台上尝试安装缺失依赖，例如 Git、Node.js 和 npm；native build tools 缺失时会给出处理建议，部分平台需要用户手动安装。

项目安装会通过系统包管理器和 npm 获取第三方软件与依赖。安装和使用过程中仍可能受到系统权限、网络状态、包管理器可用性、杀毒软件、企业设备策略、磁盘空间、第三方依赖供应链、Node native module 编译结果等因素影响。用户运行安装脚本、安装依赖、修改系统环境、上传和保存本地文件所产生的问题与后果，由用户自行承担。

如果脚本无法自动补齐环境，会输出缺少的工具和建议处理方式；此时需要用户按自己的系统手动安装后再重试。

## 一键安装

### Linux / macOS / WSL

复制下面命令运行即可。脚本会把项目安装到当前目录：

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

脚本会自动检查 Git、Node.js/npm 等依赖；已安装的依赖会直接复用。Linux / WSL 如果基础依赖已满足，会跳过 `apt-get`。

如需让脚本尝试安装可选的 ffmpeg（用于从视频提取音频），先设置：

```bash
export CVN_INSTALL_FFMPEG=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

如需让脚本尝试安装可选的 Tesseract（用于本地 OCR；不会安装 whisper.cpp 或 Whisper 模型），先设置：

```bash
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

如需先查看脚本内容，可访问：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

高级用法：指定安装目录

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

先进入你想安装项目文件的空目录，再复制下面命令运行。脚本会把项目文件直接安装到当前目录，不会再创建下一层目录：

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

脚本会自动检查 Git、Node.js/npm 等依赖；已安装的依赖会直接复用。

如需让脚本尝试安装可选的 ffmpeg（用于从视频提取音频），先设置：

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

如需让脚本尝试安装可选的 Tesseract（用于本地 OCR；不会安装 whisper.cpp 或 Whisper 模型），先设置：

```powershell
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

如需先查看脚本内容，可访问：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

高级用法：指定安装目录

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### 遇到问题怎么办

- 如果提示命令不存在，请关闭终端后重新打开，再运行一次安装命令。
- Linux / WSL 如果 `apt-get update` 报 Docker、Chromium、Snap、GPG key 等错误，通常是系统已有 apt 源或未完成包配置异常，不是本项目依赖这些软件。可以先修复/禁用对应 apt 源，或手动安装 Git、Node.js 20+ 和 npm 后重试。
- macOS 如果弹出 Xcode Command Line Tools 安装窗口，请点击“安装”，完成后重新运行安装命令。
- Windows 如果提示需要安装编译环境，请按脚本提示继续；这是部分依赖编译时可能需要的环境。
- 如果剪辑分析提示 `Audio extraction failed`，通常表示本机缺少 ffmpeg 或 ffmpeg 不在 PATH 中。Linux / WSL 可尝试 `sudo apt-get update && sudo apt-get install -y ffmpeg`；macOS 可尝试 `brew install ffmpeg`；Windows 可尝试 `winget install Gyan.FFmpeg`，然后重新打开终端再重试。
- 如果本地 OCR/STT 显示不可用，先查看应用里的本地识别就绪检查；它会提示缺少 Tesseract、whisper.cpp 可执行文件、Whisper 模型路径或语言数据。

## 更新到最新版

如果你已经安装过，进入当初安装项目文件的目录后运行（把示例路径替换成你的实际安装目录）：

Linux / macOS / WSL / Git Bash：

```bash
cd "$HOME/context-vocabulary-notebook"
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows 原生 PowerShell：

```powershell
Set-Location "C:\path\to\context-vocabulary-notebook"
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
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows 原生 PowerShell：

```powershell
Set-Location $HOME
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
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

## 本地剪辑识别（OCR / STT）

剪辑分析默认走本机能力：

- 语音识别（STT）：`whisper.cpp`，用于从音频或视频音轨识别句子。
- OCR：`Tesseract`，用于从图片或视频帧里的可见文字识别句子。
- ffmpeg：用于从视频提取音频，供 whisper.cpp 分析。

这三类工具都是可选本地依赖：缺少它们不会阻止核心安装、手动制卡、复习或普通媒体上传；应用的 readiness endpoint / UI 会显示缺少哪些依赖。默认安装脚本保持轻量，只检查并提示状态，不会强制安装 Tesseract、whisper.cpp 或 Whisper 模型。

DeepSeek、OpenAI-compatible 文本模型等 AI 配置只用于候选词、语境释义、用法说明等文本建议；它们不能替代本地 OCR/STT。`CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` 仅表示允许在本地识别失败时使用已配置的云端转写回退，默认关闭。

### 平台安装示例

Linux / WSL（Debian / Ubuntu）：

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg tesseract-ocr
# 按目标语言安装 Tesseract 语言包，例如中文/日语/英语：
sudo apt-get install -y tesseract-ocr-chi-sim tesseract-ocr-jpn tesseract-ocr-eng

# whisper.cpp 需要手动安装；安装后把路径和模型写入 .env
CVN_WHISPER_CPP_PATH=/path/to/whisper-cli
CVN_WHISPER_CPP_MODEL=/path/to/ggml-base.bin
```

macOS：

```bash
brew install ffmpeg tesseract
# 通过 Homebrew 或源码安装 whisper.cpp 后配置：
CVN_WHISPER_CPP_PATH=/opt/homebrew/bin/whisper-cli
CVN_WHISPER_CPP_MODEL=/path/to/ggml-base.bin
```

Windows PowerShell：

```powershell
winget install --id Gyan.FFmpeg -e --source winget
winget install --id UB-Mannheim.TesseractOCR -e --source winget

# 安装 whisper.cpp 并下载模型后，在 .env 中配置，例如：
CVN_WHISPER_CPP_PATH=C:\tools\whisper.cpp\build\bin\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=C:\models\ggml-base.bin
```

安装后重新打开终端，再启动应用，确保服务进程能读到 PATH 和 `.env`。

### Whisper 模型选择

Whisper 模型需要用户自行下载并配置路径。常见权衡：

- `tiny` / `base`：体积小、速度快，适合普通电脑快速试用；噪声、口音或长句下准确率较低。
- `small` / `medium`：准确率更好，但占用更多磁盘、内存和 CPU/GPU 时间。
- `large`：准确率通常更高，但模型很大，普通电脑可能很慢，不适合作为默认安装内容。

因此安装脚本不会自动下载模型。请根据机器性能、目标语言和材料难度选择模型，然后设置 `CVN_WHISPER_CPP_MODEL`。

### Tesseract 语言包

Tesseract 必须安装对应语言数据才能识别目标语言。默认会按学习语言选择常见语言码，例如中文 `chi_sim`、英语 `eng`、日语 `jpn`、韩语 `kor`、法语 `fra`、德语 `deu`、西班牙语 `spa`、俄语 `rus`。

如果字幕或图片包含多种语言，可在 `.env` 中组合语言码：

```env
CVN_TESSERACT_LANG=eng+chi_sim
```

如果语言数据安装在非默认目录，请按 Tesseract 官方方式配置 `TESSDATA_PREFIX`，或使用系统安装器提供的默认目录。

### 相关环境变量

```env
CVN_STT_PROVIDER=whisper.cpp
CVN_WHISPER_CPP_PATH=whisper-cli
CVN_WHISPER_CPP_MODEL=/absolute/path/to/ggml-base.bin
CVN_WHISPER_CPP_TIMEOUT_MS=120000

CVN_OCR_PROVIDER=tesseract
CVN_TESSERACT_PATH=tesseract
CVN_TESSERACT_LANG=eng
CVN_TESSERACT_TIMEOUT_MS=30000

CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=0
CVN_LOCAL_READINESS_TIMEOUT_MS=5000
```

可将 `CVN_STT_PROVIDER=disabled` 或 `CVN_OCR_PROVIDER=disabled` 用于临时关闭本地语音识别或 OCR。

### 批量剪辑导入工作流

批量剪辑导入适合一次处理多个本地视频、音频或图片片段：

1. 上传或选择多个剪辑文件。
2. 应用先做本地识别：视频用 ffmpeg 提取音频后交给 whisper.cpp，图片/视频帧交给 Tesseract。
3. 在导入界面检查识别出的句子，必要时手动修正。
4. 选择目标单词，保存为带媒体、原句和语境释义的卡片。

本地识别只是辅助；没有可见字幕、音质较差、语言包缺失或模型过小都会影响结果，仍可手动填写原句。

## 环境变量

<!-- AUTO-GENERATED:ENV -->
| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 否 | `3107` | 后端 Express 服务端口。Vite 开发服务会把 `/api` 代理到该端口。 |
| `DATABASE_PATH` | 否 | `./data/context-vocabulary-notebook.sqlite` | SQLite 数据库路径。相对路径会按项目根目录解析。 |
| `UPLOADS_DIR` | 否 | `./uploads` | 上传媒体文件保存目录。相对路径会按项目根目录解析。 |
| `CVN_FFMPEG_PATH` | 否 | `ffmpeg` | ffmpeg 可执行文件路径；Windows 本地 tools 安装可填绝对路径。 |
| `CVN_STT_PROVIDER` | 否 | `whisper.cpp` | 本地语音识别提供方；可设为 `whisper.cpp` 或 `disabled`。 |
| `CVN_WHISPER_CPP_PATH` | 否 | `whisper-cli` | whisper.cpp 可执行文件路径；如果系统只有旧版 `main`，可填 `main` 或绝对路径。 |
| `CVN_WHISPER_CPP_MODEL` | 本地 STT 需要 | 空 | Whisper 模型文件路径；安装脚本不会自动下载模型。 |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | 否 | `120000` | whisper.cpp 单次识别超时时间。 |
| `CVN_OCR_PROVIDER` | 否 | `tesseract` | 本地 OCR 提供方；可设为 `tesseract` 或 `disabled`。 |
| `CVN_TESSERACT_PATH` | 否 | `tesseract` | Tesseract 可执行文件路径。 |
| `CVN_TESSERACT_LANG` | 否 | 按目标语言自动选择 | Tesseract 语言码，例如 `eng`、`chi_sim`、`eng+chi_sim`。 |
| `CVN_TESSERACT_TIMEOUT_MS` | 否 | `30000` | Tesseract 单次 OCR 超时时间。 |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | 否 | `0` | 本地剪辑识别失败时是否允许云端转写回退；默认关闭。 |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | 否 | 默认由服务端决定 | 本地识别 readiness 检查超时时间。 |
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
- AI 可用于制卡时建议语境释义、用法说明、整句翻译、词形还原和拼写检查，不是内置词典，也不是自动制卡。
- 批量剪辑中的候选词默认由本地规则辅助生成；DeepSeek 等 OpenAI-compatible 文本模型不负责本地 OCR/STT；图片文字识别依赖 Tesseract，语音识别依赖 whisper.cpp。

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
sudo apt-get update
sudo apt-get install -y build-essential python3 make g++
```

macOS：

```bash
xcode-select --install
```

Windows 原生环境需要可用的 Python 和 Visual Studio Build Tools / MSVC native build 环境。如果这些工具配置不熟，建议改用 WSL，或先手动安装缺失环境后重试。

### 剪辑里没有可见字幕，识别不到原句

如果视频画面里没有字幕或字幕很小/模糊，OCR 可能识别不到句子；这时依赖语音识别。请确认 ffmpeg、whisper.cpp 和 `CVN_WHISPER_CPP_MODEL` 可用。如果音频里也没有清晰语音，只能手动填写原句。

### 本地语音识别不可用

常见原因：

- 没有安装 whisper.cpp，或服务进程找不到 `whisper-cli` / `main`。
- `.env` 中没有配置 `CVN_WHISPER_CPP_MODEL`，或模型文件路径不存在。
- 模型太大导致超时，可调大 `CVN_WHISPER_CPP_TIMEOUT_MS`，或换用更小模型。
- 目标视频需要 ffmpeg 提取音频，但 ffmpeg 不在 PATH 中。

先查看应用中的本地识别 readiness 提示；如果可执行文件不在 PATH 中，请把 `CVN_WHISPER_CPP_PATH` 改成绝对路径。

### Tesseract 语言数据缺失

如果 OCR 报语言数据缺失，说明已找到 Tesseract，但没有安装对应 traineddata。请安装目标语言包，例如 Debian / Ubuntu 的 `tesseract-ocr-chi-sim`、`tesseract-ocr-jpn`、`tesseract-ocr-eng`，或将 `CVN_TESSERACT_LANG` 改成已安装语言。多语言可用 `eng+chi_sim`。

### Whisper 模型路径未配置

`CVN_WHISPER_CPP_MODEL` 没有默认模型。请下载 whisper.cpp 支持的 ggml 模型，并在 `.env` 中写入绝对路径。安装脚本不会自动下载模型，避免默认安装过大、过慢或选错语言/精度。

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

第一版坚持本地优先，不内置词库，不接词典，不做网站视频链接，不做同步。当前 V2 增加制卡时 AI 建议能力和本地剪辑识别辅助。

## 许可证

本项目使用 MIT License。详见 [`LICENSE`](./LICENSE)。
