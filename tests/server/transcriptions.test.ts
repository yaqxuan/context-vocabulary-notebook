import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import type { Database } from 'better-sqlite3';
import { lookup } from 'node:dns/promises';

vi.mock('node:dns/promises', () => {
  const lookupMock = vi.fn(async () => [{ address: '203.0.113.10', family: 4 }]);
  return { default: { lookup: lookupMock }, lookup: lookupMock };
});

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import { createAiConfig } from '../../src/server/domain/aiConfigs.js';
import { TRANSCRIPTION_MESSAGES } from '../../src/shared/constants.js';
import type { TranscribeMediaResponseDto } from '../../src/shared/types.js';

let db: Database;
let uploadsDir: string;

beforeAll(() => {
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-test-transcriptions-'));
});

afterAll(() => {
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  destroyTestDb(db);
  for (const file of fs.readdirSync(uploadsDir)) {
    fs.rmSync(path.join(uploadsDir, file), { force: true, recursive: true });
  }
  vi.restoreAllMocks();
});

describe('POST /api/transcriptions', () => {
  it('rejects requests without an uploaded file', async () => {
    const extractor = vi.fn();
    const stt = vi.fn();
    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });

    const res = await request(app)
      .post('/api/transcriptions')
      .field('target_language', 'en')
      .expect(400);

    expect(res.body).toEqual({ error: 'file is required', message: 'file is required' });
    expect(extractor).not.toHaveBeenCalled();
    expect(stt).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('extracts temp audio, transcribes it, returns DTO, and cleans temp files without inserting media', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'whisper-1',
      is_active: true,
    });
    const seenUploadPaths: string[] = [];
    const seenAudioPaths: string[] = [];
    const extractor = vi.fn(async (inputPath: string, outputPath: string) => {
      seenUploadPaths.push(inputPath);
      seenAudioPaths.push(outputPath);
      fs.writeFileSync(outputPath, 'audio');
      return outputPath;
    });
    const stt = vi.fn(async () => ({
      status: 'success' as const,
      text: 'Hello world.',
      segments: [{ start: 0, end: 1.5, text: 'Hello world.' }],
      language: 'en',
    } satisfies TranscribeMediaResponseDto));

    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });
    const res = await request(app)
      .post('/api/transcriptions')
      .field('target_language', 'en')
      .attach('file', Buffer.from('fake-mp4'), { filename: '../../../clip.mp4', contentType: 'video/mp4' })
      .expect(200);

    expect(res.body).toEqual({
      status: 'success',
      text: 'Hello world.',
      segments: [{ start: 0, end: 1.5, text: 'Hello world.' }],
      language: 'en',
    });
    expect(extractor).toHaveBeenCalledOnce();
    expect(stt).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ model: 'whisper-1', api_key: 'sk-secret' }),
      audioPath: seenAudioPaths[0],
      language: 'en',
    }));
    expect(seenUploadPaths[0]).toContain(uploadsDir);
    expect(path.basename(seenUploadPaths[0])).not.toContain('..');
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM media_files').get()).toMatchObject({ n: 0 });
  });

  it('uses distinct temp audio paths for concurrent transcription requests', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'whisper-1',
      is_active: true,
    });
    const seenAudioPaths: string[] = [];
    const extractor = vi.fn(async (_inputPath: string, outputPath: string) => {
      seenAudioPaths.push(outputPath);
      fs.writeFileSync(outputPath, 'audio');
      return outputPath;
    });
    const stt = vi.fn(async () => ({
      status: 'success' as const,
      text: 'Hello world.',
      segments: [],
    } satisfies TranscribeMediaResponseDto));

    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });
    await Promise.all([
      request(app)
        .post('/api/transcriptions')
        .attach('file', Buffer.from('fake-mp4-a'), { filename: 'clip-a.mp4', contentType: 'video/mp4' })
        .expect(200),
      request(app)
        .post('/api/transcriptions')
        .attach('file', Buffer.from('fake-mp4-b'), { filename: 'clip-b.mp4', contentType: 'video/mp4' })
        .expect(200),
    ]);

    expect(extractor).toHaveBeenCalledTimes(2);
    expect(new Set(seenAudioPaths)).toHaveLength(2);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('returns none when there is no active AI config and cleans upload', async () => {
    const extractor = vi.fn(async (inputPath: string, outputPath: string) => {
      fs.writeFileSync(outputPath, 'audio');
      return outputPath;
    });
    const stt = vi.fn();
    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });

    const res = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('fake-mp3'), { filename: 'audio.mp3', contentType: 'audio/mpeg' })
      .expect(200);

    expect(res.body).toEqual({ status: 'none', text: '', segments: [], message: TRANSCRIPTION_MESSAGES.noConfig });
    expect(extractor).not.toHaveBeenCalled();
    expect(stt).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('returns none for unsafe active AI config without extracting audio or calling STT', async () => {
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'http://169.254.169.254/v1',
      api_key: 'sk-secret',
      model: 'whisper-1',
      is_active: true,
    });
    const extractor = vi.fn(async (inputPath: string, outputPath: string) => {
      fs.writeFileSync(outputPath, 'audio');
      return outputPath;
    });
    const stt = vi.fn();
    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });

    const res = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('fake-mp3'), { filename: 'audio.mp3', contentType: 'audio/mpeg' })
      .expect(200);

    expect(res.body).toEqual({ status: 'none', text: '', segments: [], message: TRANSCRIPTION_MESSAGES.unavailable });
    expect(extractor).not.toHaveBeenCalled();
    expect(stt).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('returns none for provider failure and cleans uploaded and extracted temp files', async () => {
    createAiConfig(db, { name: 'Local AI', base_url: 'https://ai.example/v1', api_key: 'sk-secret', model: 'whisper-1', is_active: true });
    const seenUploadPaths: string[] = [];
    const seenAudioPaths: string[] = [];
    const extractor = vi.fn(async (inputPath: string, outputPath: string) => {
      seenUploadPaths.push(inputPath);
      seenAudioPaths.push(outputPath);
      fs.writeFileSync(outputPath, 'audio');
      return outputPath;
    });
    const stt = vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'none', text: '', segments: [], message: TRANSCRIPTION_MESSAGES.unavailable }));
    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });

    const res = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('fake-mp4'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(200);

    expect(res.body).toEqual({ status: 'none', text: '', segments: [], message: TRANSCRIPTION_MESSAGES.unavailable });
    expect(extractor).toHaveBeenCalledOnce();
    expect(stt).toHaveBeenCalledOnce();
    expect(fs.existsSync(seenUploadPaths[0])).toBe(false);
    expect(fs.existsSync(seenAudioPaths[0])).toBe(false);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('returns none for extractor failure without leaking local paths', async () => {
    createAiConfig(db, { name: 'Local AI', base_url: 'https://ai.example/v1', api_key: 'sk-secret', model: 'whisper-1', is_active: true });
    const extractor = vi.fn(async () => { throw new Error(`/tmp/private/input.mp4 failed`); });
    const stt = vi.fn();
    const app = createApp(db, { uploadsDir, transcription: { extractor, stt } });

    const res = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('fake-mp4'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(200);

    expect(res.body).toEqual({ status: 'none', text: '', segments: [], message: TRANSCRIPTION_MESSAGES.ffmpegFailure });
    expect(JSON.stringify(res.body)).not.toContain('/tmp/private');
    expect(stt).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects unsupported file types and files over transcription limit', async () => {
    const app = createApp(db, { uploadsDir, transcriptionUploadMaxBytes: 4 });

    const unsupported = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('pdf'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .expect(400);
    expect(unsupported.body.error).toBe('Unsupported file type');

    const oversized = await request(app)
      .post('/api/transcriptions')
      .attach('file', Buffer.from('too-large'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(400);
    expect(oversized.body.error).toBe(TRANSCRIPTION_MESSAGES.sizeLimit);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });
});
