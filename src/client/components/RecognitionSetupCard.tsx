import { useMemo, useState } from 'react';

import { getNativeLanguageLabel, type SupportedLanguage } from '../../shared/constants';
import type { LocalRecognitionReadinessDto } from '../../shared/types';
import { useI18n } from '../i18n/I18nProvider';
import type { UiLanguage } from '../i18n/types';

interface RecognitionSetupCardProps {
  targetLanguage: SupportedLanguage;
  readiness: LocalRecognitionReadinessDto | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

type InstallPlatform = 'windows' | 'linux' | 'macos';

interface InstallStep {
  title: string;
  description: string;
  command?: string;
}

interface PlatformGuide {
  platform: InstallPlatform;
  title: string;
  quickStep: InstallStep;
  advancedSteps: InstallStep[];
}

const APT_TESSERACT_PACKAGES: Record<string, string> = {
  chi_sim: 'chi-sim',
  eng: 'eng',
  jpn: 'jpn',
  kor: 'kor',
  fra: 'fra',
  deu: 'deu',
  spa: 'spa',
  rus: 'rus',
};

interface RecognitionSetupCopy {
  ariaLabel: (languageLabel: string) => string;
  title: (languageLabel: string) => string;
  description: string;
  checking: string;
  checkAgain: string;
  ready: string;
  needsConfig: string;
  ffmpegUsage: string;
  sttTitle: string;
  sttFallback: string;
  ocrTitle: string;
  ocrFallback: (languageLabel: string) => string;
  targetLanguagePackage: string;
  autoPackage: string;
  showCommands: string;
  hideCommands: string;
  ubuntuTitle: string;
  macosTitle: string;
  windowsTitle: string;
  whisperUnixTitle: string;
  whisperWindowsTitle: string;
  platformQuestion: string;
  platformWindows: string;
  platformLinux: string;
  platformMacos: string;
  installLocationNote: string;
  windowsBuildToolsNote: string;
  stepInstallBaseTools: string;
  stepInstallWhisper: string;
  stepDownloadModel: string;
  stepWriteEnv: string;
  stepVerifyRestart: string;
  stepOneLineInstall: string;
  oneLineInstallDescription: string;
  showAdvancedCommands: string;
  hideAdvancedCommands: string;
  advancedCommandsDescription: string;
  modelDownloadNote: string;
  envPathNote: string;
  restartNote: string;
  copied: string;
  copyCommand: (title: string) => string;
  aptNote: string;
  macosTessdataNote: (languageLabel: string, requiredLanguage: string) => string;
  windowsPathNote: string;
  windowsTessdataNote: (languageLabel: string, requiredLanguage: string) => string;
  whisperModelNote: string;
}

const ZH_COPY: RecognitionSetupCopy = {
  ariaLabel: (languageLabel) => `本地识别配置 ${languageLabel}`,
  title: (languageLabel) => `本地识别配置 · ${languageLabel}`,
  description: '核心应用安装不强制 OCR/STT。OCR 可通过 ffmpeg + Tesseract 配好；语音识别还需要手动安装 whisper.cpp 并下载 Whisper 模型。复制对应系统命令执行后，重新打开终端并检测。',
  checking: '检测中…',
  checkAgain: '我已安装，重新检测',
  ready: '✅ 已就绪',
  needsConfig: '⚠️ 需要配置',
  ffmpegUsage: '用于从视频提取音频。',
  sttTitle: '声音识别 · whisper.cpp',
  sttFallback: '需要 whisper.cpp 和 Whisper 模型。',
  ocrTitle: '字幕 OCR · Tesseract',
  ocrFallback: (languageLabel) => `需要 ${languageLabel} 对应 Tesseract 语言数据。`,
  targetLanguagePackage: '目标语言包：',
  autoPackage: '自动选择',
  showCommands: '查看安装命令',
  hideCommands: '收起安装命令',
  ubuntuTitle: 'Ubuntu / WSL',
  macosTitle: 'macOS',
  windowsTitle: 'Windows 原生 PowerShell',
  whisperUnixTitle: 'Whisper .env（Linux / WSL / macOS）',
  whisperWindowsTitle: 'Whisper .env（Windows 原生 PowerShell）',
  platformQuestion: '选择操作系统',
  platformWindows: 'Windows 原生 PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: '步骤 1 准备基础工具：Windows 会放到本 notebook 的 tools/，Linux / macOS 使用系统包管理器。步骤 2–5 请先进入本 notebook 安装目录后再执行。',
  windowsBuildToolsNote: 'Windows 构建 whisper.cpp 还需要 Visual Studio Build Tools / MSVC C++ 工具链。',
  stepInstallBaseTools: '步骤 1 · 安装基础工具',
  stepInstallWhisper: '步骤 2 · 安装 whisper.cpp CLI',
  stepDownloadModel: '步骤 3 · 手动下载 Whisper 模型',
  stepWriteEnv: '步骤 4 · 写入 .env 绝对路径',
  stepVerifyRestart: '步骤 5 · 验证并重启',
  stepOneLineInstall: '推荐 · 一键安装本地识别',
  oneLineInstallDescription: '先进入本 notebook 安装目录，再复制这一行执行；脚本会把工具放到本 notebook 的 tools/ 和 models/，并安全更新 .env。',
  showAdvancedCommands: '显示高级手动命令',
  hideAdvancedCommands: '隐藏高级手动命令',
  advancedCommandsDescription: '如果一键脚本失败，可展开查看分步手动命令。',
  modelDownloadNote: '手动下载多语言 base 或 small 模型到 ./models；非英语不要使用 *.en.bin。',
  envPathNote: '把当前 notebook 目录下的 whisper.cpp 和模型绝对路径写入 .env；移动 notebook 目录后需要重新生成这些路径。',
  restartNote: '验证二进制和模型后，重启应用并重新检测。',
  copied: '已复制',
  copyCommand: (title) => `复制 ${title} 命令`,
  aptNote: '# 如果 apt-get 报 Docker / Chrome / NVIDIA / GPG key 等错误，先修复系统 apt 源；也可以手动安装后回来点“重新检测”。',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# 如果 ${languageLabel} OCR 仍缺少 ${requiredLanguage}，请把对应 traineddata 安装到 Tesseract tessdata 目录。`,
  windowsPathNote: '# 安装后重新打开 PowerShell，让服务进程读到新的 PATH。',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# 如果 ${languageLabel} OCR 仍缺少 ${requiredLanguage}，请把对应 traineddata 放入 Tesseract tessdata 目录。`,
  whisperModelNote: '# 推荐使用多语言模型；非英语不要使用 *.en.bin',
};

const EN_COPY: RecognitionSetupCopy = {
  ariaLabel: (languageLabel) => `Local recognition setup ${languageLabel}`,
  title: (languageLabel) => `Local recognition setup · ${languageLabel}`,
  description: 'Core app install does not require OCR/STT. OCR needs ffmpeg and Tesseract; speech recognition also needs whisper.cpp and a downloaded Whisper model. Copy the commands for your system, reopen the terminal, then run the check again.',
  checking: 'Checking…',
  checkAgain: 'I installed it, check again',
  ready: '✅ Ready',
  needsConfig: '⚠️ Needs setup',
  ffmpegUsage: 'Used to extract audio from videos.',
  sttTitle: 'Speech recognition · whisper.cpp',
  sttFallback: 'Requires whisper.cpp and a Whisper model.',
  ocrTitle: 'Subtitle OCR · Tesseract',
  ocrFallback: (languageLabel) => `Requires Tesseract language data for ${languageLabel}.`,
  targetLanguagePackage: 'Target language package: ',
  autoPackage: 'auto',
  showCommands: 'View installation commands',
  hideCommands: 'Hide installation commands',
  ubuntuTitle: 'Ubuntu / WSL',
  macosTitle: 'macOS',
  windowsTitle: 'Windows native PowerShell',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (Windows native PowerShell)',
  platformQuestion: 'Choose your operating system',
  platformWindows: 'Windows native PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'Step 1 prepares base tools: Windows stores them under this notebook’s tools/ folder; Linux / macOS use the system package manager. Run steps 2–5 from this notebook install directory first.',
  windowsBuildToolsNote: 'Building whisper.cpp on Windows also requires Visual Studio Build Tools / the MSVC C++ toolchain.',
  stepInstallBaseTools: 'Step 1 · Install base tools',
  stepInstallWhisper: 'Step 2 · Install whisper.cpp CLI',
  stepDownloadModel: 'Step 3 · Download Whisper model manually',
  stepWriteEnv: 'Step 4 · Write absolute paths to .env',
  stepVerifyRestart: 'Step 5 · Verify and restart',
  stepOneLineInstall: 'Recommended · One-line local recognition install',
  oneLineInstallDescription: 'Enter this notebook install directory first, then run this one line. The script stores tools in this notebook’s tools/ and models/ folders and safely updates .env.',
  showAdvancedCommands: 'Show advanced manual commands',
  hideAdvancedCommands: 'Hide advanced manual commands',
  advancedCommandsDescription: 'If the one-line installer fails, expand these manual steps to install each dependency yourself.',
  modelDownloadNote: 'Manually download a multilingual base or small model into ./models; avoid *.en.bin for non-English audio.',
  envPathNote: 'Write absolute paths for whisper.cpp and the model under the current notebook directory into .env; regenerate them if you move the notebook directory.',
  restartNote: 'Verify binaries and model, then restart the app and check again.',
  copied: 'Copied',
  copyCommand: (title) => `Copy ${title} command`,
  aptNote: '# If apt-get reports Docker / Chrome / NVIDIA / GPG key errors, fix system apt sources first; or install manually and click “check again”.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# If ${languageLabel} OCR still misses ${requiredLanguage}, install the traineddata file into the Tesseract tessdata directory.`,
  windowsPathNote: '# Reopen PowerShell after install so the service process reads the new PATH.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# If ${languageLabel} OCR still misses ${requiredLanguage}, place the traineddata file into the Tesseract tessdata directory.`,
  whisperModelNote: '# Use a multilingual model; do not use *.en.bin for non-English audio.',
};

const JA_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `ローカル認識設定 ${languageLabel}`,
  title: (languageLabel) => `ローカル認識設定 · ${languageLabel}`,
  description: 'コアアプリのインストールに OCR/STT は必須ではありません。OCR には ffmpeg と Tesseract、音声認識には whisper.cpp と Whisper モデルが必要です。使う環境のコマンドをコピーして実行し、ターミナルを開き直してから再検出してください。',
  checking: '確認中…',
  checkAgain: 'インストール済み、再チェック',
  ready: '✅ 準備完了',
  needsConfig: '⚠️ 設定が必要',
  ffmpegUsage: '動画から音声を抽出します。',
  sttTitle: '音声認識 · whisper.cpp',
  sttFallback: 'whisper.cpp と Whisper モデルが必要です。',
  ocrTitle: '字幕 OCR · Tesseract',
  ocrFallback: (languageLabel) => `${languageLabel} 用の Tesseract 言語データが必要です。`,
  targetLanguagePackage: '対象言語パッケージ：',
  autoPackage: '自動選択',
  showCommands: 'インストールコマンドを表示',
  hideCommands: 'インストールコマンドを隠す',
  windowsTitle: 'Windows ネイティブ PowerShell',
  whisperUnixTitle: 'Whisper .env（Linux / WSL / macOS）',
  whisperWindowsTitle: 'Whisper .env（Windows ネイティブ PowerShell）',
  platformQuestion: 'オペレーティングシステムを選択',
  platformWindows: 'Windows ネイティブ PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'ステップ 1 は基本ツールを準備します。Windows ではこの notebook の tools/ に置き、Linux / macOS ではシステムのパッケージマネージャーを使います。ステップ 2〜5 は先にこの notebook インストールディレクトリへ移動してから実行してください。',
  windowsBuildToolsNote: 'Windows で whisper.cpp をビルドするには Visual Studio Build Tools / MSVC C++ toolchain も必要です。',
  stepInstallBaseTools: 'ステップ 1 · 基本ツールをインストール',
  stepInstallWhisper: 'ステップ 2 · whisper.cpp CLI をインストール',
  stepDownloadModel: 'ステップ 3 · Whisper モデルを手動ダウンロード',
  stepWriteEnv: 'ステップ 4 · .env に絶対パスを書き込む',
  stepVerifyRestart: 'ステップ 5 · 確認して再起動',
  modelDownloadNote: './models に多言語の base または small モデルを手動でダウンロードします。英語以外では *.en.bin を避けてください。',
  envPathNote: '現在の notebook ディレクトリ内の whisper.cpp とモデルの絶対パスを .env に書き込みます。notebook ディレクトリを移動したら再生成してください。',
  restartNote: 'バイナリとモデルを確認し、アプリを再起動して再チェックします。',
  copied: 'コピー済み',
  copyCommand: (title) => `${title} コマンドをコピー`,
  aptNote: '# apt-get が Docker / Chrome / NVIDIA / GPG key などのエラーを出す場合は、先にシステムの apt ソースを修正してください。手動インストール後に「再チェック」しても構いません。',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# ${languageLabel} OCR でまだ ${requiredLanguage} が不足する場合は、対応する traineddata を Tesseract の tessdata ディレクトリに入れてください。`,
  windowsPathNote: '# インストール後は PowerShell を開き直し、サービスプロセスが新しい PATH を読めるようにしてください。',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# ${languageLabel} OCR でまだ ${requiredLanguage} が不足する場合は、対応する traineddata を Tesseract の tessdata ディレクトリに入れてください。`,
  whisperModelNote: '# 多言語モデルを推奨します。英語以外では *.en.bin を使わないでください。',
};

const KO_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `로컬 인식 설정 ${languageLabel}`,
  title: (languageLabel) => `로컬 인식 설정 · ${languageLabel}`,
  description: '핵심 앱 설치에는 OCR/STT가 필수는 아닙니다. OCR에는 ffmpeg와 Tesseract가 필요하고, 음성 인식에는 whisper.cpp와 다운로드한 Whisper 모델도 필요합니다. 사용하는 시스템의 명령을 복사해 실행한 뒤 터미널을 다시 열고 다시 검사하세요.',
  checking: '확인 중…',
  checkAgain: '설치했어요, 다시 확인',
  ready: '✅ 준비됨',
  needsConfig: '⚠️ 설정 필요',
  ffmpegUsage: '동영상에서 오디오를 추출합니다.',
  sttTitle: '음성 인식 · whisper.cpp',
  sttFallback: 'whisper.cpp와 Whisper 모델이 필요합니다.',
  ocrTitle: '자막 OCR · Tesseract',
  ocrFallback: (languageLabel) => `${languageLabel}용 Tesseract 언어 데이터가 필요합니다.`,
  targetLanguagePackage: '대상 언어 패키지: ',
  autoPackage: '자동 선택',
  showCommands: '설치 명령 보기',
  hideCommands: '설치 명령 숨기기',
  windowsTitle: 'Windows 네이티브 PowerShell',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (Windows 네이티브 PowerShell)',
  platformQuestion: '운영체제 선택',
  platformWindows: 'Windows 네이티브 PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: '1단계는 기본 도구를 준비합니다. Windows는 이 notebook의 tools/ 폴더에 저장하고, Linux / macOS는 시스템 패키지 관리자를 사용합니다. 2–5단계는 먼저 이 notebook 설치 디렉터리로 이동한 뒤 실행하세요.',
  windowsBuildToolsNote: 'Windows에서 whisper.cpp를 빌드하려면 Visual Studio Build Tools / MSVC C++ toolchain도 필요합니다.',
  stepInstallBaseTools: '1단계 · 기본 도구 설치',
  stepInstallWhisper: '2단계 · whisper.cpp CLI 설치',
  stepDownloadModel: '3단계 · Whisper 모델 수동 다운로드',
  stepWriteEnv: '4단계 · .env에 절대 경로 쓰기',
  stepVerifyRestart: '5단계 · 확인 후 재시작',
  modelDownloadNote: './models에 다국어 base 또는 small 모델을 직접 다운로드하세요. 영어가 아닌 오디오에는 *.en.bin을 피하세요.',
  envPathNote: '현재 notebook 디렉터리 아래 whisper.cpp와 모델의 절대 경로를 .env에 씁니다. notebook 디렉터리를 옮기면 경로를 다시 생성하세요.',
  restartNote: '바이너리와 모델을 확인한 뒤 앱을 재시작하고 다시 검사하세요.',
  copied: '복사됨',
  copyCommand: (title) => `${title} 명령 복사`,
  aptNote: '# apt-get에서 Docker / Chrome / NVIDIA / GPG key 오류가 나면 먼저 시스템 apt 소스를 고치세요. 직접 설치한 뒤 다시 확인해도 됩니다.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# ${languageLabel} OCR에 ${requiredLanguage}가 아직 없으면 해당 traineddata를 Tesseract tessdata 디렉터리에 설치하세요.`,
  windowsPathNote: '# 설치 후 PowerShell을 다시 열어 서비스 프로세스가 새 PATH를 읽게 하세요.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# ${languageLabel} OCR에 ${requiredLanguage}가 아직 없으면 해당 traineddata를 Tesseract tessdata 디렉터리에 넣으세요.`,
  whisperModelNote: '# 다국어 모델을 권장합니다. 영어가 아닌 오디오에는 *.en.bin을 사용하지 마세요.',
};

const FR_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `Configuration de la reconnaissance locale ${languageLabel}`,
  title: (languageLabel) => `Configuration de la reconnaissance locale · ${languageLabel}`,
  description: 'L’installation principale n’exige pas OCR/STT. L’OCR nécessite ffmpeg et Tesseract ; la reconnaissance vocale nécessite aussi whisper.cpp et un modèle Whisper téléchargé. Copiez les commandes adaptées au système, rouvrez le terminal, puis relancez la vérification.',
  checking: 'Vérification…',
  checkAgain: 'Installé, vérifier à nouveau',
  ready: '✅ Prêt',
  needsConfig: '⚠️ Configuration requise',
  ffmpegUsage: 'Sert à extraire l’audio des vidéos.',
  sttTitle: 'Reconnaissance vocale · whisper.cpp',
  sttFallback: 'Nécessite whisper.cpp et un modèle Whisper.',
  ocrTitle: 'OCR des sous-titres · Tesseract',
  ocrFallback: (languageLabel) => `Nécessite les données linguistiques Tesseract pour ${languageLabel}.`,
  targetLanguagePackage: 'Paquet de langue cible : ',
  autoPackage: 'auto',
  showCommands: 'Afficher les commandes d’installation',
  hideCommands: 'Masquer les commandes d’installation',
  windowsTitle: 'PowerShell Windows natif',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (PowerShell Windows natif)',
  platformQuestion: 'Choisir le système',
  platformWindows: 'PowerShell Windows natif',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'L’étape 1 prépare les outils de base : sous Windows ils sont placés dans tools/ de ce notebook ; Linux / macOS utilisent le gestionnaire de paquets système. Exécutez les étapes 2 à 5 après être entré dans ce dossier d’installation du notebook.',
  windowsBuildToolsNote: 'La compilation de whisper.cpp sous Windows nécessite aussi Visual Studio Build Tools / la chaîne C++ MSVC.',
  stepInstallBaseTools: 'Étape 1 · Installer les outils',
  stepInstallWhisper: 'Étape 2 · Installer le CLI whisper.cpp',
  stepDownloadModel: 'Étape 3 · Télécharger le modèle manuellement',
  stepWriteEnv: 'Étape 4 · Écrire les chemins absolus dans .env',
  stepVerifyRestart: 'Étape 5 · Vérifier et redémarrer',
  modelDownloadNote: 'Téléchargez manuellement un modèle multilingue base ou small dans ./models ; évitez *.en.bin pour l’audio non anglais.',
  envPathNote: 'Écrivez dans .env les chemins absolus de whisper.cpp et du modèle sous le dossier notebook actuel ; régénérez-les si vous déplacez ce dossier.',
  restartNote: 'Vérifiez les binaires et le modèle, puis redémarrez.',
  copied: 'Copié',
  copyCommand: (title) => `Copier la commande ${title}`,
  aptNote: '# Si apt-get signale des erreurs Docker / Chrome / NVIDIA / clé GPG, corrigez d’abord les sources apt du système ; vous pouvez aussi installer manuellement puis relancer la vérification.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# Si l’OCR ${languageLabel} manque encore ${requiredLanguage}, installez le fichier traineddata correspondant dans le dossier tessdata de Tesseract.`,
  windowsPathNote: '# Rouvrez PowerShell après l’installation pour que le processus de service lise le nouveau PATH.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# Si l’OCR ${languageLabel} manque encore ${requiredLanguage}, placez le fichier traineddata correspondant dans le dossier tessdata de Tesseract.`,
  whisperModelNote: '# Utilisez un modèle multilingue ; n’utilisez pas *.en.bin pour l’audio non anglais.',
};

const DE_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `Lokale Erkennung einrichten ${languageLabel}`,
  title: (languageLabel) => `Lokale Erkennung einrichten · ${languageLabel}`,
  description: 'Die Kerninstallation erzwingt kein OCR/STT. OCR benötigt ffmpeg und Tesseract; Spracherkennung benötigt zusätzlich whisper.cpp und ein heruntergeladenes Whisper-Modell. Kopiere die Befehle für dein System, öffne das Terminal neu und prüfe erneut.',
  checking: 'Prüfung läuft…',
  checkAgain: 'Installiert, erneut prüfen',
  ready: '✅ Bereit',
  needsConfig: '⚠️ Einrichtung nötig',
  ffmpegUsage: 'Extrahiert Audio aus Videos.',
  sttTitle: 'Spracherkennung · whisper.cpp',
  sttFallback: 'Benötigt whisper.cpp und ein Whisper-Modell.',
  ocrTitle: 'Untertitel-OCR · Tesseract',
  ocrFallback: (languageLabel) => `Benötigt Tesseract-Sprachdaten für ${languageLabel}.`,
  targetLanguagePackage: 'Zielsprachenpaket: ',
  autoPackage: 'automatisch',
  showCommands: 'Installationsbefehle anzeigen',
  hideCommands: 'Installationsbefehle ausblenden',
  windowsTitle: 'Natives Windows PowerShell',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (natives Windows PowerShell)',
  platformQuestion: 'Betriebssystem wählen',
  platformWindows: 'Natives Windows PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'Schritt 1 bereitet Basiswerkzeuge vor: Windows legt sie im tools/-Ordner dieses Notebooks ab; Linux / macOS nutzen den Systempaketmanager. Für Schritt 2–5 zuerst in diesen Notebook-Installationsordner wechseln.',
  windowsBuildToolsNote: 'Zum Bauen von whisper.cpp unter Windows werden außerdem Visual Studio Build Tools / die MSVC-C++-Toolchain benötigt.',
  stepInstallBaseTools: 'Schritt 1 · Basiswerkzeuge installieren',
  stepInstallWhisper: 'Schritt 2 · whisper.cpp CLI installieren',
  stepDownloadModel: 'Schritt 3 · Whisper-Modell manuell laden',
  stepWriteEnv: 'Schritt 4 · Absolute Pfade in .env schreiben',
  stepVerifyRestart: 'Schritt 5 · Prüfen und neu starten',
  modelDownloadNote: 'Lade ein mehrsprachiges base- oder small-Modell manuell nach ./models; für nicht-englisches Audio kein *.en.bin verwenden.',
  envPathNote: 'Schreibe die absoluten Pfade zu whisper.cpp und Modell im aktuellen Notebook-Ordner in .env; nach dem Verschieben des Ordners neu erzeugen.',
  restartNote: 'Binärdateien und Modell prüfen, dann App neu starten und erneut prüfen.',
  copied: 'Kopiert',
  copyCommand: (title) => `${title}-Befehl kopieren`,
  aptNote: '# Wenn apt-get Docker- / Chrome- / NVIDIA- / GPG-Key-Fehler meldet, repariere zuerst die apt-Quellen des Systems; alternativ manuell installieren und erneut prüfen.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# Wenn OCR für ${languageLabel} weiterhin ${requiredLanguage} vermisst, installiere die passende traineddata-Datei im Tesseract-tessdata-Verzeichnis.`,
  windowsPathNote: '# Öffne PowerShell nach der Installation neu, damit der Dienstprozess den neuen PATH liest.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# Wenn OCR für ${languageLabel} weiterhin ${requiredLanguage} vermisst, lege die passende traineddata-Datei im Tesseract-tessdata-Verzeichnis ab.`,
  whisperModelNote: '# Nutze ein mehrsprachiges Modell; für nicht-englisches Audio kein *.en.bin verwenden.',
};

const ES_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `Configuración de reconocimiento local ${languageLabel}`,
  title: (languageLabel) => `Configuración de reconocimiento local · ${languageLabel}`,
  description: 'La instalación principal no exige OCR/STT. OCR necesita ffmpeg y Tesseract; el reconocimiento de voz también necesita whisper.cpp y un modelo Whisper descargado. Copia los comandos para tu sistema, vuelve a abrir la terminal y ejecuta la comprobación otra vez.',
  checking: 'Comprobando…',
  checkAgain: 'Ya lo instalé, comprobar otra vez',
  ready: '✅ Listo',
  needsConfig: '⚠️ Requiere configuración',
  ffmpegUsage: 'Se usa para extraer audio de vídeos.',
  sttTitle: 'Reconocimiento de voz · whisper.cpp',
  sttFallback: 'Requiere whisper.cpp y un modelo Whisper.',
  ocrTitle: 'OCR de subtítulos · Tesseract',
  ocrFallback: (languageLabel) => `Requiere datos de idioma de Tesseract para ${languageLabel}.`,
  targetLanguagePackage: 'Paquete de idioma objetivo: ',
  autoPackage: 'auto',
  showCommands: 'Ver comandos de instalación',
  hideCommands: 'Ocultar comandos de instalación',
  windowsTitle: 'PowerShell nativo de Windows',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (PowerShell nativo de Windows)',
  platformQuestion: 'Elige el sistema operativo',
  platformWindows: 'PowerShell nativo de Windows',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'El paso 1 prepara herramientas base: en Windows se guardan en tools/ dentro de este notebook; Linux / macOS usan el gestor de paquetes del sistema. Ejecuta los pasos 2–5 después de entrar en este directorio de instalación del notebook.',
  windowsBuildToolsNote: 'Compilar whisper.cpp en Windows también requiere Visual Studio Build Tools / la cadena de herramientas C++ de MSVC.',
  stepInstallBaseTools: 'Paso 1 · Instalar herramientas base',
  stepInstallWhisper: 'Paso 2 · Instalar whisper.cpp CLI',
  stepDownloadModel: 'Paso 3 · Descargar el modelo manualmente',
  stepWriteEnv: 'Paso 4 · Escribir rutas absolutas en .env',
  stepVerifyRestart: 'Paso 5 · Verificar y reiniciar',
  modelDownloadNote: 'Descarga manualmente un modelo multilingüe base o small en ./models; evita *.en.bin para audio que no sea inglés.',
  envPathNote: 'Escribe en .env las rutas absolutas de whisper.cpp y del modelo dentro del directorio actual del notebook; regenéralas si mueves ese directorio.',
  restartNote: 'Verifica binarios y modelo, reinicia la app y vuelve a comprobar.',
  copied: 'Copiado',
  copyCommand: (title) => `Copiar comando ${title}`,
  aptNote: '# Si apt-get informa errores de Docker / Chrome / NVIDIA / clave GPG, corrige primero las fuentes apt del sistema; también puedes instalar manualmente y volver a comprobar.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# Si OCR de ${languageLabel} aún no encuentra ${requiredLanguage}, instala el traineddata correspondiente en el directorio tessdata de Tesseract.`,
  windowsPathNote: '# Vuelve a abrir PowerShell después de instalar para que el proceso del servicio lea el nuevo PATH.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# Si OCR de ${languageLabel} aún no encuentra ${requiredLanguage}, coloca el traineddata correspondiente en el directorio tessdata de Tesseract.`,
  whisperModelNote: '# Usa un modelo multilingüe; no uses *.en.bin para audio que no sea inglés.',
};

const RU_COPY: RecognitionSetupCopy = {
  ...EN_COPY,
  ariaLabel: (languageLabel) => `Настройка локального распознавания ${languageLabel}`,
  title: (languageLabel) => `Настройка локального распознавания · ${languageLabel}`,
  description: 'Основная установка не требует OCR/STT. Для OCR нужны ffmpeg и Tesseract; для распознавания речи также нужны whisper.cpp и скачанная модель Whisper. Скопируйте команды для своей системы, заново откройте терминал и повторите проверку.',
  checking: 'Проверка…',
  checkAgain: 'Установлено, проверить снова',
  ready: '✅ Готово',
  needsConfig: '⚠️ Нужна настройка',
  ffmpegUsage: 'Используется для извлечения аудио из видео.',
  sttTitle: 'Распознавание речи · whisper.cpp',
  sttFallback: 'Требуются whisper.cpp и модель Whisper.',
  ocrTitle: 'OCR субтитров · Tesseract',
  ocrFallback: (languageLabel) => `Требуются языковые данные Tesseract для ${languageLabel}.`,
  targetLanguagePackage: 'Пакет целевого языка: ',
  autoPackage: 'авто',
  showCommands: 'Показать команды установки',
  hideCommands: 'Скрыть команды установки',
  windowsTitle: 'Нативный Windows PowerShell',
  whisperUnixTitle: 'Whisper .env (Linux / WSL / macOS)',
  whisperWindowsTitle: 'Whisper .env (нативный Windows PowerShell)',
  platformQuestion: 'Выберите операционную систему',
  platformWindows: 'Нативный Windows PowerShell',
  platformLinux: 'Linux / WSL',
  platformMacos: 'macOS',
  installLocationNote: 'Шаг 1 подготавливает базовые инструменты: в Windows они сохраняются в tools/ этого notebook; Linux / macOS используют системный менеджер пакетов. Шаги 2–5 выполняйте после перехода в каталог установки этого notebook.',
  windowsBuildToolsNote: 'Для сборки whisper.cpp в Windows также требуются Visual Studio Build Tools / цепочка инструментов C++ MSVC.',
  stepInstallBaseTools: 'Шаг 1 · Установить базовые инструменты',
  stepInstallWhisper: 'Шаг 2 · Установить whisper.cpp CLI',
  stepDownloadModel: 'Шаг 3 · Скачать модель вручную',
  stepWriteEnv: 'Шаг 4 · Записать абсолютные пути в .env',
  stepVerifyRestart: 'Шаг 5 · Проверить и перезапустить',
  modelDownloadNote: 'Вручную скачайте многоязычную модель base или small в ./models; для неанглийского аудио не используйте *.en.bin.',
  envPathNote: 'Запишите в .env абсолютные пути к whisper.cpp и модели в текущем каталоге notebook; после переноса каталога создайте их заново.',
  restartNote: 'Проверьте бинарные файлы и модель, затем перезапустите приложение и повторите проверку.',
  copied: 'Скопировано',
  copyCommand: (title) => `Скопировать команду ${title}`,
  aptNote: '# Если apt-get сообщает об ошибках Docker / Chrome / NVIDIA / GPG key, сначала исправьте системные apt-источники; также можно установить вручную и повторить проверку.',
  macosTessdataNote: (languageLabel, requiredLanguage) => `# Если OCR для ${languageLabel} всё ещё не находит ${requiredLanguage}, установите соответствующий traineddata в каталог tessdata Tesseract.`,
  windowsPathNote: '# После установки заново откройте PowerShell, чтобы сервисный процесс прочитал новый PATH.',
  windowsTessdataNote: (languageLabel, requiredLanguage) => `# Если OCR для ${languageLabel} всё ещё не находит ${requiredLanguage}, поместите соответствующий traineddata в каталог tessdata Tesseract.`,
  whisperModelNote: '# Используйте многоязычную модель; не используйте *.en.bin для неанглийского аудио.',
};

const COPY_BY_LANGUAGE: Record<UiLanguage, RecognitionSetupCopy> = {
  中文: ZH_COPY,
  英语: EN_COPY,
  日语: JA_COPY,
  韩语: KO_COPY,
  法语: FR_COPY,
  德语: DE_COPY,
  西班牙语: ES_COPY,
  俄语: RU_COPY,
};

function copyFor(language: UiLanguage): RecognitionSetupCopy {
  return COPY_BY_LANGUAGE[language];
}

function statusLabel(ready: boolean, copy: RecognitionSetupCopy): string {
  return ready ? copy.ready : copy.needsConfig;
}

function safeTesseractLanguage(requiredLanguage: string): string {
  return /^[A-Za-z0-9_]+(\+[A-Za-z0-9_]+)*$/.test(requiredLanguage) ? requiredLanguage : 'eng';
}

function tesseractLanguagePackages(requiredLanguage: string): string[] {
  return requiredLanguage
    .split('+')
    .map((language) => language.trim())
    .filter(Boolean)
    .map((language) => APT_TESSERACT_PACKAGES[language] ?? language);
}

function buildGuides(
  readiness: LocalRecognitionReadinessDto | null,
  copy: RecognitionSetupCopy,
  languageLabel: string,
): Record<InstallPlatform, PlatformGuide> {
  const requiredLanguage = safeTesseractLanguage(readiness?.ocr?.requiredLanguage ?? readiness?.ocr?.language ?? 'eng');
  const aptPackages = tesseractLanguagePackages(requiredLanguage)
    .map((language) => `tesseract-ocr-${language}`)
    .join(' ');
  const windowsTessdataNote = copy.windowsTessdataNote(languageLabel, requiredLanguage);
  const macosTessdataNote = copy.macosTessdataNote(languageLabel, requiredLanguage);
  const windowsOneLineInstaller = `$env:CVN_TESSERACT_LANG='${requiredLanguage}'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex`;
  const unixOneLineInstaller = `curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG='${requiredLanguage}' bash`;
  const linuxBase = [
    'sudo apt-get update',
    `sudo apt-get install -y ffmpeg tesseract-ocr ${aptPackages} git cmake build-essential`,
  ].join('\n');
  const windowsBase = [
    '$ErrorActionPreference = "Stop"',
    '$AppRoot = (Get-Location).Path',
    '$ToolsRoot = Join-Path $AppRoot "tools"',
    '$FfmpegRoot = Join-Path $ToolsRoot "ffmpeg"',
    '$TesseractRoot = Join-Path $ToolsRoot "tesseract"',
    'New-Item -ItemType Directory -Force -Path $ToolsRoot, $FfmpegRoot, $TesseractRoot | Out-Null',
    '$FfmpegZip = Join-Path $ToolsRoot "ffmpeg-win64-gpl.zip"',
    '$FfmpegExe = Get-ChildItem $FfmpegRoot -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1',
    'if (-not $FfmpegExe) {',
    '  $FfmpegRelease = Invoke-RestMethod -Uri https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest',
    '  $FfmpegAsset = $FfmpegRelease.assets | Where-Object { $_.name -match "win64-gpl\\.zip$" -and $_.name -notmatch "shared" } | Select-Object -First 1',
    '  if (-not $FfmpegAsset) { throw "Could not find a Windows x64 GPL FFmpeg zip in the latest BtbN release." }',
    '  Invoke-WebRequest -Uri $FfmpegAsset.browser_download_url -OutFile $FfmpegZip',
    '  Expand-Archive -LiteralPath $FfmpegZip -DestinationPath $FfmpegRoot -Force',
    '}',
    '$TesseractExe = Join-Path $TesseractRoot "tesseract.exe"',
    'if (-not (Test-Path $TesseractExe)) {',
    '  $TesseractInstaller = Join-Path $ToolsRoot "tesseract-ocr-w64-setup-5.5.0.20241111.exe"',
    '  Invoke-WebRequest -Uri https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe -OutFile $TesseractInstaller',
    '  & $TesseractInstaller /S "/D=$TesseractRoot"',
    '  if ($LASTEXITCODE -ne 0) { throw "Tesseract installer failed with exit code $LASTEXITCODE" }',
    '}',
  ].join('\n');
  const windowsWhisper = [
    '$ErrorActionPreference = "Stop"',
    '$AppRoot = (Get-Location).Path',
    '$ToolsRoot = Join-Path $AppRoot "tools"',
    '$WhisperRoot = Join-Path $ToolsRoot "whisper.cpp"',
    'New-Item -ItemType Directory -Force -Path $ToolsRoot, $WhisperRoot | Out-Null',
    '$WhisperZip = Join-Path $ToolsRoot "whisper-bin-x64.zip"',
    '$WhisperExe = Get-ChildItem $WhisperRoot -Recurse -Filter whisper-cli.exe -ErrorAction SilentlyContinue | Select-Object -First 1',
    'if (-not $WhisperExe) {',
    '  Invoke-WebRequest -Uri https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.6/whisper-bin-x64.zip -OutFile $WhisperZip',
    '  Expand-Archive -LiteralPath $WhisperZip -DestinationPath $WhisperRoot -Force',
    '}',
  ].join('\n');
  const unixWhisper = [
    'APP_ROOT="$(pwd)"',
    'WHISPER_ROOT="$APP_ROOT/tools/whisper.cpp"',
    'mkdir -p "$APP_ROOT/tools" "$APP_ROOT/models"',
    '[ -d "$WHISPER_ROOT" ] || git clone https://github.com/ggerganov/whisper.cpp.git "$WHISPER_ROOT"',
    'cmake -S "$WHISPER_ROOT" -B "$WHISPER_ROOT/build" -DCMAKE_BUILD_TYPE=Release',
    'cmake --build "$WHISPER_ROOT/build" --config Release',
  ].join('\n');
  const unixModel = [
    'mkdir -p models',
    'curl -L -o models/ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  ].join('\n');
  const windowsModel = [
    '$AppRoot = (Get-Location).Path',
    'New-Item -ItemType Directory -Force -Path (Join-Path $AppRoot "models") | Out-Null',
    'Invoke-WebRequest -Uri https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -OutFile (Join-Path $AppRoot "models\\ggml-small.bin")',
  ].join('\n');
  const windowsEnv = [
    '$ErrorActionPreference = "Stop"',
    '$AppRoot = (Get-Location).Path',
    '$ToolsRoot = Join-Path $AppRoot "tools"',
    '$FfmpegExe = (Get-ChildItem (Join-Path $ToolsRoot "ffmpeg") -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName',
    '$TesseractExe = Join-Path $ToolsRoot "tesseract\\tesseract.exe"',
    '$WhisperExe = (Get-ChildItem (Join-Path $ToolsRoot "whisper.cpp") -Recurse -Filter whisper-cli.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName',
    '$ModelPath = Join-Path $AppRoot "models\\ggml-small.bin"',
    'if (-not $FfmpegExe) { throw "ffmpeg.exe not found under tools\\ffmpeg; rerun Step 1." }',
    'if (-not (Test-Path $TesseractExe)) { throw "tesseract.exe not found under tools\\tesseract; rerun Step 1." }',
    'if (-not $WhisperExe) { throw "whisper-cli.exe not found under tools\\whisper.cpp; rerun Step 2." }',
    'if (-not (Test-Path $ModelPath)) { throw "Whisper model not found under models; rerun Step 3." }',
    '@"',
    'CVN_FFMPEG_PATH=$FfmpegExe',
    'CVN_OCR_PROVIDER=tesseract',
    'CVN_TESSERACT_PATH=$TesseractExe',
    'CVN_TESSERACT_TIMEOUT_MS=30000',
    'CVN_STT_PROVIDER=whisper.cpp',
    'CVN_WHISPER_CPP_PATH=$WhisperExe',
    'CVN_WHISPER_CPP_MODEL=$ModelPath',
    'CVN_WHISPER_CPP_TIMEOUT_MS=120000',
    '"@ | Add-Content -Encoding UTF8 .env',
  ].join('\n');
  const unixEnv = [
    'APP_ROOT="$(pwd)"',
    'WHISPER_ROOT="$APP_ROOT/tools/whisper.cpp"',
    'cat >> .env <<EOF',
    'CVN_STT_PROVIDER=whisper.cpp',
    'CVN_WHISPER_CPP_PATH=$WHISPER_ROOT/build/bin/whisper-cli',
    'CVN_WHISPER_CPP_MODEL=$APP_ROOT/models/ggml-small.bin',
    'CVN_WHISPER_CPP_TIMEOUT_MS=120000',
    'EOF',
  ].join('\n');
  const windowsVerify = [
    '$ErrorActionPreference = "Stop"',
    '$AppRoot = (Get-Location).Path',
    '$ToolsRoot = Join-Path $AppRoot "tools"',
    '$FfmpegExe = (Get-ChildItem (Join-Path $ToolsRoot "ffmpeg") -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName',
    '$TesseractExe = Join-Path $ToolsRoot "tesseract\\tesseract.exe"',
    '$WhisperExe = (Get-ChildItem (Join-Path $ToolsRoot "whisper.cpp") -Recurse -Filter whisper-cli.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName',
    '$ModelPath = Join-Path $AppRoot "models\\ggml-small.bin"',
    'if (-not $FfmpegExe) { throw "ffmpeg.exe not found under tools\\ffmpeg" }',
    'if (-not (Test-Path $TesseractExe)) { throw "tesseract.exe not found under tools\\tesseract" }',
    'if (-not $WhisperExe) { throw "whisper-cli.exe not found under tools\\whisper.cpp" }',
    'if (-not (Test-Path $ModelPath)) { throw "Whisper model not found under models" }',
    '& $FfmpegExe -version',
    '& $TesseractExe --version',
    '& $WhisperExe --help',
    'Test-Path $ModelPath',
  ].join('\n');
  const unixVerify = [
    'ffmpeg -version',
    'tesseract --version',
    'test -x tools/whisper.cpp/build/bin/whisper-cli',
    'test -f models/ggml-small.bin',
  ].join('\n');

  return {
    windows: {
      platform: 'windows',
      title: copy.platformWindows,
      quickStep: { title: copy.stepOneLineInstall, description: copy.oneLineInstallDescription, command: windowsOneLineInstaller },
      advancedSteps: [
        { title: copy.stepInstallBaseTools, description: `${copy.installLocationNote} ${windowsTessdataNote}`, command: windowsBase },
        { title: copy.stepInstallWhisper, description: copy.installLocationNote, command: windowsWhisper },
        { title: copy.stepDownloadModel, description: copy.modelDownloadNote, command: windowsModel },
        { title: copy.stepWriteEnv, description: copy.envPathNote, command: windowsEnv },
        { title: copy.stepVerifyRestart, description: copy.restartNote, command: windowsVerify },
      ],
    },
    linux: {
      platform: 'linux',
      title: copy.platformLinux,
      quickStep: { title: copy.stepOneLineInstall, description: copy.oneLineInstallDescription, command: unixOneLineInstaller },
      advancedSteps: [
        { title: copy.stepInstallBaseTools, description: copy.installLocationNote, command: linuxBase },
        { title: copy.stepInstallWhisper, description: copy.installLocationNote, command: unixWhisper },
        { title: copy.stepDownloadModel, description: copy.modelDownloadNote, command: unixModel },
        { title: copy.stepWriteEnv, description: copy.envPathNote, command: unixEnv },
        { title: copy.stepVerifyRestart, description: copy.restartNote, command: unixVerify },
      ],
    },
    macos: {
      platform: 'macos',
      title: copy.platformMacos,
      quickStep: { title: copy.stepOneLineInstall, description: copy.oneLineInstallDescription, command: unixOneLineInstaller },
      advancedSteps: [
        { title: copy.stepInstallBaseTools, description: `${copy.installLocationNote} ${macosTessdataNote}`, command: 'brew install ffmpeg tesseract git cmake' },
        { title: copy.stepInstallWhisper, description: copy.installLocationNote, command: unixWhisper },
        { title: copy.stepDownloadModel, description: copy.modelDownloadNote, command: unixModel },
        { title: copy.stepWriteEnv, description: copy.envPathNote, command: unixEnv },
        { title: copy.stepVerifyRestart, description: copy.restartNote, command: unixVerify },
      ],
    },
  };
}

async function copyText(text: string) {
  await navigator.clipboard?.writeText(text);
}

export function RecognitionSetupCard({ targetLanguage, readiness, loading, error, onRefresh }: RecognitionSetupCardProps) {
  const { language } = useI18n();
  const copy = copyFor(language);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [advancedCommandsOpen, setAdvancedCommandsOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<InstallPlatform>('windows');
  const languageLabel = getNativeLanguageLabel(targetLanguage);
  const guides = useMemo(() => buildGuides(readiness, copy, languageLabel), [copy, readiness, languageLabel]);
  const selectedGuide = guides[selectedPlatform];
  const sttReady = Boolean(readiness?.stt?.ready);
  const ocrReady = Boolean(readiness?.ocr?.ready);
  const ffmpegReady = Boolean(readiness?.ffmpeg?.ready);
  const displayedRequiredLanguage = readiness?.ocr
    ? safeTesseractLanguage(readiness.ocr.requiredLanguage ?? readiness.ocr.language ?? 'eng')
    : copy.autoPackage;

  return (
    <section className="recognition-setup-card" aria-label={copy.ariaLabel(languageLabel)}>
      <header className="recognition-setup-header">
        <div>
          <h3>{copy.title(languageLabel)}</h3>
          <p>{copy.description}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? copy.checking : copy.checkAgain}</button>
      </header>

      {error ? <p className="recognition-setup-warning">{error}</p> : null}

      <div className="recognition-setup-grid">
        <div className="recognition-setup-status">
          <strong>FFmpeg</strong>
          <span>{statusLabel(ffmpegReady, copy)}</span>
          <small>{readiness?.ffmpeg?.message ?? copy.ffmpegUsage}</small>
        </div>
        <div className="recognition-setup-status">
          <strong>{copy.sttTitle}</strong>
          <span>{statusLabel(sttReady, copy)}</span>
          <small>{readiness?.stt?.message ?? copy.sttFallback}</small>
          {readiness?.stt?.modelWarning ? <small className="recognition-setup-warning">{readiness.stt.modelWarning}</small> : null}
        </div>
        <div className="recognition-setup-status">
          <strong>{copy.ocrTitle}</strong>
          <span>{statusLabel(ocrReady, copy)}</span>
          <small>{readiness?.ocr?.languageMessage ?? copy.ocrFallback(languageLabel)}</small>
          <small>{copy.targetLanguagePackage}{displayedRequiredLanguage}</small>
        </div>
      </div>

      <div className="recognition-setup-actions">
        <button type="button" onClick={() => setCommandsOpen((open) => !open)}>
          {commandsOpen ? copy.hideCommands : copy.showCommands}
        </button>
      </div>

      {commandsOpen ? (
        <div className="recognition-setup-commands">
          <p>{copy.installLocationNote}</p>
          <div className="recognition-setup-platforms" role="group" aria-label={copy.platformQuestion}>
            {(['windows', 'linux', 'macos'] as InstallPlatform[]).map((platform) => (
              <button
                key={platform}
                type="button"
                aria-pressed={selectedPlatform === platform}
                onClick={() => setSelectedPlatform(platform)}
              >
                {guides[platform].title}
              </button>
            ))}
          </div>
          <section className="recognition-setup-guide-step">
            <h4>{selectedGuide.quickStep.title}</h4>
            <p>{selectedGuide.quickStep.description}</p>
            {selectedGuide.quickStep.command ? (
              <CommandBlock
                key={`${selectedPlatform}:quick:${selectedGuide.quickStep.command}`}
                title={selectedGuide.quickStep.title}
                command={selectedGuide.quickStep.command}
                copy={copy}
                showTitle={false}
              />
            ) : null}
          </section>
          <button type="button" onClick={() => setAdvancedCommandsOpen((open) => !open)}>
            {advancedCommandsOpen ? copy.hideAdvancedCommands : copy.showAdvancedCommands}
          </button>
          {advancedCommandsOpen ? (
            <div className="recognition-setup-advanced-commands">
              <p>{copy.advancedCommandsDescription}</p>
              {selectedGuide.advancedSteps.map((step) => (
                <section key={`${selectedPlatform}:${step.title}:${step.command ?? ''}`} className="recognition-setup-guide-step">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  {step.command ? <CommandBlock key={`${selectedPlatform}:${step.command}`} title={step.title} command={step.command} copy={copy} showTitle={false} /> : null}
                </section>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CommandBlock({
  title,
  command,
  copy,
  showTitle = true,
}: {
  title: string;
  command: string;
  copy: RecognitionSetupCopy;
  showTitle?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="recognition-setup-command-block">
      <div>
        {showTitle ? <strong>{title}</strong> : null}
        <button
          type="button"
          onClick={() => {
            void copyText(command).then(() => setCopied(true)).catch(() => setCopied(false));
          }}
        >
          {copied ? copy.copied : copy.copyCommand(title)}
        </button>
      </div>
      <pre>{command}</pre>
    </div>
  );
}
