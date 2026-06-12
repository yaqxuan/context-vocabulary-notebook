import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import { getLocalRecognitionReadiness, type ReadinessExecFileRunner } from '../../src/server/domain/localRecognitionReadiness.js';
import type { LocalRecognitionConfig } from '../../src/server/domain/localRecognitionConfig.js';

function config(overrides: Partial<LocalRecognitionConfig> = {}): LocalRecognitionConfig {
  return {
    stt: {
      provider: 'whisper.cpp',
      executablePath: '/bin/whisper-cli',
      modelPath: '/models/ggml.bin',
      timeoutMs: 120_000,
    },
    ocr: {
      provider: 'tesseract',
      executablePath: '/bin/tesseract',
      language: 'eng',
      timeoutMs: 30_000,
    },
    cloudFallback: { enabled: false },
    ...overrides,
  };
}

describe('local recognition readiness domain', () => {
  it('reports ffmpeg, whisper.cpp model, and tesseract ready', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;
    const fsAccess = { access: vi.fn(async () => undefined) };

    await expect(getLocalRecognitionReadiness('英语', {
      runner,
      fsAccess,
      resolveConfig: () => config(),
    })).resolves.toEqual({
      ffmpeg: { ready: true, message: 'ffmpeg is ready' },
      stt: {
        provider: 'whisper.cpp',
        ready: true,
        executablePath: '/bin/whisper-cli',
        modelPath: '/models/ggml.bin',
        message: 'whisper.cpp executable and model are ready',
      },
      ocr: {
        provider: 'tesseract',
        ready: true,
        executablePath: '/bin/tesseract',
        language: 'eng',
        requiredLanguage: 'eng',
        installedLanguages: ['eng'],
        languageReady: true,
        languageMessage: 'Tesseract language data eng is installed',
        message: 'Tesseract language data eng is installed',
      },
    });
    expect(runner).toHaveBeenCalledWith('ffmpeg', ['-version'], { timeout: 5000 });
    expect(runner).toHaveBeenCalledWith('/bin/whisper-cli', ['--help'], { timeout: 5000 });
    expect(runner).toHaveBeenCalledWith('/bin/tesseract', ['--version'], { timeout: 5000 });
    expect(fsAccess.access).toHaveBeenCalledWith('/models/ggml.bin');
  });

  it('uses configured readiness timeout when CVN_LOCAL_READINESS_TIMEOUT_MS is valid', async () => {
    const previous = process.env.CVN_LOCAL_READINESS_TIMEOUT_MS;
    process.env.CVN_LOCAL_READINESS_TIMEOUT_MS = '7500';
    const runner = vi.fn(async () => ({ stdout: 'ok', stderr: '' })) satisfies ReadinessExecFileRunner;
    const fsAccess = { access: vi.fn(async () => undefined) };

    try {
      await getLocalRecognitionReadiness(undefined, {
        runner,
        fsAccess,
        resolveConfig: () => config(),
      });
    } finally {
      if (previous === undefined) delete process.env.CVN_LOCAL_READINESS_TIMEOUT_MS;
      else process.env.CVN_LOCAL_READINESS_TIMEOUT_MS = previous;
    }

    expect(runner).toHaveBeenCalledWith('ffmpeg', ['-version'], { timeout: 7500 });
    expect(runner).toHaveBeenCalledWith('/bin/whisper-cli', ['--help'], { timeout: 7500 });
    expect(runner).toHaveBeenCalledWith('/bin/tesseract', ['--version'], { timeout: 7500 });
  });

  it('falls back to default readiness timeout when CVN_LOCAL_READINESS_TIMEOUT_MS is invalid', async () => {
    const previous = process.env.CVN_LOCAL_READINESS_TIMEOUT_MS;
    process.env.CVN_LOCAL_READINESS_TIMEOUT_MS = 'not-a-number';
    const runner = vi.fn(async () => ({ stdout: 'ok', stderr: '' })) satisfies ReadinessExecFileRunner;
    const fsAccess = { access: vi.fn(async () => undefined) };

    try {
      await getLocalRecognitionReadiness(undefined, {
        runner,
        fsAccess,
        resolveConfig: () => config(),
      });
    } finally {
      if (previous === undefined) delete process.env.CVN_LOCAL_READINESS_TIMEOUT_MS;
      else process.env.CVN_LOCAL_READINESS_TIMEOUT_MS = previous;
    }

    expect(runner).toHaveBeenCalledWith('ffmpeg', ['-version'], { timeout: 5000 });
  });

  it('reports a missing executable without doing recognition work', async () => {
    const runner = vi.fn(async (file, args) => {
      if (file === '/bin/whisper-cli') throw new Error('ENOENT');
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;
    const fsAccess = { access: vi.fn(async () => undefined) };

    const result = await getLocalRecognitionReadiness(undefined, {
      runner,
      fsAccess,
      resolveConfig: () => config(),
    });

    expect(result.stt.ready).toBe(false);
    expect(result.stt.message).toContain('whisper.cpp is not ready at /bin/whisper-cli');
    expect(result.ocr.ready).toBe(true);
    expect(fsAccess.access).not.toHaveBeenCalled();
  });

  it('reports a missing whisper.cpp model separately', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;
    const fsAccess = { access: vi.fn().mockRejectedValue(new Error('EACCES')) };

    const result = await getLocalRecognitionReadiness(undefined, {
      runner,
      fsAccess,
      resolveConfig: () => config(),
    });

    expect(result.stt.ready).toBe(false);
    expect(result.stt.message).toContain('whisper.cpp model is not readable at /models/ggml.bin');
    expect(result.ffmpeg.ready).toBe(true);
    expect(result.ocr.ready).toBe(true);
  });

  it('marks target tesseract language ready when list-langs contains it', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--version') return { stdout: 'tesseract 5', stderr: '' };
      if (args[0] === '--help') return { stdout: 'whisper help', stderr: '' };
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\njpn\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;

    const result = await getLocalRecognitionReadiness('日语', {
      runner,
      fsAccess: { access: async () => undefined },
      resolveConfig: () => config({
        stt: { provider: 'whisper.cpp', executablePath: 'whisper-cli', modelPath: '/models/ggml-base.bin', timeoutMs: 120_000, language: 'ja' },
        ocr: { provider: 'tesseract', executablePath: 'tesseract', language: 'jpn', timeoutMs: 30_000 },
      }),
    });

    expect(result.ocr.requiredLanguage).toBe('jpn');
    expect(result.ocr.languageReady).toBe(true);
    expect(result.ocr.installedLanguages).toEqual(['eng', 'jpn']);
  });

  it('marks combined tesseract languages ready only when every language is installed', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--version') return { stdout: 'tesseract 5', stderr: '' };
      if (args[0] === '--help') return { stdout: 'whisper help', stderr: '' };
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\nchi_sim\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;

    const result = await getLocalRecognitionReadiness('英语', {
      runner,
      fsAccess: { access: async () => undefined },
      resolveConfig: () => config({
        ocr: { provider: 'tesseract', executablePath: 'tesseract', language: 'eng+chi_sim', timeoutMs: 30_000 },
      }),
    });

    expect(result.ocr.languageReady).toBe(true);
    expect(result.ocr.languageMessage).toBe('Tesseract language data eng+chi_sim is installed');
  });

  it('marks target tesseract language missing when list-langs lacks it', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--version') return { stdout: 'tesseract 5', stderr: '' };
      if (args[0] === '--help') return { stdout: 'whisper help', stderr: '' };
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\neng\nchi_sim\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;

    const result = await getLocalRecognitionReadiness('日语', {
      runner,
      fsAccess: { access: async () => undefined },
      resolveConfig: () => config({
        stt: { provider: 'whisper.cpp', executablePath: 'whisper-cli', modelPath: '/models/ggml-base.bin', timeoutMs: 120_000, language: 'ja' },
        ocr: { provider: 'tesseract', executablePath: 'tesseract', language: 'jpn', timeoutMs: 30_000 },
      }),
    });

    expect(result.ocr.languageReady).toBe(false);
    expect(result.ocr.languageMessage).toContain('jpn');
  });

  it('warns when a non-English target language uses an English-only Whisper model', async () => {
    const runner = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '--version' || args[0] === '--help') return { stdout: 'ok', stderr: '' };
      if (args[0] === '--list-langs') return { stdout: 'List of available languages\njpn\n', stderr: '' };
      return { stdout: 'ok', stderr: '' };
    }) satisfies ReadinessExecFileRunner;

    const result = await getLocalRecognitionReadiness('日语', {
      runner,
      fsAccess: { access: async () => undefined },
      resolveConfig: () => config({
        stt: { provider: 'whisper.cpp', executablePath: 'whisper-cli', modelPath: '/models/ggml-base.en.bin', timeoutMs: 120_000, language: 'ja' },
        ocr: { provider: 'tesseract', executablePath: 'tesseract', language: 'jpn', timeoutMs: 30_000 },
      }),
    });

    expect(result.stt.language).toBe('ja');
    expect(result.stt.modelWarning).toContain('English-only');
  });

  it('does not check disabled OCR/STT executables', async () => {
    const runner = vi.fn(async () => ({ stdout: 'ok', stderr: '' })) satisfies ReadinessExecFileRunner;

    const result = await getLocalRecognitionReadiness(undefined, {
      runner,
      resolveConfig: () => config({
        stt: { provider: 'disabled', executablePath: '/bin/whisper-cli', modelPath: '', timeoutMs: 1 },
        ocr: { provider: 'disabled', executablePath: '/bin/tesseract', language: 'eng', timeoutMs: 1 },
      }),
    });

    expect(result.stt).toEqual({
      provider: 'disabled',
      ready: false,
      executablePath: '/bin/whisper-cli',
      modelPath: '',
      message: 'Local STT is disabled',
    });
    expect(result.ocr).toEqual({
      provider: 'disabled',
      ready: false,
      executablePath: '/bin/tesseract',
      language: 'eng',
      requiredLanguage: 'eng',
      languageReady: false,
      languageMessage: 'Local OCR is disabled',
      message: 'Local OCR is disabled',
    });
    expect(runner).toHaveBeenCalledOnce();
    expect(runner).toHaveBeenCalledWith('ffmpeg', ['-version'], { timeout: 5000 });
  });
});

describe('GET /api/local-recognition/readiness', () => {
  it('validates target_language and returns readiness DTO', async () => {
    const db = createTestDb();
    try {
      const app = createApp(db, {
        localRecognition: {
          runner: vi.fn(async () => ({ stdout: 'ok', stderr: '' })),
          fsAccess: { access: vi.fn(async () => undefined) },
          resolveConfig: (targetLanguage) => config({ ocr: { provider: 'tesseract', executablePath: '/bin/tesseract', language: targetLanguage === '日语' ? 'jpn' : 'eng', timeoutMs: 1 } }),
        },
      });

      const res = await request(app)
        .get('/api/local-recognition/readiness')
        .query({ target_language: '日语' })
        .expect(200);

      expect(res.body.ocr.language).toBe('jpn');

      const invalid = await request(app)
        .get('/api/local-recognition/readiness')
        .query({ target_language: '意大利语' })
        .expect(400);
      expect(invalid.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
    } finally {
      destroyTestDb(db);
    }
  });
});
