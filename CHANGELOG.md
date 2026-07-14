# Changelog

All notable changes to Context Vocabulary Notebook are documented here. This
project follows [Semantic Versioning](https://semver.org/), with prerelease
versions used while installation and data workflows continue to mature.

## [Unreleased]

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

[Unreleased]: https://github.com/yaqxuan/context-vocabulary-notebook/compare/v0.2.0-alpha...HEAD
[0.2.0-alpha]: https://github.com/yaqxuan/context-vocabulary-notebook/releases/tag/v0.2.0-alpha
