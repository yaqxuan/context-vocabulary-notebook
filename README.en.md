[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

A local-first, lightweight context vocabulary review tool. It is suitable for recording new words, original sentences, local video clips, screenshots, audio, and tags while watching foreign language videos, and then scheduling reviews using the FSRS algorithm.

> The current project is a local Web application. Data is saved by default in a SQLite database and the `uploads/` folder on your computer. No cloud account is required.

## Key Features

- Create cards around real contexts: target word, contextual definition, original sentence, notes, tags.
- A single meaning entry can be associated with multiple context instances, perfect for recording usages of the same meaning in different videos.
- Local media attachments: video `mp4`, audio `mp3`, image `jpg / png / webp`.
- FSRS spaced repetition: only `Again` / `Good` rating buttons are kept.
- Meaning entry list, search, tag filtering, favorites, statistics.
- ZIP import and export: supports full personal backup and pure card sharing.
- V2 card creation page AI suggestions: an OpenAI-compatible API can be configured for suggesting contextual definitions and usage notes; the API Key is only saved locally.

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
| ffmpeg | Required for video transcription; not required for core install | Used to extract audio from videos. The installer checks ffmpeg; missing ffmpeg does not block the core app install. Set `CVN_INSTALL_FFMPEG=1` to let the installer try to install it. |

The installation script will first check the existing environment on the local machine. On Linux / WSL, it will only attempt to fulfill dependencies via `apt-get` if Git or Node.js/npm are missing; if basic environments are met, it will skip `apt-get` to avoid triggering irrelevant third-party software source issues in the system. The macOS script will try to use Homebrew when dependencies are missing. The Windows native script will try to use `winget` when dependencies are missing. If these package managers are not available, or the current user does not have installation permissions, you need to manually install the missing environments and try again.

## Pre-installation Notes and Disclaimer

To the best of the author's current knowledge, this project's own source code does not contain any malicious code. The installation script will check the local environment and attempt to install missing dependencies such as Git, Node.js, npm, and native build tools on supported platforms.

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

To let the script try to install optional ffmpeg for video transcription, set this first:

```bash
export CVN_INSTALL_FFMPEG=1
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

To let the script try to install optional ffmpeg for video transcription, set this first:

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
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
- If video transcription shows `Audio extraction failed`, ffmpeg is usually missing or not on PATH. On Linux / WSL, try `sudo apt-get update && sudo apt-get install -y ffmpeg`; on macOS, try `brew install ffmpeg`; on Windows, try `winget install Gyan.FFmpeg`, then reopen the terminal and retry.

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

## Video Transcription Prerequisites

Video transcription requires all of the following:

- Local `ffmpeg` is installed and visible on PATH to the terminal/server process.
- An OpenAI-compatible `/audio/transcriptions` provider and model are configured and reachable.
- The uploaded file is within the transcription size limit: `TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES` is currently 100MB; the media-library video attachment limit is 300MB.

Missing ffmpeg only affects video audio extraction and video transcription. It does not affect core install, card creation, review, or normal media upload. The installer checks ffmpeg and, by default, does not block the core install when ffmpeg is missing. Set `CVN_INSTALL_FFMPEG=1` to opt in to installer-managed ffmpeg installation.

## Environment Variables

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | No | `3107` | Backend Express server port. Vite dev server proxies `/api` to this port. |
| `DATABASE_PATH` | No | `./data/context-vocabulary-notebook.sqlite` | SQLite database path. Relative paths are resolved against the project root. |
| `UPLOADS_DIR` | No | `./uploads` | Upload media files save directory. Relative paths are resolved against the project root. |
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
- AI is only used to suggest contextual definitions and usage notes during card creation. It is not a built-in dictionary, nor does it create cards automatically.

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

The first version adheres to local-first, no built-in dictionaries, no dictionary connections, no website video links, and no synchronization. The current V2 only adds AI suggestion capabilities during card creation.

## License

This project uses the MIT License. See [`LICENSE`](./LICENSE) for details.
