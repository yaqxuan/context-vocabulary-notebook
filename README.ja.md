[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook（文脈単語帳）

実際の動画、音声、字幕、教材から語彙を集めるための、ローカルファーストな文脈単語帳です。

単語だけを切り離して保存するのではなく、その単語に出会ったときの文、文脈上の意味、スクリーンショット、動画・音声クリップ、メモ、タグを一緒に残します。復習するときも、単語と訳だけでなく、実際に出会った文脈をもう一度確認できます。

こんな学習者に向いています：

- 外国語の動画、講座、映画、リスニング教材を見ながら未知語を記録したい人。
- Ankiのような間隔反復を使いたいが、カードにもっと豊かな文脈を持たせたい人。
- 単語帳のためにクラウドアカウントを作らず、データを手元に置きたい人。

> このプロジェクトはローカルのWebアプリケーションです。データはデフォルトでコンピューター上のSQLiteデータベースと `uploads/` フォルダーに保存され、クラウドアカウントは必要ありません。

## Demo

![Context Vocabulary Notebook カード作成デモ](./docs/demo/01-create-card.png)

## 主な機能

- 実際の文脈に基づいたカード作成：ターゲット単語、文脈上の定義、元の文、メモ、タグ。
- ローカルメディアの添付：動画 `mp4`、音声 `mp3`、画像 `jpg / png / webp`。
- 1つの意味エントリに複数の文脈インスタンスを関連付け、異なる教材での同じ意味の用法を記録できます。
- FSRS間隔反復で、単語を出会った文脈に戻しながら復習できます。
- 意味エントリのリスト、検索、タグによるフィルタリング、お気に入り、統計。
- ZIPインポート・エクスポート：完全な個人バックアップとカードのみの共有をサポート。
- V2カード作成ページのAI提案：OpenAI互換のAPIを設定して、文脈上の定義や用法メモを提案できます。APIキーはローカルにのみ保存されます。

## データの保存場所とディスク容量の警告

アプリケーションはデフォルトで実行ディレクトリにデータを保存します。動画、スクリーンショット、音声をアップロードした後、`uploads/` ディレクトリは継続的に大きくなり、多くのディスク容量を占有する可能性があります。

デフォルトのローカルデータ：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

以下の場所で実行することはお勧めしません：

- `/usr/local`、`/opt` などの通常 `sudo` やroot権限が必要なディレクトリ。
- `C:\Program Files` などのシステム保護ディレクトリ。
- 一時ディレクトリ、ダウンロードキャッシュディレクトリ、またはシステムやクリーンアップツールによって自動的に削除される場所。
- 空き容量が非常に少ない場所、同期ルールが不明確な場所、またはクラウドドライブによってファイルが自動的にクリーンアップされたり容量制限を受けたりする可能性のある場所。

## 実行環境

| 環境 | 要件 | 説明 |
|------|------|------|
| Node.js | 推奨 Node.js 22 LTS。少なくとも現在のViteの要件を満たすNodeバージョン | フロントエンドのビルド、開発サーバー、バックエンドサーバーはすべてNode.jsに依存しています。インストールスクリプトが条件を満たそうとします。 |
| npm | Node.jsと一緒にインストールされる | リポジトリには `package-lock.json` が含まれており、依存関係のインストールには `npm ci` を使用します。 |
| Git | GitHubリポジトリをクローンする際に必要 | インストールスクリプトがチェックし、条件を満たそうとします。 |
| ブラウザ | Chrome / Edge / Firefox / Safari などのモダンブラウザ | アプリケーションはローカルWebページを介して使用されます。 |
| C/C++ ビルドツール | 必要になる場合があります | `better-sqlite3` はネイティブモジュールです。現在のシステムとNodeバージョンで利用可能なコンパイル済みパッケージがない場合、`npm ci` はローカルでのコンパイルを試みます。 |

インストールスクリプトは、最初にローカルマシンの既存の環境をチェックします。Linux / WSLでは、GitまたはNode.js/npmが見つからない場合にのみ、`apt-get` を介して依存関係を満たそうとします。基本環境が満たされている場合は、システム内の無関係なサードパーティソフトウェアソースの問題を引き起こすのを避けるため、`apt-get` をスキップします。macOSスクリプトは、依存関係が欠落している場合にHomebrewの使用を試みます。Windowsネイティブスクリプトは、依存関係が欠落している場合に `winget` の使用を試みます。これらのパッケージマネージャーが利用できない場合、または現在のユーザーにインストール権限がない場合は、不足している環境を手動でインストールしてから再試行する必要があります。

## インストール前の注意事項と免責事項

作者の現在の認識の限りでは、このプロジェクトのソースコード自体に悪意のあるコードは含まれていません。インストールスクリプトはローカル環境をチェックし、サポートされているプラットフォームでGit、Node.js、npm、ネイティブビルドツールなどの欠落している依存関係をインストールしようとします。

プロジェクトのインストールでは、システムパッケージマネージャーとnpmを介してサードパーティのソフトウェアと依存関係を取得します。インストールおよび使用プロセスは、システム権限、ネットワークの状況、パッケージマネージャーの可用性、ウイルス対策ソフトウェア、企業デバイスのポリシー、ディスク容量、サードパーティの依存関係のサプライチェーン、Nodeネイティブモジュールのコンパイル結果などの要因の影響を受ける可能性があります。ユーザーは、インストールスクリプトの実行、依存関係のインストール、システム環境の変更、ローカルファイルのアップロードと保存から生じるあらゆる問題と結果について単独で責任を負うものとします。

スクリプトが自動的に環境を満たすことができない場合は、不足しているツールと推奨される処理方法を出力します。この時点で、ユーザーは再試行する前に、自身のシステムに従って手動でインストールする必要があります。

## ワンクリックインストール

### Linux / macOS / WSL

以下のコマンドをコピーして実行します。スクリプトはプロジェクトを現在のディレクトリにインストールします：

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

スクリプトはGit、Node.js/npmなどの依存関係を自動的にチェックします。インストール済みの依存関係は直接再利用されます。Linux / WSLの場合、基本的な依存関係が満たされている場合は `apt-get` をスキップします。

スクリプトの内容を事前に確認するには、以下にアクセスしてください：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

高度な使い方：インストールディレクトリを指定する

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

まず、プロジェクトファイルをインストールしたい空のディレクトリに入り、以下のコマンドをコピーして実行します。スクリプトはプロジェクトファイルをネストしたディレクトリを作成せずに現在のディレクトリに直接インストールします：

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

スクリプトはGit、Node.js/npmなどの依存関係を自動的にチェックします。インストール済みの依存関係は直接再利用されます。

スクリプトの内容を事前に確認するには、以下にアクセスしてください：
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

高度な使い方：インストールディレクトリを指定する

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### 問題のトラブルシューティング

- コマンドが存在しないというメッセージが表示された場合は、ターミナルを閉じて再度開き、インストールコマンドをもう一度実行してください。
- Linux / WSLの場合、`apt-get update` がDocker、Chromium、Snap、GPGキーなどのエラーを報告した場合、通常はシステム内の既存のaptソースまたは不完全なパッケージ設定が原因であり、このプロジェクトがこれらのソフトウェアに依存しているためではありません。まず対応するaptソースを修正/無効化するか、手動でGit、Node.js 20+、npmをインストールしてから再試行してください。
- macOSの場合、Xcode Command Line Toolsのインストールウィンドウがポップアップしたら、「インストール」をクリックし、完了後にインストールコマンドを再実行してください。
- Windowsの場合、コンパイル環境のインストールが必要であるというプロンプトが表示された場合は、プロンプトに従って続行してください。これは一部の依存関係のコンパイル時に必要になる可能性がある環境です。

## 最新バージョンへのアップデート

すでにインストールしている場合は、プロジェクトディレクトリに入り、以下を実行します：

Linux / macOS / WSL / Git Bash：

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows ネイティブ PowerShell：

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

ワンクリックインストールコマンドを再実行することもできます。スクリプトがインストールディレクトリに既存のGitリポジトリを見つけると、自動的に `git pull --ff-only`、`npm ci`、`npm run build` を実行します。

プロジェクトディレクトリ内でワンクリックインストールコマンドを再実行した場合、スクリプトは現在のプロジェクトディレクトリを更新し、同じ名前のネストしたディレクトリを作成しません。プロジェクト外で実行する場合は、まず空のディレクトリに入るか、同じ `CVN_HOME` を明示的に設定してください。スクリプトはプロジェクトファイルを空でない通常のディレクトリに混在させることはありません。

## 手動インストール

ワンクリックスクリプトで環境を満たすことができない場合は、Node.js 22 LTS、npm、Git、および必要になる可能性のあるネイティブビルドツールを手動でインストールしてから、以下のコマンドを実行してください。

Linux / macOS / WSL / Git Bash：

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows ネイティブ PowerShell：

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

ブラウザで開く：

```text
http://localhost:5173
```

デフォルトのバックエンドアドレス：

```text
http://localhost:3107
```

## 環境変数

## Local Clip Recognition (OCR / STT) addendum

Clip analysis now uses local tools by default: `whisper.cpp` for speech recognition, `Tesseract` for image/video-frame OCR, and `ffmpeg` for video audio extraction. Missing tools do not block core install, manual card creation, review, or normal media upload; the readiness endpoint / UI reports what is missing.

Opt in to installer-managed optional tools before running the installer:

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

If clip analysis shows `Audio extraction failed`, install ffmpeg or make sure ffmpeg is on PATH, then reopen the terminal and retry.

The installer does not install `whisper.cpp` or download Whisper models. Configure `CVN_WHISPER_CPP_PATH` and `CVN_WHISPER_CPP_MODEL` manually. Tesseract language data can be configured with `CVN_TESSERACT_LANG`, for example `eng`, `chi_sim`, or `eng+chi_sim`.

DeepSeek and other OpenAI-compatible text models can help with contextual definitions, usage notes, sentence translation, lemmatization, and spelling checks. They do not replace local OCR/STT. `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` only allows configured cloud fallback when local recognition fails, and is disabled by default.

<!-- AUTO-GENERATED:ENV -->
| 変数 | 必須 | デフォルト値 | 説明 |
|------|------|--------|------|
| `PORT` | いいえ | `3107` | バックエンドExpressサーバーのポート。Vite開発サーバーは `/api` をこのポートにプロキシします。 |
| `DATABASE_PATH` | いいえ | `./data/context-vocabulary-notebook.sqlite` | SQLiteデータベースのパス。相対パスはプロジェクトのルートに対して解決されます。 |
| `UPLOADS_DIR` | いいえ | `./uploads` | アップロードされたメディアファイルの保存ディレクトリ。相対パスはプロジェクトのルートに対して解決されます。 |
<!-- /AUTO-GENERATED:ENV -->

開発中にフロントエンドのポートを変更するには、コマンド実行時に `CLIENT_PORT` を設定できます（デフォルトは `5173`）。この変数は `.env.example` には含まれておらず、通常は設定する必要はありません。

## よく使うコマンド

<!-- AUTO-GENERATED:SCRIPTS -->
| コマンド | 説明 |
|------|------|
| `npm run dev` | バックエンド開発サーバーとViteフロントエンド開発サーバーの両方を起動します。 |
| `npm run dev:client` | Viteフロントエンド開発サーバーのみを起動し、デフォルトで `0.0.0.0:5173` をリッスンします。 |
| `npm run dev:server` | バックエンドExpress開発サーバーのみを起動し、デフォルトで `localhost:3107` をリッスンします。 |
| `npm run build` | 最初にタイプチェックを実行し、その後フロントエンドとバックエンドをビルドします。 |
| `npm test` | Vitestのユニット/統合テストを実行します。 |
| `npm run test:e2e` | Playwright E2Eテストを実行します。テストファイルがない場合でもパスします。 |
| `npm run typecheck` | フロントエンドとNode側のTypeScriptタイプチェックを実行します。 |
| `npm run lint` | 現在は `npm run typecheck` と同等です。 |
<!-- /AUTO-GENERATED:SCRIPTS -->

## データとバックアップ

デフォルトのデータはプロジェクトディレクトリ内にあります：

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

バックアップする際は、一緒に保存することをお勧めします：

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

復元するには、これらのファイルを同じプロジェクトディレクトリに戻し、アプリケーションを起動します。

アプリ内ZIPインポート/エクスポートも提供されています：

- 完全なバックアップ：カード、文脈、メディア、タグ、お気に入り、復習ステータス、FSRSステータス、復習ログ、およびユーザー設定が含まれます。
- 純粋なカードの共有：個人の復習の進捗、お気に入りステータス、またはユーザー設定は含まれません。

AI APIキーはローカルの機密設定であり、エクスポートされたファイルには含まれません。デバイスを変更した後に再度入力する必要があります。

## メディアファイルの推奨事項

| タイプ | サポートされる形式 | 推奨サイズ |
|------|----------|----------|
| 動画 | `mp4` | 1ファイルあたり300MB未満 |
| 音声 | `mp3` | 1ファイルあたり50MB未満 |
| 画像 | `jpg` / `png` / `webp` | 1ファイルあたり10MB未満 |

## AI提案の設定

カード作成ページはオプションのAI提案をサポートしています。設定ページでOpenAI互換のAPI設定を追加する必要があります：

- 表示名
- Base URL
- API Key
- Model

注意：

- AIを設定しなくても、手動でのカード作成と復習は完全に機能します。
- APIキーはローカルデータベースに保存され、UIではマスクされます。
- APIキーはエクスポートされるファイルには含まれません。
- AIはカード作成時に文脈上の定義や用法のメモを提案するためにのみ使用されます。組み込みの辞書ではなく、カードを自動的に作成することもありません。

## よくある質問 (FAQ)

### ポートが使用中

`.env` を変更します：

```env
PORT=3108
```

フロントエンドポート `5173` が使用中の場合：

```bash
CLIENT_PORT=5174 npm run dev
```

### better-sqlite3 で npm ci が失敗する

Node.js 22 LTSの使用を推奨します。`better-sqlite3` はネイティブモジュールです。現在のシステムとNodeバージョンで利用可能なコンパイル済みパッケージがない場合、インストール中にローカルでのコンパイルを試みます。

Linux / WSL：

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS：

```bash
xcode-select --install
```

Windowsネイティブ環境では、利用可能なPythonとVisual Studio Build Tools / MSVCネイティブビルド環境が必要です。これらのツールの設定に慣れていない場合は、代わりにWSLを使用するか、まず不足している環境を手動でインストールしてから再試行することをお勧めします。

### ページは開くが、APIリクエストが失敗する

バックエンドが実行されていることを確認します：

```text
http://localhost:3107/api/health
```

正常な応答：

```json
{"ok":true}
```

### インストールディレクトリを変更したい

プロジェクトディレクトリ全体を移動するだけです。`.env` が相対パスを使用している場合、データベースとアップロードディレクトリは新しいディレクトリに対して引き続き相対的に解決されます。`.env` が絶対パスを使用している場合は、同期して更新する必要があります。

## 開発ノート

このプロジェクトの技術スタック：

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

最初のバージョンは、ローカルファースト、組み込み辞書なし、辞書接続なし、Webサイト動画リンクなし、同期なしを堅持しています。現在のV2では、カード作成時のAI提案機能のみを追加しています。

## ライセンス

このプロジェクトは MIT License を使用しています。詳細は [`LICENSE`](./LICENSE) をご覧ください。
