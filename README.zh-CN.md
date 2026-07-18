[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [한국어](./README.ko.md) | [Русский](./README.ru.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook（语境单词本）

把真正遇见生词时的原句、图片、音频和视频一起保存，建立属于自己的语境词汇库。

[![MIT 许可证](https://img.shields.io/badge/license-MIT-d6b66b.svg)](./LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22_LTS-65b687.svg)](https://nodejs.org/)
[![本地优先](https://img.shields.io/badge/data-local--first-4ebcf2.svg)](#隐私与数据)

<!-- README:OVERVIEW -->
## 在真实语境中记住单词

语境单词本是一个自托管、本地优先的学习应用。每张卡片把目标词、当前语境释义、
原句、标签、备注和可选媒体放在一起；FSRS 安排复习，你只需选择 `Again` 或 `Good`。

它不是预置词典、云同步服务或原生桌面软件，而是用浏览器访问、供你积累自己遇到
的词汇的本地 Web 应用。

<!-- README:PREVIEW -->
## 界面预览

![当前中文界面的新建语境卡片页](./docs/demo/01-create-card-zh.png)

更多当前界面：[卡片详情](./docs/demo/screen-card-detail.jpg)、
[复习](./docs/demo/screen-review.jpg)和[统计](./docs/demo/screen-statistics.jpg)。

<!-- README:WORKFLOW -->
## 一条简单的学习闭环

1. **记录**遇到的原句、目标单词和当前语境释义。
2. **补充语境**：附加 `mp4`、`mp3`、`jpg`、`png` 或 `webp` 文件。
3. **整理**：使用标签、收藏、备注、搜索和状态筛选。
4. **复习**：用 `Again / Good` 反馈，FSRS 计算下一次间隔。
5. **回顾**：查看复习数量、正确率、标签分布和评分趋势。

“批量导入”可以处理多个**本地 MP4 片段**，并让你逐条确认识别结果后再保存；
它不支持视频网站链接。

<!-- README:FEATURES -->
## 当前功能

| 模块 | 已有能力 |
|---|---|
| 语境卡片 | 原句、语境释义、备注、标签和多个语境实例。 |
| 媒体 | 本地 `mp4`、`mp3`、`jpg`、`png`、`webp` 附件。 |
| 复习 | FSRS 调度、`Again / Good`、`重来`后的 10 分钟冷却、每日进度和媒体回放。 |
| 词库 | 搜索、筛选、收藏、标签、详情编辑和熟记状态。 |
| 统计 | 复习数量、正确率、月份汇总、标签与评分趋势。 |
| 迁移 | 用 ZIP 完整备份个人数据，或分享纯卡片。 |
| Android 离线复习 | 一台配对 Android 设备、加密本地副本、自动选择已验证的局域网 HTTPS 或 Tailscale、离线图片/音频/视频复习、收藏和标记熟记。 |
| 本地识别 | 可选 ffmpeg、Tesseract OCR 和 whisper.cpp STT。 |
| AI 辅助 | 可选 OpenAI-compatible 释义、用法、翻译、词形和拼写建议。 |

正式签名发布前测试 Android 时，请从对应的 GitHub Actions 运行页面下载
`cvn-android-...` artifact 并解压，使用随附的 `app-debug.apk.sha256` 校验
`app-debug.apk`，然后**只把 `app-debug.apk` 发到手机**安装；校验文件留在电脑即可。
具体命令和 Debug APK 安全提示见
[Android 安装与同步指南](./docs/ANDROID_SYNC.zh-CN.md)。

在 PC 打开 **设置 → Android 离线同步**，点击 **自动设置手机同步** 即可。若首次
需要 Windows/WSL 防火墙权限或 Tailscale 授权，页面会给出一次性确认步骤；应用
不会启用 Funnel。

<!-- README:QUICKSTART -->
## 快速开始

需要 Git、npm，以及 Node.js `20.19+` 或 `22.12+`（推荐 Node.js 22 LTS）。

请先进入准备安装的空目录，再执行安装命令。项目会直接安装到当前目录，
不会在里面继续新建 `context-vocabulary-notebook` 子目录。

### 1. 安装核心应用

Linux、macOS 或 WSL：

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### 2. 启动

```bash
npm run dev
```

打开 <http://localhost:5173>。后端健康检查是
<http://localhost:3107/api/health>。

### 3. 制卡与复习

先手动创建一张卡片，再进入复习并选择 `Again` 或 `Good`。OCR、语音识别和 AI
都是可选能力，不是学习闭环的前置条件。

<!-- README:OPTIONAL -->
## 可选的识别与 AI

本地片段识别可以用 ffmpeg 提取媒体、Tesseract 识别可见文字、whisper.cpp 配合
Whisper 模型识别语音。识别安装器会下载并配置默认模型；因为模型较大，它与核心
应用安装刻意分成两步。

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=eng+chi_sim bash
```

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

AI 建议使用你自己配置的 OpenAI-compatible 服务和模型。本地 OCR/STT 不依赖 AI，
手动制卡也不依赖这两者。

<!-- README:PRIVACY -->
## 隐私与数据

默认情况下，SQLite 数据库、媒体和环境配置都留在安装目录：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

本项目不提供厂商云同步。可选 Android 设备同步仍然完全自托管：PC 是权威端，不使用厂商云保存副本。手动操作和本地 OCR/STT 不会把内容发出电脑。配置网络 AI
服务后，请求 AI 建议会发送文本，卡片云端转写会发送音频；只有显式开启
`CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` 时，本地识别失败后才可能发送片段帧图或音频。
API Key 保存在本地，并从应用内 ZIP 导出中排除。

<!-- README:DOCS -->
## 文档

- [完整中文用户手册](./docs/USER_GUIDE.zh-CN.md)
- [English user guide](./docs/USER_GUIDE.md)
- [Android 离线复习与同步](./docs/ANDROID_SYNC.zh-CN.md)
- [Android offline review and sync](./docs/ANDROID_SYNC.md)
- [贡献指南](./CONTRIBUTING.md)
- [安全政策](./SECURITY.md)
- [行为准则](./CODE_OF_CONDUCT.md)

用户手册包含更新、Windows/WSL、本地 OCR/STT、环境变量、备份、故障排查和手动
安装等详细说明。

<!-- README:STATUS -->
## 项目状态

项目仍处于早期预发布阶段，面向本地自托管使用；接口和数据处理细节仍可能变化。
升级或测试重大改动前，请备份 `data/`、`uploads/` 和 `.env`。

当前界面语言：简体中文、英语、日语、韩语、法语、德语、西班牙语和俄语。

<!-- README:CONTRIBUTING -->
## 参与贡献

欢迎提交错误报告、聚焦的功能建议、翻译和经过测试的 PR。请先阅读
[CONTRIBUTING.md](./CONTRIBUTING.md)，不要在报告中附上私人词汇、媒体、数据库或
API Key。

<!-- README:LICENSE -->
## 许可证

[MIT](./LICENSE)
