import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_TARGET_LANGUAGE, getLanguageIso6391Code } from '../../shared/constants.js';
import type { SupportedLanguage } from '../../shared/constants.js';

export type LocalSttProvider = 'whisper.cpp' | 'disabled';
export type LocalOcrProvider = 'tesseract' | 'disabled';

export interface LocalRecognitionConfig {
  ffmpeg: {
    executablePath: string;
  };
  stt: {
    provider: LocalSttProvider;
    executablePath: string;
    modelPath: string;
    timeoutMs: number;
    language?: string;
  };
  ocr: {
    provider: LocalOcrProvider;
    executablePath: string;
    language: string;
    timeoutMs: number;
  };
  cloudFallback: {
    enabled: boolean;
  };
}

const DEFAULT_WHISPER_TIMEOUT_MS = 120_000;
const DEFAULT_TESSERACT_TIMEOUT_MS = 30_000;
const MAX_RELOAD_ENV_FILE_BYTES = 64 * 1024;

const RELOADABLE_LOCAL_RECOGNITION_ENV_KEYS = new Set([
  'CVN_FFMPEG_PATH',
  'CVN_FFMPEG_EXECUTABLE',
  'CVN_STT_PROVIDER',
  'CVN_WHISPER_CPP_PATH',
  'CVN_WHISPER_CPP_EXECUTABLE',
  'CVN_WHISPER_CPP_MODEL',
  'CVN_WHISPER_CPP_TIMEOUT_MS',
  'CVN_OCR_PROVIDER',
  'CVN_TESSERACT_PATH',
  'CVN_TESSERACT_EXECUTABLE',
  'CVN_TESSERACT_LANG',
  'CVN_TESSERACT_LANGUAGE',
  'CVN_TESSERACT_TIMEOUT_MS',
  'CVN_CLIP_ANALYSIS_CLOUD_FALLBACK',
]);

const RELOADABLE_LOCAL_RECOGNITION_PATH_KEYS = new Set([
  'CVN_FFMPEG_PATH',
  'CVN_FFMPEG_EXECUTABLE',
  'CVN_WHISPER_CPP_PATH',
  'CVN_WHISPER_CPP_EXECUTABLE',
  'CVN_WHISPER_CPP_MODEL',
  'CVN_TESSERACT_PATH',
  'CVN_TESSERACT_EXECUTABLE',
]);

const TESSERACT_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  中文: 'chi_sim',
  英语: 'eng',
  日语: 'jpn',
  韩语: 'kor',
  法语: 'fra',
  德语: 'deu',
  西班牙语: 'spa',
  俄语: 'rus',
};

function envFlagEnabled(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true' || value?.toLowerCase() === 'yes';
}

function parseProvider<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  return allowed.includes(value as T) ? value as T : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseEnvLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return undefined;
  const separator = trimmed.indexOf('=');
  if (separator <= 0) return undefined;
  const key = trimmed.slice(0, separator).trim();
  const value = trimmed.slice(separator + 1).trim().replace(/^(?:(['"])(.*)\1)$/u, '$2');
  return { key, value };
}

function isWithinDirectory(childPath: string, parentPath: string): boolean {
  const normalizedChild = process.platform === 'win32' ? childPath.toLowerCase() : childPath;
  const normalizedParent = process.platform === 'win32' ? parentPath.toLowerCase() : parentPath;
  const relative = path.relative(normalizedParent, normalizedChild);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

async function isProjectLocalPath(value: string, projectRoot: string): Promise<boolean> {
  if (!path.isAbsolute(value)) return false;
  if (!isWithinDirectory(path.resolve(value), path.resolve(projectRoot))) return false;

  const realProjectRoot = await fs.realpath(projectRoot).catch(() => undefined);
  if (!realProjectRoot) return false;

  let existingPath = value;
  while (true) {
    const realExistingPath = await fs.realpath(existingPath).catch(() => undefined);
    if (realExistingPath) return isWithinDirectory(realExistingPath, realProjectRoot);

    const parentPath = path.dirname(existingPath);
    if (parentPath === existingPath) return false;
    existingPath = parentPath;
  }
}

export async function reloadLocalRecognitionEnv(
  envPath = path.join(process.cwd(), '.env'),
  projectRoot = process.cwd(),
): Promise<void> {
  const stats = await fs.stat(envPath).catch(() => undefined);
  if (!stats?.isFile() || stats.size > MAX_RELOAD_ENV_FILE_BYTES) return;

  const lines = (await fs.readFile(envPath, 'utf8')).split(/\r?\n/u);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed || !RELOADABLE_LOCAL_RECOGNITION_ENV_KEYS.has(parsed.key)) continue;
    if (RELOADABLE_LOCAL_RECOGNITION_PATH_KEYS.has(parsed.key) && parsed.value && !(await isProjectLocalPath(parsed.value, projectRoot))) continue;
    process.env[parsed.key] = parsed.value;
  }
}

export function getWhisperLanguageCode(language?: SupportedLanguage): string | undefined {
  if (!language) return undefined;
  return getLanguageIso6391Code(language);
}

export function getTesseractLanguageCode(language?: SupportedLanguage): string {
  return readEnv('CVN_TESSERACT_LANG', 'CVN_TESSERACT_LANGUAGE')
    ?? TESSERACT_LANGUAGE_CODES[language ?? DEFAULT_TARGET_LANGUAGE];
}

export function resolveLocalRecognitionConfig(targetLanguage?: SupportedLanguage): LocalRecognitionConfig {
  return {
    ffmpeg: {
      executablePath: readEnv('CVN_FFMPEG_PATH', 'CVN_FFMPEG_EXECUTABLE') || 'ffmpeg',
    },
    stt: {
      provider: parseProvider(process.env.CVN_STT_PROVIDER, ['whisper.cpp', 'disabled'] as const, 'whisper.cpp'),
      executablePath: readEnv('CVN_WHISPER_CPP_PATH', 'CVN_WHISPER_CPP_EXECUTABLE') || 'whisper-cli',
      modelPath: process.env.CVN_WHISPER_CPP_MODEL?.trim() || '',
      timeoutMs: parsePositiveInt(process.env.CVN_WHISPER_CPP_TIMEOUT_MS, DEFAULT_WHISPER_TIMEOUT_MS),
      language: getWhisperLanguageCode(targetLanguage),
    },
    ocr: {
      provider: parseProvider(process.env.CVN_OCR_PROVIDER, ['tesseract', 'disabled'] as const, 'tesseract'),
      executablePath: readEnv('CVN_TESSERACT_PATH', 'CVN_TESSERACT_EXECUTABLE') || 'tesseract',
      language: getTesseractLanguageCode(targetLanguage),
      timeoutMs: parsePositiveInt(process.env.CVN_TESSERACT_TIMEOUT_MS, DEFAULT_TESSERACT_TIMEOUT_MS),
    },
    cloudFallback: {
      enabled: envFlagEnabled(process.env.CVN_CLIP_ANALYSIS_CLOUD_FALLBACK),
    },
  };
}
