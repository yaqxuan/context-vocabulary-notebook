[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

A local-first vocabulary notebook for learning words from real videos, audio, subtitles, and courses.

Instead of saving isolated words, it keeps the sentence, contextual meaning, screenshot, video/audio clip, notes, and tags from the moment you found the word. When you review later, you see the real context again, not only a word and a definition.

Good for:

- Recording new words while watching foreign-language videos, courses, films, or listening materials.
- Learners who want Anki-like spaced repetition with richer context on each card.
- People who prefer local data and do not want a cloud account for a vocabulary notebook.

> The current project is a local Web application. Data is saved by default in a SQLite database and the `uploads/` folder on your computer. No cloud account is required.

## Demo

![Context Vocabulary Notebook card creation demo](./docs/demo/01-create-card.png)

## Key Features

- Create cards around real contexts: target word, contextual definition, original sentence, notes, tags.
- Save local media attachments: video `mp4`, audio `mp3`, image `jpg / png / webp`.
- Local clip analysis: uses whisper.cpp for speech recognition and Tesseract for image/video-frame OCR by default to help recover original sentences.
- Batch clip import: import multiple video/audio/image clips, review detected sentences, then create cards one by one.
- Link one meaning entry to multiple context instances, useful for recording the same meaning across different materials.
- Review with FSRS spaced repetition, bringing each word back to the context where you met it.
- Meaning entry list, search, tag filtering, favorites, statistics.
- ZIP import and export for full personal backup and card-only sharing.
- V2 card creation page AI suggestions: configure an OpenAI-compatible API for contextual definitions, usage notes, sentence translation, lemmatization, and spelling checks; the API Key is saved locally only. Batch clip target-word candidates are generated locally by default; text models such as DeepSeek do not perform OCR/STT.

## Data Location and Disk Space Warning

The application saves data in the running directory by default. After uploading videos, screenshots, and audio, the `uploads/` directory may grow continuously and occupy significant disk space.

Default local data:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

It is not recommended to run the app in these locations:

- Directories that typically require `sudo` or root permissions, such as `/usr/local`, `/opt`.
- System protected directories like `C:\Program Files`.
- Temporary directories, download cache directories, or locations that will be automatically deleted by the system or cleaning tools.
- Locations with very little space, unclear synchronization rules, or where files might be automatically cleaned up or quota-limited by cloud drives.

## Runtime Environment

| Environment | Requirement | Description |
|------|------|------|
| Node.js | Recommended Node.js 22 LTS; at least a Node version meeting current Vite requirements | Frontend build, dev server, and backend server all depend on Node.js. The install script will try to fulfill this. |
| npm | Installed along with Node.js | The repository contains `package-lock.json`, use `npm ci` to install dependencies. |
| Git | Required for cloning the GitHub repository | The install script will check and try to fulfill this. |
| Browser | Modern browsers like Chrome / Edge / Firefox / Safari | The application is used via local Web pages. |
| C/C++ Build Tools | May be required | `better-sqlite3` is a native module; if there is no precompiled package available for the current system and Node version, `npm ci` will attempt local compilation. |
| ffmpeg | Required for video/audio clip analysis; not required for core install | Used to extract audio from videos. The installer checks ffmpeg; missing ffmpeg does not block the core app install. Set `CVN_INSTALL_FFMPEG=1` to let the installer try to install it. |
| Tesseract OCR | Local OCR default; not required for core install | Recognizes visible text in images or video frames. The installer checks Tesseract; missing Tesseract is reported by the readiness endpoint / UI. Linux/WSL/macOS can set `CVN_INSTALL_TESSERACT=1` to let the script try apt/brew installation; Windows can use winget or manual install. |
| whisper.cpp + Whisper model | Local STT default; not required for core install | Recognizes speech in audio/video. The installer only reports status; it does not install whisper.cpp or download models. Configure `CVN_WHISPER_CPP_PATH` and `CVN_WHISPER_CPP_MODEL` manually. |

The installation script will first check the existing environment on the local machine. On Linux / WSL, it will only attempt to fulfill dependencies via `apt-get` if Git or Node.js/npm are missing; if basic environments are met, it will skip `apt-get` to avoid triggering irrelevant third-party software source issues in the system. The macOS script will try to use Homebrew when dependencies are missing. The Windows native script will try to use `winget` when dependencies are missing. If these package managers are not available, or the current user does not have installation permissions, you need to manually install the missing environments and try again.

### WSL / Native Windows Recommendation

- WSL is usually the safest path: Node, Git, ffmpeg, Tesseract, and native build tools behave closer to Linux, and `better-sqlite3` / `node-gyp` failures are easier to fix.
- Native Windows PowerShell can install the app: the script reuses existing Git / Node.js / npm and only tries `winget` when they are missing. If `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.
- OCR can be configured after install: install ffmpeg, Tesseract, and target-language traineddata, then use the Settings page local recognition panel to re-check readiness.
- STT requires installing whisper.cpp separately and downloading a Whisper ggml model manually. The one-click installer does not download models automatically, avoiding a large, slow, or wrong default install.
- On Windows, after installing ffmpeg / Tesseract / whisper.cpp, reopen PowerShell before running `npm run dev` so the service process can read the new PATH and `.env`.

## Pre-installation Notes and Disclaimer

To the best of the author's current knowledge, this project's own source code does not contain any malicious code. The installation script will check the local environment and attempt to install missing dependencies such as Git, Node.js, and npm on supported platforms; when native build tools are missing, it prints guidance, and some platforms require manual installation.

The project installation will fetch third-party software and dependencies via system package managers and npm. The installation and usage process may still be affected by factors such as system permissions, network status, package manager availability, antivirus software, corporate device policies, disk space, third-party dependency supply chains, and Node native module compilation results. Users are solely responsible for any issues and consequences arising from running the installation script, installing dependencies, modifying the system environment, and uploading and saving local files.

If the script cannot automatically fulfill the environment, it will output the missing tools and suggested handling methods; at this point, users need to manually install them according to their own systems before retrying.

## One-Click Installation

### Linux / macOS / WSL

Copy and run the following command. The script will install the project to the current directory:

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

The script will automatically check for dependencies like Git, Node.js/npm; installed dependencies will be directly reused. For Linux / WSL, if basic dependencies are met, it will skip `apt-get`.

To let the script try to install optional ffmpeg for video/audio clip analysis, set this first:

```bash
export CVN_INSTALL_FFMPEG=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

To let the script try to install optional Tesseract for local OCR (it will not install whisper.cpp or Whisper models), set this first:

```bash
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

To view the script content first, visit:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Advanced usage: Specify the installation directory

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

First, enter an empty directory where you want to install the project files, then copy and run the following command. The script will install the project files directly to the current directory without creating another nested directory:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

The script will automatically check for dependencies like Git, Node.js/npm; installed dependencies will be directly reused.

To let the script try to install optional ffmpeg for video/audio clip analysis, set this first:

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

To let the script try to install optional Tesseract for local OCR (it will not install whisper.cpp or Whisper models), set this first:

```powershell
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

To view the script content first, visit:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Advanced usage: Specify the installation directory

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Troubleshooting

- If it says the command does not exist, close the terminal, reopen it, and run the installation command again.
- For Linux / WSL, if `apt-get update` reports errors like Docker, Chromium, Snap, GPG keys, etc., it is usually due to existing apt sources or incomplete package configurations in the system, not because this project depends on these software. You can fix/disable the corresponding apt sources first, or manually install Git, Node.js 20+ and npm, then retry.
- For macOS, if the Xcode Command Line Tools installation window pops up, click "Install", and after it completes, re-run the installation command.
- For Windows, if it prompts that a compilation environment needs to be installed, please continue as prompted; this is an environment that may be needed during the compilation of some dependencies.
- If clip analysis shows `Audio extraction failed`, ffmpeg is usually missing or not on PATH. On Linux / WSL, try `sudo apt-get update && sudo apt-get install -y ffmpeg`; on macOS, try `brew install ffmpeg`; on Windows, try `winget install Gyan.FFmpeg`, then reopen the terminal and retry.
- If local OCR/STT is unavailable, check the in-app local recognition readiness panel; it reports missing Tesseract, whisper.cpp executable, Whisper model path, or language data.

## Update to Latest Version

If you have already installed it, enter the project directory and run:

Linux / macOS / WSL / Git Bash:

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows native PowerShell:

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

You can also re-run the one-click installation command. When the script finds an existing Git repository in the installation directory, it will automatically execute `git pull --ff-only`, `npm ci`, and `npm run build`.

If you re-run the one-click installation command inside the project directory, the script will update the current project directory and will not create another nested directory of the same name. If running outside the project, please enter an empty directory first, or explicitly set the same `CVN_HOME`; the script will not mix project files into a non-empty regular directory.

## Manual Installation

If the one-click script cannot fulfill the environment, you can manually install Node.js 22 LTS, npm, Git, and potentially required native build tools first, then execute the following commands.

Linux / macOS / WSL / Git Bash:

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows native PowerShell:

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Open in browser:

```text
http://localhost:5173
```

Default backend address:

```text
http://localhost:3107
```

## Local Clip Recognition (OCR / STT)

Clip analysis uses local tools by default:

- Speech recognition (STT): `whisper.cpp`, used to transcribe speech from audio or video tracks.
- OCR: `Tesseract`, used to recognize visible text in images or video frames.
- ffmpeg: used to extract audio from videos before whisper.cpp analysis.

These tools are optional local dependencies. Missing tools do not block core install, manual card creation, review, or normal media upload; the readiness endpoint / UI reports what is missing. The default installer stays lightweight: it checks and reports status, but does not force-install Tesseract, whisper.cpp, or Whisper models.

DeepSeek, OpenAI-compatible text models, and other AI settings are only used for target-card text suggestions such as contextual definitions, usage notes, sentence translation, lemmatization, and spelling checks. They do not replace local OCR/STT. `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` only allows configured cloud transcription/vision fallback when local recognition fails, and is disabled by default.

### Platform setup examples

Linux / WSL (Debian / Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg tesseract-ocr
# Install Tesseract language packs for target languages, for example Chinese/Japanese/English:
sudo apt-get install -y tesseract-ocr-chi-sim tesseract-ocr-jpn tesseract-ocr-eng

# Install whisper.cpp manually, then write paths into .env:
CVN_WHISPER_CPP_PATH=/path/to/whisper-cli
CVN_WHISPER_CPP_MODEL=/path/to/ggml-base.bin
```

macOS:

```bash
brew install ffmpeg tesseract
# After installing whisper.cpp via Homebrew or from source:
CVN_WHISPER_CPP_PATH=/opt/homebrew/bin/whisper-cli
CVN_WHISPER_CPP_MODEL=/path/to/ggml-base.bin
```

Windows PowerShell:

```powershell
winget install --id Gyan.FFmpeg -e --source winget
winget install --id UB-Mannheim.TesseractOCR -e --source winget

# After installing whisper.cpp and downloading a model, configure .env, for example:
CVN_WHISPER_CPP_PATH=C:\tools\whisper.cpp\build\bin\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=C:\models\ggml-base.bin
```

After installing tools, reopen the terminal before starting the app so the service process can read PATH and `.env`.

### Whisper model choice

Whisper models are downloaded and configured by the user. Common trade-offs:

- `tiny` / `base`: small and fast; lower accuracy with noise, accents, or long sentences.
- `small` / `medium`: better accuracy, but uses more disk, memory, and CPU/GPU time.
- `large`: often more accurate, but very large and slow on ordinary computers.

The installer does not download a model automatically. Choose based on your machine, target language, and media difficulty, then set `CVN_WHISPER_CPP_MODEL`.

### Tesseract language packs

Tesseract needs matching language data. Defaults follow the learning language, for example Chinese `chi_sim`, English `eng`, Japanese `jpn`, Korean `kor`, French `fra`, German `deu`, Spanish `spa`, and Russian `rus`.

For mixed-language subtitles or images, combine language codes in `.env`:

```env
CVN_TESSERACT_LANG=eng+chi_sim
```

If language data is installed outside the default directory, configure `TESSDATA_PREFIX` as documented by Tesseract, or use the default path from your system installer.

### Batch clip import workflow

Batch clip import can process multiple local video, audio, or image clips:

1. Upload or select multiple clip files.
2. The app runs local recognition: ffmpeg extracts video audio for whisper.cpp; Tesseract handles images/video frames.
3. Review detected sentences in the import UI and edit them if needed.
4. Select target words and save cards with media, original sentences, and contextual meanings.

Local recognition is only assistance. Missing visible subtitles, poor audio, missing language packs, or too-small models can reduce accuracy; you can always fill the sentence manually.

## Environment Variables

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | No | `3107` | Backend Express server port. Vite dev server proxies `/api` to this port. |
| `DATABASE_PATH` | No | `./data/context-vocabulary-notebook.sqlite` | SQLite database path. Relative paths are resolved against the project root. |
| `UPLOADS_DIR` | No | `./uploads` | Upload media files save directory. Relative paths are resolved against the project root. |
| `CVN_STT_PROVIDER` | No | `whisper.cpp` | Local speech recognition provider; use `whisper.cpp` or `disabled`. |
| `CVN_WHISPER_CPP_PATH` | No | `whisper-cli` | whisper.cpp executable path; if your system only has the old `main`, use `main` or an absolute path. |
| `CVN_WHISPER_CPP_MODEL` | Required for local STT | Empty | Whisper model file path; the installer does not download models. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | No | `120000` | Per-run whisper.cpp timeout. |
| `CVN_OCR_PROVIDER` | No | `tesseract` | Local OCR provider; use `tesseract` or `disabled`. |
| `CVN_TESSERACT_PATH` | No | `tesseract` | Tesseract executable path. |
| `CVN_TESSERACT_LANG` | No | Auto-selected by target language | Tesseract language code, for example `eng`, `chi_sim`, or `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | No | `30000` | Per-run Tesseract OCR timeout. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | No | `0` | Whether to allow configured cloud fallback when local clip recognition fails; disabled by default. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | No | Server default | Local recognition readiness check timeout. |
<!-- /AUTO-GENERATED:ENV -->

To change the frontend port during development, you can set `CLIENT_PORT` when running the command, defaults to `5173`. This variable is not in `.env.example` and usually doesn't need to be configured.

## Common Commands

<!-- AUTO-GENERATED:SCRIPTS -->
| Command | Description |
|------|------|
| `npm run dev` | Starts both backend dev server and Vite frontend dev server. |
| `npm run dev:client` | Starts only Vite frontend dev server, listens to `0.0.0.0:5173` by default. |
| `npm run dev:server` | Starts only backend Express dev server, listens to `localhost:3107` by default. |
| `npm run build` | Runs typecheck first, then builds frontend and backend. |
| `npm test` | Runs Vitest unit / integration tests. |
| `npm run test:e2e` | Runs Playwright E2E tests; passes even with no test files. |
| `npm run typecheck` | Runs TypeScript type checking for frontend and Node sides. |
| `npm run lint` | Currently equivalent to `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Data and Backup

Default data is inside the project directory:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

It is recommended to save them together when backing up:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

To restore, put these files back into the same project directory and start the application.

In-app ZIP import/export is also provided:

- Full backup: includes cards, contexts, media, tags, favorites, review status, FSRS status, review logs, and user settings.
- Pure card sharing: does not include personal review progress, favorite status, or user settings.

The AI API Key is a local sensitive configuration and will not be carried with the exported file; it needs to be filled in again after changing devices.

## Media File Recommendations

| Type | Supported Formats | Recommended Size |
|------|----------|----------|
| Video | `mp4` | Under 300MB per file |
| Audio | `mp3` | Under 50MB per file |
| Image | `jpg` / `png` / `webp` | Under 10MB per file |

## AI Suggestion Configuration

The card creation page supports optional AI suggestions. You need to add OpenAI-compatible API configurations in the settings page:

- Display Name
- Base URL
- API Key
- Model

Note:

- Manual card creation and review work perfectly fine without configuring AI.
- The API Key is stored in the local database and will be masked on the UI.
- The API Key will not be included in exported files.
- AI is used during card creation for contextual definitions, usage notes, sentence translation, lemmatization, and spelling checks. It is not a built-in dictionary, nor does it create cards automatically.
- Batch clip target-word candidates are generated locally by default; DeepSeek and other OpenAI-compatible text models do not perform local OCR/STT. Image text recognition depends on Tesseract, and speech recognition depends on whisper.cpp.

## FAQ

### Port is occupied

Modify `.env`:

```env
PORT=3108
```

If the frontend port `5173` is occupied:

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci fails at better-sqlite3

Prefer using Node.js 22 LTS. `better-sqlite3` is a native module; if there is no precompiled package available for the current system and Node version, it will attempt local compilation during installation.

Linux / WSL:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS:

```bash
xcode-select --install
```

The Windows native environment requires available Python and Visual Studio Build Tools / MSVC native build environments. If you are not familiar with configuring these tools, it is recommended to use WSL instead, or manually install the missing environments first and try again.

### Clip has no visible subtitles, so no sentence is detected

If the video has no subtitles, or subtitles are too small/blurry, OCR may not detect a sentence. In that case, speech recognition is needed. Confirm ffmpeg, whisper.cpp, and `CVN_WHISPER_CPP_MODEL` are available. If audio is also unclear, fill the sentence manually.

### Local speech recognition is unavailable

Common causes:

- whisper.cpp is not installed, or the service process cannot find `whisper-cli` / `main`.
- `.env` does not configure `CVN_WHISPER_CPP_MODEL`, or the model path does not exist.
- The model is too large and times out; increase `CVN_WHISPER_CPP_TIMEOUT_MS` or use a smaller model.
- Video needs ffmpeg for audio extraction, but ffmpeg is not on PATH.

Check the app's local recognition readiness panel first. If the executable is not on PATH, set `CVN_WHISPER_CPP_PATH` to an absolute path.

### Tesseract language data is missing

If OCR reports missing language data, Tesseract was found but the matching traineddata file is missing. Install the target language package, for example Debian / Ubuntu packages `tesseract-ocr-chi-sim`, `tesseract-ocr-jpn`, or `tesseract-ocr-eng`, or set `CVN_TESSERACT_LANG` to an installed language. Use `eng+chi_sim` for multiple languages.

### Whisper model path is not configured

`CVN_WHISPER_CPP_MODEL` has no default model. Download a ggml model supported by whisper.cpp and write its absolute path into `.env`. The installer does not download models automatically to avoid a large, slow, or wrong default install.

### Page opens, but API requests fail

Confirm the backend is running:

```text
http://localhost:3107/api/health
```

Normal response:

```json
{"ok":true}
```

### Want to change installation directory

Just move the entire project directory. If `.env` uses relative paths, the database and uploads directory will continue to be resolved relative to the new directory. If `.env` uses absolute paths, they need to be updated synchronously.

## Development Notes

Tech stack for this project:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

The first version adheres to local-first, no built-in dictionaries, no dictionary connections, no website video links, and no synchronization. The current V2 adds AI suggestion capabilities during card creation plus local clip recognition assistance.

## License

This project uses the MIT License. See [`LICENSE`](./LICENSE) for details.
