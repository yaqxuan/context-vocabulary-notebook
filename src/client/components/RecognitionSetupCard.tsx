import { useMemo, useState } from 'react';

import { getNativeLanguageLabel, type SupportedLanguage } from '../../shared/constants';
import type { LocalRecognitionReadinessDto } from '../../shared/types';

interface RecognitionSetupCardProps {
  targetLanguage: SupportedLanguage;
  readiness: LocalRecognitionReadinessDto | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
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

function statusLabel(ready: boolean): string {
  return ready ? '✅ 已就绪' : '⚠️ 需要配置';
}

function tesseractLanguagePackages(requiredLanguage: string): string[] {
  return requiredLanguage
    .split('+')
    .map((language) => language.trim())
    .filter(Boolean)
    .map((language) => APT_TESSERACT_PACKAGES[language] ?? language);
}

function buildCommands(targetLanguage: SupportedLanguage, readiness: LocalRecognitionReadinessDto | null) {
  const requiredLanguage = readiness?.ocr?.requiredLanguage ?? readiness?.ocr?.language ?? 'eng';
  const aptPackages = tesseractLanguagePackages(requiredLanguage)
    .map((language) => `tesseract-ocr-${language}`)
    .join(' ');
  const label = getNativeLanguageLabel(targetLanguage);
  const ubuntu = [
    'sudo apt-get update',
    `sudo apt-get install -y ffmpeg tesseract-ocr ${aptPackages}`,
    '# 如果 apt-get 报 Docker / Chrome / NVIDIA / GPG key 等错误，先修复系统 apt 源；也可以手动安装后回来点“重新检测”。',
  ].join('\n');
  const macos = [
    'brew install ffmpeg tesseract',
    `# 如果 ${label} OCR 仍缺少 ${requiredLanguage}，请把对应 traineddata 安装到 Tesseract tessdata 目录。`,
  ].join('\n');
  const windows = [
    'winget install --id Gyan.FFmpeg -e --source winget',
    'winget install --id UB-Mannheim.TesseractOCR -e --source winget',
    '# 安装后重新打开 PowerShell，让服务进程读到新的 PATH。',
    `# 如果 ${label} OCR 仍缺少 ${requiredLanguage}，请把对应 traineddata 放入 Tesseract tessdata 目录。`,
  ].join('\n');
  const whisperUnix = [
    '# 推荐使用多语言模型；非英语不要使用 *.en.bin',
    'CVN_STT_PROVIDER=whisper.cpp',
    'CVN_WHISPER_CPP_PATH=/absolute/path/to/whisper-cli',
    'CVN_WHISPER_CPP_MODEL=/absolute/path/to/ggml-small.bin',
    'CVN_WHISPER_CPP_TIMEOUT_MS=120000',
  ].join('\n');
  const whisperWindows = [
    '# 推荐使用多语言模型；非英语不要使用 *.en.bin',
    'CVN_STT_PROVIDER=whisper.cpp',
    'CVN_WHISPER_CPP_PATH=C:\\tools\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe',
    'CVN_WHISPER_CPP_MODEL=C:\\models\\ggml-small.bin',
    'CVN_WHISPER_CPP_TIMEOUT_MS=120000',
  ].join('\n');
  return { ubuntu, macos, windows, whisperUnix, whisperWindows };
}

async function copyText(text: string) {
  await navigator.clipboard?.writeText(text);
}

export function RecognitionSetupCard({ targetLanguage, readiness, loading, error, onRefresh }: RecognitionSetupCardProps) {
  const [commandsOpen, setCommandsOpen] = useState(false);
  const commands = useMemo(() => buildCommands(targetLanguage, readiness), [targetLanguage, readiness]);
  const languageLabel = getNativeLanguageLabel(targetLanguage);
  const sttReady = Boolean(readiness?.stt?.ready);
  const ocrReady = Boolean(readiness?.ocr?.ready);
  const ffmpegReady = Boolean(readiness?.ffmpeg?.ready);

  return (
    <section className="recognition-setup-card" aria-label={`本地识别配置 ${languageLabel}`}>
      <header className="recognition-setup-header">
        <div>
          <h3>本地识别配置 · {languageLabel}</h3>
          <p>核心应用安装不强制 OCR/STT。OCR 可通过 ffmpeg + Tesseract 配好；语音识别还需要手动安装 whisper.cpp 并下载 Whisper 模型。复制对应系统命令执行后，重新打开终端并检测。</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? '检测中…' : '我已安装，重新检测'}</button>
      </header>

      {error ? <p className="recognition-setup-warning">{error}</p> : null}

      <div className="recognition-setup-grid">
        <div className="recognition-setup-status">
          <strong>FFmpeg</strong>
          <span>{statusLabel(ffmpegReady)}</span>
          <small>{readiness?.ffmpeg?.message ?? '用于从视频提取音频。'}</small>
        </div>
        <div className="recognition-setup-status">
          <strong>声音识别 · whisper.cpp</strong>
          <span>{statusLabel(sttReady)}</span>
          <small>{readiness?.stt?.message ?? '需要 whisper.cpp 和 Whisper 模型。'}</small>
          {readiness?.stt?.modelWarning ? <small className="recognition-setup-warning">{readiness.stt.modelWarning}</small> : null}
        </div>
        <div className="recognition-setup-status">
          <strong>字幕 OCR · Tesseract</strong>
          <span>{statusLabel(ocrReady)}</span>
          <small>{readiness?.ocr?.languageMessage ?? `需要 ${languageLabel} 对应 Tesseract 语言数据。`}</small>
          <small>目标语言包：{readiness?.ocr?.requiredLanguage ?? readiness?.ocr?.language ?? '自动选择'}</small>
        </div>
      </div>

      <div className="recognition-setup-actions">
        <button type="button" onClick={() => setCommandsOpen((open) => !open)}>
          {commandsOpen ? '收起安装命令' : '查看安装命令'}
        </button>
      </div>

      {commandsOpen ? (
        <div className="recognition-setup-commands">
          <CommandBlock title="Ubuntu / WSL" command={commands.ubuntu} />
          <CommandBlock title="macOS" command={commands.macos} />
          <CommandBlock title="Windows 原生 PowerShell" command={commands.windows} />
          <CommandBlock title="Whisper .env（Linux / WSL / macOS）" command={commands.whisperUnix} />
          <CommandBlock title="Whisper .env（Windows 原生）" command={commands.whisperWindows} />
        </div>
      ) : null}
    </section>
  );
}

function CommandBlock({ title, command }: { title: string; command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="recognition-setup-command-block">
      <div>
        <strong>{title}</strong>
        <button
          type="button"
          onClick={() => {
            void copyText(command).then(() => setCopied(true)).catch(() => setCopied(false));
          }}
        >
          {copied ? '已复制' : `复制 ${title} 命令`}
        </button>
      </div>
      <pre>{command}</pre>
    </div>
  );
}
