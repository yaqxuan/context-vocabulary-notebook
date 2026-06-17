import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';

import type { SupportedLanguage } from '../../shared/constants.js';
import type { LocalRecognitionReadinessDto } from '../../shared/types.js';
import { reloadLocalRecognitionEnv, resolveLocalRecognitionConfig, type LocalRecognitionConfig } from './localRecognitionConfig.js';

const execFileAsync = promisify(execFile);
const DEFAULT_READINESS_TIMEOUT_MS = 5_000;
const READINESS_TIMEOUT_ENV = 'CVN_LOCAL_READINESS_TIMEOUT_MS';

function resolveReadinessTimeoutMs(): number {
  const raw = process.env[READINESS_TIMEOUT_ENV];
  if (!raw) return DEFAULT_READINESS_TIMEOUT_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_READINESS_TIMEOUT_MS;

  return Math.round(parsed);
}

export type ReadinessExecFileRunner = (
  file: string,
  args: string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

export interface ReadinessFsAccess {
  access(path: string): Promise<void>;
}

export interface LocalRecognitionReadinessOptions {
  runner?: ReadinessExecFileRunner;
  fsAccess?: ReadinessFsAccess;
  resolveConfig?: (targetLanguage?: SupportedLanguage) => LocalRecognitionConfig;
  reloadEnv?: () => void | Promise<void>;
}

const defaultRunner: ReadinessExecFileRunner = async (file, args, options) => {
  const result = await execFileAsync(file, args, { timeout: options.timeout });
  return { stdout: result.stdout, stderr: result.stderr };
};

const defaultFsAccess: ReadinessFsAccess = {
  access: (path) => fs.access(path, fsConstants.R_OK),
};

function commandErrorMessage(label: string, executablePath: string, error: unknown): string {
  const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
  return `${label} is not ready at ${executablePath}${detail}`;
}

async function checkCommand(label: string, executablePath: string, args: string[], runner: ReadinessExecFileRunner): Promise<{ ready: boolean; message: string }> {
  try {
    await runner(executablePath, args, { timeout: resolveReadinessTimeoutMs() });
    return { ready: true, message: `${label} is ready` };
  } catch (error) {
    return { ready: false, message: commandErrorMessage(label, executablePath, error) };
  }
}

function parseTesseractLanguages(stdout: string): string[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !/^list of available languages/i.test(line));
}

function isEnglishOnlyWhisperModel(modelPath: string): boolean {
  return /\.en\.(?:bin|gguf)$/iu.test(modelPath.trim());
}

function modelWarning(targetLanguage: SupportedLanguage | undefined, modelPath: string): string | undefined {
  if (!targetLanguage || targetLanguage === '英语') return undefined;
  if (!isEnglishOnlyWhisperModel(modelPath)) return undefined;
  return `English-only Whisper model is not recommended for ${targetLanguage}. Use a multilingual model such as ggml-base.bin or ggml-small.bin.`;
}

type TesseractLanguageCheck = {
  installedLanguages: string[];
  languageReady: boolean;
  languageMessage: string;
};

async function checkTesseractLanguages(
  executablePath: string,
  requiredLanguage: string,
  runner: ReadinessExecFileRunner,
): Promise<TesseractLanguageCheck> {
  try {
    const result = await runner(executablePath, ['--list-langs'], { timeout: resolveReadinessTimeoutMs() });
    const installedLanguages = parseTesseractLanguages(result.stdout);
    const requiredLanguages = requiredLanguage
      .split('+')
      .map((language) => language.trim())
      .filter(Boolean);
    const missingLanguages = requiredLanguages.filter((language) => !installedLanguages.includes(language));
    const languageReady = missingLanguages.length === 0;
    return {
      installedLanguages,
      languageReady,
      languageMessage: languageReady
        ? `Tesseract language data ${requiredLanguage} is installed`
        : `Tesseract language data ${missingLanguages.join('+')} is missing. Install the matching language package, then rerun readiness check.`,
    };
  } catch (error) {
    return {
      installedLanguages: [],
      languageReady: false,
      languageMessage: commandErrorMessage('Tesseract language list', executablePath, error),
    };
  }
}

export async function getLocalRecognitionReadiness(
  targetLanguage?: SupportedLanguage,
  options: LocalRecognitionReadinessOptions = {},
): Promise<LocalRecognitionReadinessDto> {
  const runner = options.runner ?? defaultRunner;
  const fsAccess = options.fsAccess ?? defaultFsAccess;
  if (options.reloadEnv) await options.reloadEnv();
  else if (!options.resolveConfig) await reloadLocalRecognitionEnv();
  const config = (options.resolveConfig ?? resolveLocalRecognitionConfig)(targetLanguage);

  const ffmpeg = await checkCommand('ffmpeg', config.ffmpeg.executablePath, ['-version'], runner);

  const sttLanguage = config.stt.language;
  const sttModelWarning = modelWarning(targetLanguage, config.stt.modelPath);
  let stt: LocalRecognitionReadinessDto['stt'];
  if (config.stt.provider === 'disabled') {
    stt = {
      provider: 'disabled',
      ready: false,
      executablePath: config.stt.executablePath,
      modelPath: config.stt.modelPath,
      language: sttLanguage,
      message: 'Local STT is disabled',
      ...(sttModelWarning ? { modelWarning: sttModelWarning } : {}),
    };
  } else if (!config.stt.modelPath) {
    stt = {
      provider: 'whisper.cpp',
      ready: false,
      executablePath: config.stt.executablePath,
      modelPath: config.stt.modelPath,
      language: sttLanguage,
      message: 'whisper.cpp model path is not configured',
      ...(sttModelWarning ? { modelWarning: sttModelWarning } : {}),
    };
  } else {
    const executable = await checkCommand('whisper.cpp', config.stt.executablePath, ['--help'], runner);
    if (!executable.ready) {
      stt = {
        provider: 'whisper.cpp',
        ready: false,
        executablePath: config.stt.executablePath,
        modelPath: config.stt.modelPath,
        language: sttLanguage,
        message: executable.message,
        ...(sttModelWarning ? { modelWarning: sttModelWarning } : {}),
      };
    } else {
      try {
        await fsAccess.access(config.stt.modelPath);
        stt = {
          provider: 'whisper.cpp',
          ready: true,
          executablePath: config.stt.executablePath,
          modelPath: config.stt.modelPath,
          language: sttLanguage,
          message: 'whisper.cpp executable and model are ready',
          ...(sttModelWarning ? { modelWarning: sttModelWarning } : {}),
        };
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
        stt = {
          provider: 'whisper.cpp',
          ready: false,
          executablePath: config.stt.executablePath,
          modelPath: config.stt.modelPath,
          language: sttLanguage,
          message: `whisper.cpp model is not readable at ${config.stt.modelPath}${detail}`,
          ...(sttModelWarning ? { modelWarning: sttModelWarning } : {}),
        };
      }
    }
  }

  const requiredLanguage = config.ocr.language;
  let ocr: LocalRecognitionReadinessDto['ocr'];
  if (config.ocr.provider === 'disabled') {
    ocr = {
      provider: 'disabled',
      ready: false,
      executablePath: config.ocr.executablePath,
      language: config.ocr.language,
      requiredLanguage,
      languageReady: false,
      languageMessage: 'Local OCR is disabled',
      message: 'Local OCR is disabled',
    };
  } else {
    const executable = await checkCommand('Tesseract OCR', config.ocr.executablePath, ['--version'], runner);
    const languageCheck = executable.ready
      ? await checkTesseractLanguages(config.ocr.executablePath, requiredLanguage, runner)
      : { installedLanguages: [], languageReady: false, languageMessage: executable.message };
    ocr = {
      provider: 'tesseract',
      ready: executable.ready && languageCheck.languageReady,
      executablePath: config.ocr.executablePath,
      language: config.ocr.language,
      requiredLanguage,
      installedLanguages: languageCheck.installedLanguages,
      languageReady: languageCheck.languageReady,
      languageMessage: languageCheck.languageMessage,
      message: executable.ready ? languageCheck.languageMessage : executable.message,
    };
  }

  return { ffmpeg, stt, ocr };
}
