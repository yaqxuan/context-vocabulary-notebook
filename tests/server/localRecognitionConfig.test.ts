import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getTesseractLanguageCode,
  getWhisperLanguageCode,
  reloadLocalRecognitionEnv,
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

  it('reloads allowlisted project-local recognition keys from a changed .env file', async () => {
    process.env.CVN_FFMPEG_PATH = '/old/ffmpeg';
    process.env.CVN_WHISPER_CPP_MODEL = '';
    process.env.UNRELATED_SECRET = 'keep';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-env-reload-'));
    const envPath = path.join(tempRoot, '.env');
    const ffmpegPath = path.join(tempRoot, 'tools', 'ffmpeg.exe');
    const whisperPath = path.join(tempRoot, 'tools', 'whisper-cli.exe');
    const modelPath = path.join(tempRoot, 'models', 'ggml.bin');
    const tesseractPath = path.join(tempRoot, 'tools', 'tesseract.exe');
    fs.mkdirSync(path.dirname(ffmpegPath), { recursive: true });
    fs.mkdirSync(path.dirname(modelPath), { recursive: true });
    for (const filePath of [ffmpegPath, whisperPath, modelPath, tesseractPath]) fs.writeFileSync(filePath, 'ok');
    fs.writeFileSync(envPath, [
      `CVN_FFMPEG_PATH=${ffmpegPath}`,
      `CVN_WHISPER_CPP_PATH="${whisperPath}"`,
      `CVN_WHISPER_CPP_MODEL=${modelPath}`,
      `CVN_TESSERACT_PATH=${tesseractPath}`,
      'CVN_TESSERACT_LANG=eng',
      'UNRELATED_SECRET=changed',
      '',
    ].join('\n'));

    await reloadLocalRecognitionEnv(envPath, tempRoot);

    expect(resolveLocalRecognitionConfig('英语')).toMatchObject({
      ffmpeg: { executablePath: ffmpegPath },
      stt: { executablePath: whisperPath, modelPath },
      ocr: { executablePath: tesseractPath, language: 'eng' },
    });
    expect(process.env.UNRELATED_SECRET).toBe('keep');
  });

  it('does not hot-reload executable paths outside the project root', async () => {
    process.env.CVN_FFMPEG_PATH = '/old/ffmpeg';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-env-reload-'));
    const envPath = path.join(tempRoot, '.env');
    fs.writeFileSync(envPath, 'CVN_FFMPEG_PATH=/tmp/other/ffmpeg\nCVN_TESSERACT_LANG=eng\n');

    await reloadLocalRecognitionEnv(envPath, tempRoot);

    expect(resolveLocalRecognitionConfig('英语').ffmpeg.executablePath).toBe('/old/ffmpeg');
    expect(resolveLocalRecognitionConfig('英语').ocr.language).toBe('eng');
  });

  it('hot-reloads missing project-local paths so readiness can report missing files', async () => {
    process.env.CVN_WHISPER_CPP_MODEL = '/old/model.bin';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-env-reload-'));
    const envPath = path.join(tempRoot, '.env');
    const missingModelPath = path.join(tempRoot, 'models', 'missing.bin');
    fs.mkdirSync(path.dirname(missingModelPath), { recursive: true });
    fs.writeFileSync(envPath, `CVN_WHISPER_CPP_MODEL=${missingModelPath}\n`);

    await reloadLocalRecognitionEnv(envPath, tempRoot);

    expect(resolveLocalRecognitionConfig('英语').stt.modelPath).toBe(missingModelPath);
  });

  it('does not hot-reload project paths that resolve outside the project root', async () => {
    process.env.CVN_FFMPEG_PATH = '/old/ffmpeg';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-env-reload-'));
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-outside-'));
    const outsideFfmpeg = path.join(outsideRoot, 'ffmpeg.exe');
    const linkedFfmpeg = path.join(tempRoot, 'tools', 'ffmpeg.exe');
    const envPath = path.join(tempRoot, '.env');
    fs.writeFileSync(outsideFfmpeg, 'ok');
    fs.mkdirSync(path.dirname(linkedFfmpeg), { recursive: true });
    fs.symlinkSync(outsideFfmpeg, linkedFfmpeg);
    fs.writeFileSync(envPath, `CVN_FFMPEG_PATH=${linkedFfmpeg}\n`);

    await reloadLocalRecognitionEnv(envPath, tempRoot);

    expect(resolveLocalRecognitionConfig('英语').ffmpeg.executablePath).toBe('/old/ffmpeg');
  });

  it('hot-reloads empty paths so cleared .env keys do not keep stale values', async () => {
    process.env.CVN_WHISPER_CPP_MODEL = '/old/model.bin';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-env-reload-'));
    const envPath = path.join(tempRoot, '.env');
    fs.writeFileSync(envPath, 'CVN_WHISPER_CPP_MODEL=\n');

    await reloadLocalRecognitionEnv(envPath, tempRoot);

    expect(resolveLocalRecognitionConfig('英语').stt.modelPath).toBe('');
  });
});
