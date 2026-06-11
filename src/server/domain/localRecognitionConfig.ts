import { DEFAULT_TARGET_LANGUAGE, getLanguageIso6391Code } from '../../shared/constants.js';
import type { SupportedLanguage } from '../../shared/constants.js';

export type LocalSttProvider = 'whisper.cpp' | 'disabled';
export type LocalOcrProvider = 'tesseract' | 'disabled';

export interface LocalRecognitionConfig {
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
