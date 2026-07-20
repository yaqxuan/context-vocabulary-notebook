[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [한국어](./README.ko.md) | [Русский](./README.ru.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Build a personal vocabulary library from the sentences, images, audio, and video
where you actually met each word.

[![MIT License](https://img.shields.io/badge/license-MIT-d6b66b.svg)](./LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22_LTS-65b687.svg)](https://nodejs.org/)
[![Local first](https://img.shields.io/badge/data-local--first-4ebcf2.svg)](#privacy-and-data)

<!-- README:OVERVIEW -->
## Learn the word in its real context

Context Vocabulary Notebook is a self-hosted, local-first study app. A card keeps
the target word, its meaning in the current context, the original sentence, tags,
notes, and optional media together. FSRS schedules review; you answer with
`Again` or `Good`.

This is not a prebuilt dictionary, a cloud-sync service, or a native desktop
binary. It is a local web app for vocabulary you collect yourself.

<!-- README:PREVIEW -->
## Preview

![Create a context card in the current English interface](./docs/demo/screen-create-card.jpg)

More current screens: [card detail](./docs/demo/screen-card-detail.jpg),
[review](./docs/demo/screen-review.jpg), and [statistics](./docs/demo/screen-statistics.jpg).

Browse the [complete English screen catalog](./docs/SCREEN_CATALOG.md) for every
application page and a short description of what it does.

<!-- README:WORKFLOW -->
## A simple study loop

1. **Capture** the sentence, target word, and meaning you encountered.
2. **Attach context** with an `mp4`, `mp3`, `jpg`, `png`, or `webp` file.
3. **Organize** cards with tags, favorites, notes, search, and status filters.
4. **Review** due cards with `Again / Good`; FSRS chooses the next interval.
5. **Reflect** with review volume, accuracy, tag distribution, and rating trends.

Batch Import processes multiple **local MP4 clips** and lets you confirm the
recognition result before saving each card. It does not accept website video URLs.

<!-- README:FEATURES -->
## What is included

| Area | Current capability |
|---|---|
| Context cards | Original sentence, contextual meaning, notes, tags, multiple context examples. |
| Media | Local `mp4`, `mp3`, `jpg`, `png`, and `webp` attachments. |
| Review | FSRS scheduling, `Again / Good`, a 10-minute retry cooldown after `Again`, daily progress, media replay. |
| Library | Search, filters, favorites, tags, detail editing, mastered state. |
| Statistics | Review count, accuracy, monthly totals, tags, rating trend. |
| Portability | ZIP backup/import for personal data or shareable cards. |
| Android offline review | One paired Android device, encrypted local replica, automatic verified LAN HTTPS/Tailscale selection, offline image/audio/video review, favorites, and mastered actions. |
| Local recognition | Optional ffmpeg, Tesseract OCR, and whisper.cpp STT. |
| AI assistance | Optional OpenAI-compatible meaning, usage, translation, lemma, and spelling suggestions. |

For normal installation, download the signed APK and its `.sha256` file from
[GitHub Releases](https://github.com/yaqxuan/context-vocabulary-notebook/releases).
GitHub Actions Debug APKs are only for development testing and may not update over a
signed installation. See the [Android installation and sync guide](./docs/ANDROID_SYNC.md)
for checksum commands and safe upgrade instructions.

On the PC, open **Settings → Android offline sync** and choose **Set up phone sync
automatically**. The same guide covers the one-time Windows/WSL firewall or Tailscale
authorization prompt when one is needed; Funnel is never enabled.

<!-- README:QUICKSTART -->
## Quick start

Requires Git, npm, and Node.js `20.19+` or `22.12+` (Node.js 22 LTS recommended).

Run the installer from an empty directory. It installs the project directly into
that directory and does not create a nested `context-vocabulary-notebook` folder.

### Platform support

| Platform | Current status |
|---|---|
| Windows 11 / WSL | Tested on real installations. |
| Linux | Covered by automated CI and installer smoke tests. |
| macOS | The Homebrew-based installer is implemented, but has not yet been verified on a real Mac; treat it as experimental. |
| Android | Signed APK published and tested on a real phone plus API 24/36 emulators. |
| iOS / iPadOS | Not provided in `v0.3.x`; there is no iOS project or installable build. |

### 1. Install the core app

Linux, experimental macOS, or WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### 2. Start it

```bash
npm run dev
```

Open <http://localhost:5173>. The API health check is
<http://localhost:3107/api/health>.

### 3. Create and review

Create one card manually, then open Review and choose `Again` or `Good`. OCR,
speech recognition, and AI are optional—not prerequisites for the study loop.

<!-- README:OPTIONAL -->
## Optional recognition and AI

Local clip recognition can use ffmpeg to extract media, Tesseract to read visible
text, and whisper.cpp plus a Whisper model to transcribe speech. The recognition
installer downloads and configures the default model; it is separate from the
core installer because models are large.

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=eng bash
```

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

AI suggestions use a provider and model you configure through an
OpenAI-compatible API. Local OCR/STT does not require AI, and manual card creation
requires neither.

<!-- README:PRIVACY -->
## Privacy and data

By default, the SQLite database, media, and environment configuration stay inside
your installation folder:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

There is no vendor cloud sync. Optional Android device sync remains self-hosted:
the PC is authoritative and no
vendor cloud stores the replica. Manual work and local OCR/STT keep content on
your machine. A configured network AI provider can receive text requested for AI
suggestions, audio sent through card transcription, and—only when
`CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1`—clip frames or audio after local recognition
fails. API keys stay local and are excluded from in-app ZIP exports.

<!-- README:DOCS -->
## Documentation

- [Application screen catalog](./docs/SCREEN_CATALOG.md)
- [Complete user guide](./docs/USER_GUIDE.md)
- [中文用户手册](./docs/USER_GUIDE.zh-CN.md)
- [Android offline review and sync](./docs/ANDROID_SYNC.md)
- [Android 离线复习与同步](./docs/ANDROID_SYNC.zh-CN.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

The user guide contains updates, Windows/WSL notes, OCR/STT setup, environment
variables, backups, troubleshooting, and manual installation.

<!-- README:STATUS -->
## Project status

The project is an early prerelease intended for local, self-hosted use. Expect
interfaces and data-handling details to evolve. Back up `data/`, `uploads/`, and
`.env` before upgrading or testing major changes.

Current UI languages: English, Simplified Chinese, Japanese, Korean, French,
German, Spanish, and Russian.

<!-- README:CONTRIBUTING -->
## Contributing

Bug reports, focused feature proposals, translations, and tested pull requests
are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first and avoid
including private vocabulary, media, database files, or API keys in reports.

<!-- README:LICENSE -->
## License

[MIT](./LICENSE)
