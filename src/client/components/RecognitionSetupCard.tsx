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
  steps: InstallStep[];
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
  installLocationNote: '默认会安装到当前 notebook 目录下的 tools/ 和 models/。不要求放在 C 盘；如果 .env 写入真实绝对路径，任意目录都可以。',
  windowsBuildToolsNote: 'Windows 构建 whisper.cpp 还需要 Visual Studio Build Tools / MSVC C++ 工具链。',
  stepInstallBaseTools: '步骤 1 · 安装基础工具',
  stepInstallWhisper: '步骤 2 · 构建 whisper.cpp',
  stepDownloadModel: '步骤 3 · 手动下载 Whisper 模型',
  stepWriteEnv: '步骤 4 · 写入 .env 绝对路径',
  stepVerifyRestart: '步骤 5 · 验证并重启',
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
  installLocationNote: 'By default these commands install under the current notebook directory in tools/ and models/. C: drive is not required; any path is fine when .env contains real absolute paths.',
  windowsBuildToolsNote: 'Building whisper.cpp on Windows also requires Visual Studio Build Tools / the MSVC C++ toolchain.',
  stepInstallBaseTools: 'Step 1 · Install base tools',
  stepInstallWhisper: 'Step 2 · Build whisper.cpp',
  stepDownloadModel: 'Step 3 · Download Whisper model manually',
  stepWriteEnv: 'Step 4 · Write absolute paths to .env',
  stepVerifyRestart: 'Step 5 · Verify and restart',
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
  installLocationNote: '既定では現在の notebook ディレクトリ配下の tools/ と models/ に入ります。C ドライブは不要で、.env に実際の絶対パスを書けば任意の場所で使えます。',
  windowsBuildToolsNote: 'Windows で whisper.cpp をビルドするには Visual Studio Build Tools / MSVC C++ toolchain も必要です。',
  stepInstallBaseTools: 'ステップ 1 · 基本ツールをインストール',
  stepInstallWhisper: 'ステップ 2 · whisper.cpp をビルド',
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
  installLocationNote: '기본값은 현재 notebook 디렉터리 아래 tools/와 models/에 설치합니다. C 드라이브가 아니어도 되며, .env에 실제 절대 경로를 쓰면 어떤 경로든 사용할 수 있습니다.',
  windowsBuildToolsNote: 'Windows에서 whisper.cpp를 빌드하려면 Visual Studio Build Tools / MSVC C++ toolchain도 필요합니다.',
  stepInstallBaseTools: '1단계 · 기본 도구 설치',
  stepInstallWhisper: '2단계 · whisper.cpp 빌드',
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
  installLocationNote: 'Par défaut, ces commandes installent dans tools/ et models/ sous le dossier notebook actuel. Le disque C: n’est pas requis ; tout chemin convient si .env contient de vrais chemins absolus.',
  windowsBuildToolsNote: 'La compilation de whisper.cpp sous Windows nécessite aussi Visual Studio Build Tools / la chaîne C++ MSVC.',
  stepInstallBaseTools: 'Étape 1 · Installer les outils',
  stepInstallWhisper: 'Étape 2 · Compiler whisper.cpp',
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
  installLocationNote: 'Standardmäßig wird im aktuellen Notebook-Ordner unter tools/ und models/ installiert. Laufwerk C: ist nicht nötig; jeder Pfad funktioniert, wenn .env echte absolute Pfade enthält.',
  windowsBuildToolsNote: 'Zum Bauen von whisper.cpp unter Windows werden außerdem Visual Studio Build Tools / die MSVC-C++-Toolchain benötigt.',
  stepInstallBaseTools: 'Schritt 1 · Basiswerkzeuge installieren',
  stepInstallWhisper: 'Schritt 2 · whisper.cpp bauen',
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
  installLocationNote: 'De forma predeterminada se instala en tools/ y models/ dentro del directorio actual del notebook. No hace falta la unidad C:; cualquier ruta sirve si .env contiene rutas absolutas reales.',
  windowsBuildToolsNote: 'Compilar whisper.cpp en Windows también requiere Visual Studio Build Tools / la cadena de herramientas C++ de MSVC.',
  stepInstallBaseTools: 'Paso 1 · Instalar herramientas base',
  stepInstallWhisper: 'Paso 2 · Compilar whisper.cpp',
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
  installLocationNote: 'По умолчанию установка идёт в tools/ и models/ внутри текущего каталога notebook. Диск C: не обязателен; подойдёт любой путь, если в .env указаны реальные абсолютные пути.',
  windowsBuildToolsNote: 'Для сборки whisper.cpp в Windows также требуются Visual Studio Build Tools / цепочка инструментов C++ MSVC.',
  stepInstallBaseTools: 'Шаг 1 · Установить базовые инструменты',
  stepInstallWhisper: 'Шаг 2 · Собрать whisper.cpp',
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

function runLocationNote(language: UiLanguage, platform: InstallPlatform): string {
  if (language === '中文') {
    if (platform === 'windows') return '请在单词本安装目录运行这些命令，也就是包含 package.json 和 .env 的目录。Windows 请选择 PowerShell。';
    if (platform === 'linux') return 'Linux / WSL 请在终端里进入同一个单词本目录后运行，也就是包含 package.json 和 .env 的目录。';
    return 'macOS 请在终端里进入单词本安装目录后运行，也就是包含 package.json 和 .env 的目录。';
  }
  if (language === '日语') {
    if (platform === 'windows') return 'package.json と .env がある単語帳インストールディレクトリで実行してください。Windows では PowerShell を使ってください。';
    if (platform === 'linux') return 'Linux / WSL では、ターミナルで package.json と .env がある同じ単語帳ディレクトリに移動してから実行してください。';
    return 'macOS では、ターミナルで package.json と .env がある単語帳ディレクトリに移動してから実行してください。';
  }
  if (language === '韩语') {
    if (platform === 'windows') return 'package.json과 .env가 있는 단어장 설치 디렉터리에서 실행하세요. Windows에서는 PowerShell을 사용하세요.';
    if (platform === 'linux') return 'Linux / WSL에서는 터미널에서 package.json과 .env가 있는 같은 단어장 디렉터리로 이동한 뒤 실행하세요.';
    return 'macOS에서는 터미널에서 package.json과 .env가 있는 단어장 디렉터리로 이동한 뒤 실행하세요.';
  }
  if (language === '法语') {
    if (platform === 'windows') return 'Exécutez ces commandes dans le dossier d’installation du carnet, celui qui contient package.json et .env. Sous Windows, utilisez PowerShell.';
    if (platform === 'linux') return 'Sous Linux / WSL, ouvrez un terminal dans le même dossier du carnet qui contient package.json et .env, puis exécutez les commandes.';
    return 'Sous macOS, ouvrez un terminal dans le dossier du carnet qui contient package.json et .env, puis exécutez les commandes.';
  }
  if (language === '德语') {
    if (platform === 'windows') return 'Führe diese Befehle im Installationsordner des Vokabelnotizbuchs aus, der package.json und .env enthält. Unter Windows PowerShell verwenden.';
    if (platform === 'linux') return 'Unter Linux / WSL im Terminal in denselben Notizbuchordner mit package.json und .env wechseln und dort ausführen.';
    return 'Unter macOS im Terminal in den Notizbuchordner mit package.json und .env wechseln und dort ausführen.';
  }
  if (language === '西班牙语') {
    if (platform === 'windows') return 'Ejecuta estos comandos en la carpeta de instalación del cuaderno, la que contiene package.json y .env. En Windows usa PowerShell.';
    if (platform === 'linux') return 'En Linux / WSL, entra con la terminal en la misma carpeta del cuaderno que contiene package.json y .env antes de ejecutar los comandos.';
    return 'En macOS, entra con la terminal en la carpeta del cuaderno que contiene package.json y .env antes de ejecutar los comandos.';
  }
  if (language === '俄语') {
    if (platform === 'windows') return 'Запускайте эти команды в папке установки словаря, где находятся package.json и .env. В Windows используйте PowerShell.';
    if (platform === 'linux') return 'В Linux / WSL перейдите в терминале в ту же папку словаря с package.json и .env, затем запускайте команды.';
    return 'В macOS перейдите в терминале в папку словаря с package.json и .env, затем запускайте команды.';
  }
  if (platform === 'windows') return 'Run these commands in the vocabulary notebook install directory, the folder that contains package.json and .env. On Windows, use PowerShell.';
  if (platform === 'linux') return 'On Linux / WSL, open a terminal in the same notebook directory that contains package.json and .env before running these commands.';
  return 'On macOS, open a terminal in the notebook directory that contains package.json and .env before running these commands.';
}

function statusLabel(ready: boolean, copy: RecognitionSetupCopy): string {
  return ready ? copy.ready : copy.needsConfig;
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
  const requiredLanguage = readiness?.ocr?.requiredLanguage ?? readiness?.ocr?.language ?? 'eng';
  const aptPackages = tesseractLanguagePackages(requiredLanguage)
    .map((language) => `tesseract-ocr-${language}`)
    .join(' ');
  const windowsTessdataNote = copy.windowsTessdataNote(languageLabel, requiredLanguage);
  const macosTessdataNote = copy.macosTessdataNote(languageLabel, requiredLanguage);
  const linuxBase = [
    'sudo apt-get update',
    `sudo apt-get install -y ffmpeg tesseract-ocr ${aptPackages} git cmake build-essential`,
  ].join('\n');
  const windowsBase = [
    'winget install --id Gyan.FFmpeg -e --source winget',
    'winget install --id UB-Mannheim.TesseractOCR -e --source winget',
    'winget install --id Git.Git -e --source winget',
    'winget install --id Kitware.CMake -e --source winget',
    'winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"',
  ].join('\n');
  const windowsWhisper = [
    '$AppRoot = (Get-Location).Path',
    '$WhisperRoot = Join-Path $AppRoot "tools\\whisper.cpp"',
    'New-Item -ItemType Directory -Force -Path (Join-Path $AppRoot "tools") | Out-Null',
    'New-Item -ItemType Directory -Force -Path (Join-Path $AppRoot "models") | Out-Null',
    'if (-not (Test-Path $WhisperRoot)) { git clone https://github.com/ggerganov/whisper.cpp.git $WhisperRoot }',
    'cmake -S $WhisperRoot -B (Join-Path $WhisperRoot "build") -DCMAKE_BUILD_TYPE=Release',
    'cmake --build (Join-Path $WhisperRoot "build") --config Release',
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
    '$AppRoot = (Get-Location).Path',
    '$WhisperRoot = Join-Path $AppRoot "tools\\whisper.cpp"',
    '$WhisperExe = Join-Path $WhisperRoot "build\\bin\\Release\\whisper-cli.exe"',
    '$ModelPath = Join-Path $AppRoot "models\\ggml-small.bin"',
    '@"',
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
    '$AppRoot = (Get-Location).Path',
    '$WhisperRoot = Join-Path $AppRoot "tools\\whisper.cpp"',
    '$WhisperExe = Join-Path $WhisperRoot "build\\bin\\Release\\whisper-cli.exe"',
    '$ModelPath = Join-Path $AppRoot "models\\ggml-small.bin"',
    'ffmpeg -version',
    'tesseract --version',
    'Test-Path $WhisperExe',
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
      steps: [
        { title: copy.stepInstallBaseTools, description: `${copy.installLocationNote} ${copy.windowsBuildToolsNote} ${windowsTessdataNote}`, command: windowsBase },
        { title: copy.stepInstallWhisper, description: `${copy.installLocationNote} ${copy.windowsBuildToolsNote}`, command: windowsWhisper },
        { title: copy.stepDownloadModel, description: copy.modelDownloadNote, command: windowsModel },
        { title: copy.stepWriteEnv, description: copy.envPathNote, command: windowsEnv },
        { title: copy.stepVerifyRestart, description: copy.restartNote, command: windowsVerify },
      ],
    },
    linux: {
      platform: 'linux',
      title: copy.platformLinux,
      steps: [
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
      steps: [
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
  const [selectedPlatform, setSelectedPlatform] = useState<InstallPlatform>('windows');
  const languageLabel = getNativeLanguageLabel(targetLanguage);
  const guides = useMemo(() => buildGuides(readiness, copy, languageLabel), [copy, readiness, languageLabel]);
  const selectedGuide = guides[selectedPlatform];
  const sttReady = Boolean(readiness?.stt?.ready);
  const ocrReady = Boolean(readiness?.ocr?.ready);
  const ffmpegReady = Boolean(readiness?.ffmpeg?.ready);

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
          <small>{copy.targetLanguagePackage}{readiness?.ocr?.requiredLanguage ?? readiness?.ocr?.language ?? copy.autoPackage}</small>
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
          <p>{runLocationNote(language, selectedPlatform)}</p>
          {selectedGuide.steps.map((step) => (
            <section key={`${selectedPlatform}:${step.title}:${step.command ?? ''}`} className="recognition-setup-guide-step">
              <h4>{step.title}</h4>
              <p>{step.description}</p>
              {step.command ? <CommandBlock key={`${selectedPlatform}:${step.command}`} title={step.title} command={step.command} copy={copy} showTitle={false} /> : null}
            </section>
          ))}
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
