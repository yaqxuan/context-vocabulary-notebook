# Changelog

All notable changes to Context Vocabulary Notebook are documented here. This
project follows [Semantic Versioning](https://semver.org/), with prerelease
versions used while installation and data workflows continue to mature.

## [Unreleased]

### Fixed

- Submit and advance immediately when a revealed `Good` answer is corrected to
  `Again`, while retaining the answer-confirmation step for an initial `Again`.
- Add offline Android favorite/unfavorite and mastered actions with a separate
  idempotent outbox, PC-side audit events, and canonical snapshot convergence.
- Enforce the server-advertised minimum Android client version before uploading
  credentials or local changes.
- Replace Android snapshot tables one statement at a time and serialize syncs,
  preventing duplicate-card failures after offline events are uploaded.
- Hide meanings until the learner explicitly reveals the answer, refresh pending
  counts after failures, and derive offline AAC audio from video-only contexts.
- Encode pairing QR codes as compact high-resolution payloads with a copyable
  pairing-text fallback, and detect Windows `tailscale.exe` from WSL.
- Show pending Android pairing requests as a global PC confirmation dialog,
  regardless of which PC page is currently open.
- Allow hash-addressed audio downloads from the private derived-media cache and
  keep the Android app paired when its first media download needs to be retried.
- Match the web review flow on Android: choose `Again / Good` first, then reveal
  the answer and confirm or advance without a separate reveal button.
- Sync original video files into Android private storage with hash validation,
  Range resume, extension-preserving cache names, and inline offline playback.
- Normalize legacy `file:/...` Android cache paths and return absolute paths for
  new downloads so Capacitor serves private video/audio/image files to WebView.

## [0.3.0-alpha] - 2026-07-16

### Added

- Transactional schema migrations, immutable device review events, canonical
  FSRS replay, and schema-v2 ZIP backups with v1 import compatibility.
- A dedicated `/v1` sync service with idempotent event batches, atomic full
  snapshots, revision acknowledgements, hashed media manifests, and Range
  downloads.
- One-PC/one-Android pairing with short-lived secrets, PC approval, hashed
  long-lived credentials, device revocation, and signed connection profiles.
- Separate Tailscale Serve and pinned-certificate LAN transports, mDNS discovery,
  private-source filtering, and WSL mirrored-network diagnostics.
- A Capacitor 8 Android client with SQLCipher storage, Keystore-protected secret,
  offline `Again / Good` review, foreground sync, media cache, and manual
  LAN/Tailscale selection.
- Android CI that produces a checksum artifact and publishes a signed APK only
  when all four signing secrets are available.

### Security

- The regular browser app and API now bind to localhost by default. Network
  listeners expose only device-sync routes and reject plaintext mobile traffic.
- PC identity keys and device credentials are excluded from ZIP backups and
  Android system/cloud backup.

### Changed

- One-line installers now document and test installation directly into the
  current empty directory instead of creating a folder under the user home.
- Added an English catalog covering every current application page with clean
  demonstration screenshots and short descriptions.
- Refreshed every public screen-catalog image from one current English build,
  updated the Pages gallery, and localized the review heading correctly.

## [0.2.0-alpha] - 2026-07-14

### Added

- A desktop-first crystal interface for creating, browsing, reviewing, tagging,
  favoriting, and analyzing vocabulary cards.
- Context cards with optional image, audio, and MP4 attachments.
- Local MP4 batch analysis using optional FFmpeg, Tesseract OCR, and whisper.cpp
  tools, plus optional OpenAI-compatible suggestions.
- FSRS-powered review with `Again` and `Good` ratings, review history, and
  learning statistics.
- Local-first storage using SQLite and a local uploads directory.
- Windows PowerShell installers for the core application and optional local
  recognition tools.
- Concise documentation in 11 languages, detailed English and Chinese user
  guides, and a bilingual project website.
- GitHub Actions checks, community templates, and grouped Dependabot updates.

### Changed

- Reorganized desktop layouts around a centered 1440 px canvas and
  content-driven page heights.
- Improved media display so videos keep their original aspect ratio and remain
  playable through the Vite development proxy.
- Refreshed the public documentation to describe current behavior rather than
  early design concepts.

### Known limitations

- This is an alpha release. Back up local data before upgrades.
- Batch import accepts local MP4 files; it does not import from video website
  URLs.
- OCR and speech-to-text require separately installed local tools and models.
- AI assistance is optional and requires a user-configured OpenAI-compatible
  provider.
- There is no hosted sync service, public online demo, native desktop package,
  or automatic multi-device synchronization.

[Unreleased]: https://github.com/yaqxuan/context-vocabulary-notebook/compare/v0.3.0-alpha...HEAD
[0.3.0-alpha]: https://github.com/yaqxuan/context-vocabulary-notebook/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/yaqxuan/context-vocabulary-notebook/releases/tag/v0.2.0-alpha
