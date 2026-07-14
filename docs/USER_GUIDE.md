# Context Vocabulary Notebook — User Guide

[English](./USER_GUIDE.md) | [简体中文](./USER_GUIDE.zh-CN.md)

This guide covers installation, updates, optional local recognition, configuration,
backup, and troubleshooting. For the product overview, see the
[main README](../README.md).

## 1. What you are installing

Context Vocabulary Notebook is a self-hosted local web application. The core app
runs on your computer and opens in a modern browser. It is not a hosted cloud
service and does not currently ship as a native desktop binary.

Core data stays in the project directory by default:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

The app supports `mp4` video, `mp3` audio, and `jpg`, `png`, or `webp` images.
Batch import accepts local MP4 clips; website video URLs are not supported.

## 2. Requirements

| Component | Requirement |
|---|---|
| Node.js | `20.19+` or `22.12+`; Node.js 22 LTS is recommended. |
| npm | Installed with Node.js; dependencies use `npm ci`. |
| Git | Required to clone and update the repository. |
| Browser | A current Chrome, Edge, Firefox, or Safari release. |
| Native build tools | Sometimes required because `better-sqlite3` is a native module. |
| ffmpeg | Optional; required for video/audio extraction and clip analysis. |
| Tesseract | Optional; required for local image/frame OCR. |
| whisper.cpp + model | Optional; required for local speech-to-text. |

WSL is generally the most predictable Windows environment for Node, Git, ffmpeg,
Tesseract, and native build tools. Native Windows PowerShell is also supported.

## 3. Core installation

Choose a durable folder with enough space for media and models. Avoid system
folders, temporary folders, and folders that a sync or cleanup tool may remove.

Change into that empty folder before running the one-line installer. The repository
is cloned directly into the current directory; no nested project folder is created.

### Linux, macOS, or WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

The core installers:

- reuse compatible Git, Node.js, and npm installations;
- clone into an empty target folder or update an existing checkout with
  `git pull --ff-only`;
- create `.env` only when it does not exist;
- run `npm ci --prefer-offline --no-audit --no-fund` and `npm run build`;
- stop at the failing step instead of reporting a false success;
- never delete the SQLite database or media under `uploads/`.

The script refuses to write into a non-empty folder that is not this project.

## 4. Start and first use

From the project directory, run:

```bash
npm run dev
```

Then open:

- App: <http://localhost:5173>
- Backend health check: <http://localhost:3107/api/health>

The development servers currently listen on all network interfaces, and the app
does not provide user authentication. Use the `localhost` URLs above, keep the
ports behind your firewall on untrusted networks, and do not expose them directly
to the public Internet.

Create a card manually first. Use the Batch Import entry on the Create page when
you want to process multiple local MP4 clips. Review due cards with `Again` or
`Good`; FSRS calculates the next due date.

## 5. Update

Run these commands from the installed project directory:

```bash
git pull --ff-only
npm ci --prefer-offline --no-audit --no-fund
npm run build
npm run dev
```

The same commands work in PowerShell. You may also rerun the one-click core
installer; it preserves `.env`, the database, and media.

## 6. Optional local OCR and speech recognition

The core application works without OCR/STT. Install recognition tools only when
you want candidate sentences and words extracted from local media.

- ffmpeg extracts audio and frames.
- Tesseract reads visible text in images or video frames.
- whisper.cpp and a Whisper model transcribe speech.

### Linux, macOS, or WSL recognition installer

Run from the project directory:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=eng bash
```

### Windows recognition installer

English OCR:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

English and Simplified Chinese OCR:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

The Windows installer first reuses a working system FFmpeg. If none is found, it
downloads BtbN's retained `latest` Windows build and verifies it against the
release SHA-256 manifest. It configures Tesseract and the selected traineddata,
downloads whisper.cpp plus the default `ggml-small.bin` model, verifies pinned
artifacts, and writes local paths into `.env`. Tools live under `tools/`; models
live under `models/`. Rerunning the script reuses valid files.

The core installer and recognition installer are deliberately separate. The
Whisper model is several hundred MB, and larger models may require several GB.

After installation, open Settings and click **I installed it, check again**. The
server reloads recognition paths from `.env`; a manual restart is usually not
needed.

### Manual recognition configuration

Install the tools yourself and add absolute paths to `.env`:

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

Windows example:

```env
CVN_FFMPEG_PATH=C:\Apps\context-vocabulary-notebook\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=C:\Apps\context-vocabulary-notebook\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=C:\Apps\context-vocabulary-notebook\models\ggml-small.bin
CVN_TESSERACT_PATH=C:\Apps\context-vocabulary-notebook\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```

Common Tesseract language codes include `eng`, `chi_sim`, `jpn`, `kor`, `fra`,
`deu`, `spa`, and `rus`. Join multiple codes with `+`.

## 7. Advanced installation

### Choose another installation directory

Linux, macOS, or WSL:

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### Let the core installer try optional system tools

These flags are not required for normal first-time use:

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

Installer source:

- [Linux/macOS/WSL installer](https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh)
- [Windows PowerShell installer](https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1)

### Manual installation

```bash
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci --prefer-offline --no-audit --no-fund
npm run dev
```

PowerShell uses `Copy-Item .env.example .env` instead of `cp`.

## 8. Configuration reference

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3107` | Express API port; Vite proxies `/api` and `/uploads` here. |
| `DATABASE_PATH` | `./data/context-vocabulary-notebook.sqlite` | SQLite database path. |
| `UPLOADS_DIR` | `./uploads` | Uploaded media directory. |
| `CLIENT_PORT` | `5173` | Vite development port. |
| `CVN_HOME` | Current directory | Installer target directory. |
| `CVN_INSTALL_FFMPEG` | `0` | Ask the core installer to try installing ffmpeg. |
| `CVN_INSTALL_TESSERACT` | `0` | Ask the core installer to try installing Tesseract. |
| `CVN_FFMPEG_PATH` | `ffmpeg` | ffmpeg executable or absolute path. |
| `CVN_STT_PROVIDER` | `whisper.cpp` | `whisper.cpp` or `disabled`. |
| `CVN_WHISPER_CPP_PATH` | `whisper-cli` | whisper.cpp executable. |
| `CVN_WHISPER_CPP_MODEL` | Empty | Required model path for local STT. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | `120000` | Per-transcription timeout. |
| `CVN_OCR_PROVIDER` | `tesseract` | `tesseract` or `disabled`. |
| `CVN_TESSERACT_PATH` | `tesseract` | Tesseract executable. |
| `CVN_TESSERACT_LANG` | Auto-selected | Language code such as `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | `30000` | Per-OCR timeout. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | `0` | Allow cloud fallback after local failure; off by default. |
| `ALLOW_PRIVATE_AI_PROVIDER_URLS` | `false` | Permit trusted loopback/private-network AI endpoints; blocked by default. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | Server default | Recognition readiness timeout. |

Set both ports in the process environment before `npm run dev` so the Express
server and Vite proxy read the same API port:

```bash
PORT=3108 CLIENT_PORT=5174 npm run dev
```

```powershell
$env:PORT = "3108"
$env:CLIENT_PORT = "5174"
npm run dev
```

Do not rely on changing only `PORT` in `.env`: Vite reads the proxy target while
loading its config, before that file is applied to `process.env`.

## 9. Data, export, and backup

Back up the database, media, and local configuration together:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Restore those items to the same project directory before starting the app.
This filesystem archive contains `.env` and the SQLite database, so it can include
API keys and must be stored as sensitive data.

The in-app ZIP export supports:

- a complete personal backup with cards, context, media, tags, favorites, FSRS
  state, review logs, and settings;
- a card-only share without personal review progress, favorites, or settings.

API keys are excluded from the app's ZIP exports. That guarantee does not apply
to filesystem copies or the `tar` backup above.

Enforced attachment limits are 300 MB for video, 50 MB for audio, and 10 MB for
images. Batch Import and card transcription use a separate 100 MB per-file hard
limit. The `uploads/` directory can grow quickly.

## 10. Optional OpenAI-compatible AI

Add a display name, Base URL, API key, and model in Settings. AI is optional and
can suggest contextual meaning, usage, sentence translation, lemma recovery, and
spelling corrections. DeepSeek and other OpenAI-compatible text models do not
replace local OCR/STT: Tesseract reads visible text and whisper.cpp transcribes
speech. AI suggestions send the requested text, and card cloud transcription
sends audio, to the configured provider. If
`CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1`, failed local clip recognition may also send
clip frames or audio. The API key is stored locally, masked in the UI, and excluded
from in-app ZIP exports.

For SSRF protection, loopback and private-network Base URLs are rejected by
default. Set `ALLOW_PRIVATE_AI_PROVIDER_URLS=true` only when you intentionally use
and trust a local provider such as Ollama/LM Studio or a private-network gateway.

## 11. Troubleshooting

### The installer cannot reach GitHub

If `curl` or `irm` reports `SSL connection timeout`, `connection refused`, or
cannot reach `raw.githubusercontent.com` before installer logs appear, the script
has not started. Test the raw URL in a browser and inspect the local proxy.

In WSL mirrored networking, a Windows proxy can normally be reached through
`127.0.0.1`. If Clash/TUN returns fake IPs such as `198.18.x.x` but direct WSL
connections time out, explicitly test the local HTTP proxy, for example:

```bash
curl -I -x http://127.0.0.1:7897 https://raw.githubusercontent.com/
```

Use the proxy port configured on your machine; do not hard-code a temporary WSL
or Windows LAN address. Ensure `HTTPS_PROXY`, `HTTP_PROXY`, and `NO_PROXY` are
consistent in the shell that launches Git, npm, or the installer.

### Node or native dependency failure

Upgrade to Node.js `20.19+` or `22.12+`. On native Windows, a source build of
`better-sqlite3` may require Python and Visual Studio Build Tools / MSVC. WSL is
an alternative. On Linux, unrelated broken apt repositories must be repaired or
disabled before the installer can use `apt-get`.

### `git pull --ff-only` refuses to update

Run `git status`. Commit, stash, or otherwise resolve local changes; the installer
does not overwrite them or rewrite history.

### Recognition remains “not configured”

Confirm the recognition installer completed and the expected `CVN_*` paths exist
in `.env`. Start the app from the same directory, stop any stale process using
port `3107`, click **I installed it, check again**, or restart `npm run dev`.

### No sentence is recognized

OCR cannot recover text that is absent, too small, or blurred. In that case,
whisper.cpp needs clear speech. If both sources are unavailable, enter the sentence
manually. `Audio extraction failed` normally means ffmpeg is unavailable, its path
is wrong, or it cannot read the source media.

### Tesseract or Whisper data is missing

Install the requested Tesseract traineddata and set `CVN_TESSERACT_LANG`. The app
does not embed a Whisper model. The recognition installers download and configure
the default `ggml-small.bin`; manual setups must set `CVN_WHISPER_CPP_MODEL` to an
absolute path.

## 12. Development commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Express and Vite together. |
| `npm run dev:client` | Start Vite on `0.0.0.0:5173`. |
| `npm run dev:server` | Start Express on all interfaces at port `3107`. |
| `npm run typecheck` | Check client and server TypeScript. |
| `npm test` | Run Vitest tests. |
| `npm run test:e2e` | Run Playwright end-to-end tests. |
| `npm run build` | Type-check and build client and server. |
| `npm run readme:i18n:check` | Validate translated README structure and facts. |
| `npm run smoke:install` | Exercise first install, update, and data preservation. |

See [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md), and the
[MIT license](../LICENSE) before distributing modifications.
