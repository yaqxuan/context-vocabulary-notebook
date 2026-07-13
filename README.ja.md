[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (文脈単語帳)

動画を見たり、講座を聞いたり、字幕を読んだりして新しい語に出会ったとき、「単語そのもの」だけでなく、原文、前後の文脈、スクリーンショット、音声/動画クリップ、メモ、タグも一緒に保存します。

復習するときに見るのは孤立した単語ではなく、その語に実際に出会った場面です。

こんな人に向いています:

- 外国語の動画、講座、映画、ポッドキャスト、リスニング教材をよく見る／聞く。
- Anki のような間隔反復を使いたいが、元の文、スクリーンショット、メディアクリップもカードに残したい。
- 語彙ノートのためだけにクラウドアカウントを作らず、学習データを自分のコンピューターに置きたい。
- ローカルの動画、音声、画像から文を認識し、手作業で整えてカードにする前の助けがほしい。

> このプロジェクトはローカル Web アプリです。既定では、データはコンピューター上の SQLite データベースと `uploads/` フォルダーに保存され、クラウドアカウントは不要です。

## Demo

![Context Vocabulary Notebook のカード作成例](./docs/demo/01-create-card-ja.png)

## これでできること

- 実際の文脈を中心にカードを作成できます: 対象語、元の文、文脈上の意味、メモ、タグ。
- ローカルのメディア添付を保存できます: 動画 `mp4`、音声 `mp3`、画像 `jpg / png / webp`。
- クリップを一括インポートできます: 複数の動画、音声、画像クリップをまとめて取り込み、認識結果を一つずつ確認してカードを作成します。
- 任意のローカル OCR/STT 補助を使えます: ffmpeg、Tesseract、whisper.cpp を設定して、画像、動画フレーム、音声から文を認識します。
- 同じ語義に複数の文脈例を付けられるため、一つの意味が異なる教材でどう現れるかを確認できます。
- FSRS 間隔反復で復習し、各単語を見つけた文脈に戻して思い出せます。
- 検索、タグでの絞り込み、お気に入り、統計表示、ZIP バックアップのインポート／エクスポートができます。
- 任意の AI 提案: OpenAI-compatible API を設定すると、文脈上の意味、用法メモ、全文翻訳、見出し語化、スペルチェックの支援を受けられます。

## データ保存場所とディスク使用量の注意

まずインストール先ディレクトリを選んでください。既定では、アプリは実行元ディレクトリの下にデータベース、アップロード済みファイル、設定を保存します。

既定のローカルデータ:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

注: 動画、音声、スクリーンショットをアップロードすると、`uploads/` は増え続けることがあります。Whisper モデルも数百 MB から数 GB を使用する場合があります。

次の場所では実行しないでください:

- `/usr/local`、`/opt`、または通常 `sudo` や root 権限が必要なその他のディレクトリ。
- `C:\Program Files` またはその他のシステム保護ディレクトリ。
- 一時フォルダー、ダウンロードキャッシュ、システムやクリーンアップツールが自動削除する可能性のある場所。
- 空き容量が少ない場所、同期ルールが不明な場所、クラウドドライブのクリーンアップや容量制限の影響を受ける場所。

長期的に保持できる場所を推奨します。例:

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## ワンクリックインストール

プロジェクトファイルを置きたい空のディレクトリに入り、使用しているシステム用のコマンドを実行してください。スクリプトは現在のディレクトリにプロジェクトをインストールします。そのディレクトリに既にこのプロジェクトがある場合は自動的に更新します。

| システム | コマンド |
|------|------|
| Linux / macOS / WSL | 下の Linux / macOS / WSL コマンドを参照 |
| Windows PowerShell | 下の Windows PowerShell コマンドを参照 |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

インストール後、次で起動します:

```bash
npm run dev
```

ブラウザーで開きます:

```text
http://localhost:5173
```

backend ヘルスチェック:

```text
http://localhost:3107/api/health
```

## 最新版への更新

プロジェクトをインストールしたディレクトリに入り、次を実行します:

Linux / macOS / WSL / Git Bash:

```bash
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows PowerShell:

```powershell
git pull --ff-only
npm ci
npm run build
npm run dev
```

ワンクリックインストールコマンドをもう一度実行することもできます。スクリプトが現在のディレクトリを既存のプロジェクトとして検出すると、自動的に更新し、依存関係をインストールし、ビルドします。

## ローカル OCR / 音声認識（任意）

中核のノートブックに OCR/STT は不要です。まず手動でカード作成と復習ができます。動画、音声、画像から元の文を自動認識したい場合にだけ、これらのツールを設定してください。

ローカル認識で使用するもの:

- ffmpeg: 動画から音声を抽出します。
- Tesseract: 画像または動画フレーム内の文字を認識します。
- whisper.cpp + Whisper モデル: 音声または動画内の発話を認識します。

### ローカル認識を自動設定する（まず試すのがおすすめ）

プロジェクトディレクトリでこれを実行します:

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

中国語と英語の字幕を認識するには、言語を次に変更します:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

スクリプト完了後、アプリ設定ページのローカル認識カードで **I installed it, check again** をクリックしてください。新しいバージョンでは `.env` を再読み込みするため、通常 backend を手動で再起動する必要はありません。

### モデルとディスク使用量

Whisper モデルは大きく、ダウンロード時間はネットワークによって変わります:

- `tiny` / `base`: 小さく高速で、試用に向いていますが精度は低めです。
- `small` / `medium`: 精度は高くなりますが、ディスクと CPU の使用量も増えます。
- `large`: 非常に大きく、一般的なコンピューターでは遅い場合があります。既定の選択肢としては推奨しません。

Windows 認識インストーラーは既定で `ggml-small.bin` をダウンロードします。サイズはおよそ数百 MB です。

### ローカル認識を手動設定する

ワンクリック設定に失敗した場合、またはツールのパスを自分で管理したい場合は、ツールを手動でインストールし、これらの値を `.env` に書き込んでください:

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

Windows パスの例:

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## 高度なインストールオプション

### インストール先ディレクトリを指定する

Linux / macOS / WSL:

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### コアインストーラーに任意ツールの追加を試させる

通常の初回インストールには不要です。必要な場合だけ使用してください。

Linux / macOS / WSL:

```bash
export CVN_INSTALL_FFMPEG=1
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

インストーラーのソース:

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## 手動インストール

ワンクリックスクリプトで環境を準備できない場合は、まず Node.js 22 LTS、npm、Git、および必要なネイティブビルドツールを手動でインストールしてから、次を実行してください:

Linux / macOS / WSL / Git Bash:

```bash
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows PowerShell:

```powershell
Set-Location $HOME
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

ブラウザーで開きます:

```text
http://localhost:5173
```

## よくある質問

### ワンクリックインストールに失敗した場合

- If the message says a command is missing, close and reopen the terminal, then run the installer again.
- Linux / WSL: if `apt-get update` reports Docker, Chromium, Snap, GPG key, or similar errors, it is usually an existing apt-source or unfinished package-configuration issue, not because this project depends on those packages. Fix/disable the affected apt source first, or manually install Git, Node.js 22 LTS, and npm before retrying.
- macOS: if the Xcode Command Line Tools prompt appears, click Install, then rerun the installer after it completes.
- Windows: if `npm ci` fails at `better-sqlite3`, you usually need Python and Visual Studio Build Tools / MSVC; if you are not familiar with these tools, WSL is recommended.

### ページは開くが、ローカル認識が未設定のままの場合

First make sure the recognition installer has completed and the corresponding `CVN_*` paths exist in `.env`. Then click **I installed it, check again** on the settings page.

If it still does not work:

- Make sure the app was started from the same project directory.
- Make sure no old `3107` backend process is occupying the port.
- Run `npm run dev` again and refresh the page.

### ポートがすでに使用されている場合

Change the backend port:

```env
PORT=3108
```

Linux / macOS / WSL / Git Bash change the frontend port:

```bash
CLIENT_PORT=5174 npm run dev
```

Windows PowerShell change the frontend port:

```powershell
$env:CLIENT_PORT = "5174"
npm run dev
```

### クリップに見える字幕がなく、原文が認識されない場合

動画フレームに字幕がない、または字幕が小さすぎる/ぼやけている場合、OCR は文を見つけられないことがあります。その場合は音声認識が必要です。ffmpeg、whisper.cpp、`CVN_WHISPER_CPP_MODEL` が利用可能であることを確認してください。音声にも明瞭な発話がない場合は、元の文を手入力してください。

`Audio extraction failed` が表示される場合、通常は ffmpeg が使えない、パスが正しくない、または元の動画/音声ファイルを ffmpeg が読めないことを意味します。

### Tesseract 言語データが不足している場合

If OCR reports missing language data, Tesseract was found but the matching traineddata is not installed. Common language codes:

- English: `eng`
- Simplified Chinese: `chi_sim`
- Japanese: `jpn`
- Korean: `kor`
- French: `fra`
- German: `deu`
- Spanish: `spa`
- Russian: `rus`

For multiple languages:

```env
CVN_TESSERACT_LANG=eng+chi_sim
```

### Whisper モデルパスが未設定の場合

アプリ本体には Whisper モデルを同梱していません。ローカル認識インストーラーは既定の `ggml-small.bin` をダウンロードして設定します。手動設定の場合のみ、whisper.cpp 対応の ggml モデルを用意して絶対パスを `.env` に記入してください。

## データとバックアップ

By default, all data is under the project directory:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

For backup, save them together:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

To restore, put these files back into the same project directory and start the app.

The app also provides ZIP import/export:

- Full backup: includes cards, contexts, media, tags, favorites, review state, FSRS state, review logs, and user settings.
- Card-only sharing: excludes personal review progress, favorite state, and user settings.

AI API Keys are local sensitive configuration and are not included in exports; you need to enter them again on another device.

## メディアファイルの目安

| Type | Supported formats | Recommended size |
|------|----------|----------|
| Video | `mp4` | within 300MB per file |
| Audio | `mp3` | within 50MB per file |
| Image | `jpg` / `png` / `webp` | within 10MB per file |

## AI 提案の設定

The card creation page supports optional AI suggestions. Add an OpenAI-compatible API configuration on the settings page:

- Display name
- Base URL
- API Key
- Model

Notes:

- Without AI configuration, manual card creation and review still work normally.
- The API Key is stored in the local database and masked in the UI.
- The API Key is not included in export files.
- AI can suggest contextual meanings, usage notes, full-sentence translations, lemmatization, and spell checks during card creation.
- OpenAI-compatible text models such as DeepSeek do not perform local OCR/STT; image text recognition depends on Tesseract, and speech recognition depends on whisper.cpp.

## 環境要件

| Environment | Requirement | Notes |
|------|------|------|
| Node.js | Node.js 22 LTS recommended | Frontend build, development servers, and backend service all depend on Node.js. The installer tries to provide it. |
| npm | Installed with Node.js | The repository includes `package-lock.json`; dependencies are installed with `npm ci`. |
| Git | Required when cloning from GitHub | The installer checks for it and tries to provide it. |
| Browser | Chrome / Edge / Firefox / Safari or another modern browser | The app is used through a local web page. |
| C/C++ build tools | May be required | `better-sqlite3` is a native module; if no prebuilt package is available, `npm ci` tries to compile it locally. |
| ffmpeg | Optional | Required for video/audio clip analysis. |
| Tesseract OCR | Optional | Required for OCR on images or video frames. |
| whisper.cpp + Whisper model | Optional | Required for speech recognition on audio/video. |

### WSL / Windows ネイティブの選び方

- WSL is usually the most stable: Node, Git, ffmpeg, Tesseract, and native build tools are closer to Linux paths.
- Native Windows PowerShell is supported: the script reuses existing Git / Node.js / npm and tries `winget` only when something is missing.
- If native Windows `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.

## 環境変数

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | いいえ | `3107` | Express バックエンドサービスのポート。Vite 開発サーバーは `/api` をこのポートへプロキシします。 |
| `DATABASE_PATH` | いいえ | `./data/context-vocabulary-notebook.sqlite` | SQLite データベースのパス。相対パスはプロジェクトルートから解決されます。 |
| `UPLOADS_DIR` | いいえ | `./uploads` | アップロードされたメディアファイルのディレクトリ。相対パスはプロジェクトルートから解決されます。 |
| `CVN_FFMPEG_PATH` | いいえ | `ffmpeg` | ffmpeg 実行ファイルへのパス。Windows ネイティブツールのインストールでは、必要に応じて絶対パスを使ってください。 |
| `CVN_STT_PROVIDER` | いいえ | `whisper.cpp` | ローカル音声認識プロバイダー。`whisper.cpp` または `disabled` を指定できます。 |
| `CVN_WHISPER_CPP_PATH` | いいえ | `whisper-cli` | whisper.cpp 実行ファイルへのパス。システムに古い `main` しかない場合は、`main` または絶対パスを設定してください。 |
| `CVN_WHISPER_CPP_MODEL` | ローカル STT に必須 | 空 | Whisper モデルのパス。ローカル認識インストーラーは既定モデルをダウンロードし、手動設定ではこのパスを指定します。 |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | いいえ | `120000` | whisper.cpp の 1 回の認識実行のタイムアウト。 |
| `CVN_OCR_PROVIDER` | いいえ | `tesseract` | ローカル OCR プロバイダー。`tesseract` または `disabled` を指定できます。 |
| `CVN_TESSERACT_PATH` | いいえ | `tesseract` | Tesseract 実行ファイルへのパス。 |
| `CVN_TESSERACT_LANG` | いいえ | 対象言語により自動選択 | `eng`、`chi_sim`、`eng+chi_sim` などの Tesseract 言語コード。 |
| `CVN_TESSERACT_TIMEOUT_MS` | いいえ | `30000` | Tesseract OCR の 1 回の実行のタイムアウト。 |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | いいえ | `0` | ローカルのクリップ認識が失敗したとき、クラウド文字起こしへのフォールバックを許可するか。既定では無効です。 |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | いいえ | サーバーが決定 | ローカル認識の準備状況チェックのタイムアウト。 |
<!-- /AUTO-GENERATED:ENV -->

## よく使うコマンド

<!-- AUTO-GENERATED:SCRIPTS -->
| Command | Description |
|------|------|
| `npm run dev` | Start both the backend development server and the Vite frontend development server. |
| `npm run dev:client` | Start only the Vite frontend development server, listening on `0.0.0.0:5173` by default. |
| `npm run dev:server` | Start only the backend Express development server, listening on `localhost:3107` by default. |
| `npm run build` | Run type checks, then build the frontend and backend. |
| `npm test` | Run Vitest unit / integration tests. |
| `npm run test:e2e` | Run Playwright E2E tests; passes even when there are no test files. |
| `npm run typecheck` | Run TypeScript type checks for the frontend and Node side. |
| `npm run lint` | Currently equivalent to `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## 開発メモ

Project stack:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

バージョン 1 はローカルファーストのままです。内蔵辞書、辞書連携、Web サイト動画リンク、同期機能はありません。現在の V2 では、カード作成時の AI 提案とローカルのクリップ認識補助が追加されています。

## インストール前の注意と免責

著者の現時点での認識では、このプロジェクト自身のソースコードに悪意のあるコードは含まれていません。インストーラーはローカル環境を確認し、対応プラットフォームでは Git、Node.js、npm など不足している依存関係のインストールを試みます。ネイティブビルドツールが不足している場合は案内を表示し、一部のプラットフォームでは手動インストールが必要です。

インストールでは、システムのパッケージマネージャーと npm を通じてサードパーティ製ソフトウェアおよび依存関係をダウンロードします。インストールと使用は、システム権限、ネットワーク状態、パッケージマネージャーの利用可否、ウイルス対策ソフト、企業デバイスポリシー、ディスク容量、サードパーティ依存関係のサプライチェーン、Node ネイティブモジュールのコンパイル結果などの要因に影響される場合があります。インストーラーの実行、依存関係のインストール、システム環境の変更、ローカルファイルのアップロード/保存によって生じる問題と結果は、ユーザーの責任です。

スクリプトが環境を自動的に準備できない場合、不足しているツールと推奨される次の手順を表示します。その後、ご利用のシステムに合わせて手動でインストールし、再試行してください。

## ライセンス

このプロジェクトは MIT License を使用しています。詳細は [`LICENSE`](./LICENSE) を参照してください。
