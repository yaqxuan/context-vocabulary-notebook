import { afterEach, describe, expect, it } from 'vitest';

import {
  getTesseractLanguageCode,
  getWhisperLanguageCode,
  resolveLocalRecognitionConfig,
} from '../../src/server/domain/localRecognitionConfig.js';

const ENV_KEYS = [
  'CVN_STT_PROVIDER',
  'CVN_OCR_PROVIDER',
  'CVN_FFMPEG_PATH',
  'CVN_FFMPEG_EXECUTABLE',
  'CVN_WHISPER_CPP_PATH',
  'CVN_WHISPER_CPP_EXECUTABLE',
  'CVN_WHISPER_CPP_MODEL',
  'CVN_WHISPER_CPP_TIMEOUT_MS',
  'CVN_TESSERACT_PATH',
  'CVN_TESSERACT_EXECUTABLE',
  'CVN_TESSERACT_LANG',
  'CVN_TESSERACT_LANGUAGE',
  'CVN_TESSERACT_TIMEOUT_MS',
  'CVN_CLIP_ANALYSIS_CLOUD_FALLBACK',
] as const;

const originalEnv = new Map<string, string | undefined>();
for (const key of ENV_KEYS) originalEnv.set(key, process.env[key]);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('local recognition config', () => {
  it('resolves safe defaults without running external commands', () => {
    for (const key of ENV_KEYS) delete process.env[key];

    expect(resolveLocalRecognitionConfig('英语')).toEqual({
      ffmpeg: {
        executablePath: 'ffmpeg',
      },
      stt: {
        provider: 'whisper.cpp',
        executablePath: 'whisper-cli',
        modelPath: '',
        timeoutMs: 120_000,
        language: 'en',
      },
      ocr: {
        provider: 'tesseract',
        executablePath: 'tesseract',
        language: 'eng',
        timeoutMs: 30_000,
      },
      cloudFallback: { enabled: false },
    });
  });

  it('maps supported languages for whisper.cpp and tesseract', () => {
    delete process.env.CVN_TESSERACT_LANG;
    delete process.env.CVN_TESSERACT_LANGUAGE;

    expect(getWhisperLanguageCode('中文')).toBe('zh');
    expect(getWhisperLanguageCode(undefined)).toBeUndefined();
    expect(getTesseractLanguageCode('日语')).toBe('jpn');
    expect(getTesseractLanguageCode('德语')).toBe('deu');
  });

  it('honors environment overrides', () => {
    process.env.CVN_FFMPEG_PATH = '/opt/ffmpeg';
    process.env.CVN_STT_PROVIDER = 'disabled';
    process.env.CVN_OCR_PROVIDER = 'disabled';
    process.env.CVN_WHISPER_CPP_PATH = '/opt/whisper-cli';
    process.env.CVN_WHISPER_CPP_MODEL = '/models/ggml.bin';
    process.env.CVN_WHISPER_CPP_TIMEOUT_MS = '45000';
    process.env.CVN_TESSERACT_PATH = '/opt/tesseract';
    process.env.CVN_TESSERACT_LANG = 'eng+chi_sim';
    process.env.CVN_TESSERACT_TIMEOUT_MS = '15000';
    process.env.CVN_CLIP_ANALYSIS_CLOUD_FALLBACK = '1';

    expect(resolveLocalRecognitionConfig('中文')).toEqual({
      ffmpeg: {
        executablePath: '/opt/ffmpeg',
      },
      stt: {
        provider: 'disabled',
        executablePath: '/opt/whisper-cli',
        modelPath: '/models/ggml.bin',
        timeoutMs: 45_000,
        language: 'zh',
      },
      ocr: {
        provider: 'disabled',
        executablePath: '/opt/tesseract',
        language: 'eng+chi_sim',
        timeoutMs: 15_000,
      },
      cloudFallback: { enabled: true },
    });
  });
});
