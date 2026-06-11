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
import {
  analyzeClip,
  chooseBestSentence,
  requestTargetWordCandidates,
} from '../../src/server/domain/clipAnalysis.js';
import type { ClipAnalysisResponseDto, TranscribeMediaResponseDto } from '../../src/shared/types.js';

let db: Database;
let uploadsDir: string;

beforeAll(() => {
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-test-clip-analysis-'));
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

function activeConfig() {
  createAiConfig(db, {
    name: 'Local AI',
    base_url: 'https://ai.example/v1',
    api_key: 'sk-secret',
    model: 'test-model',
    is_active: true,
  });
}

function aiResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('POST /api/clip-analysis', () => {
  it('rejects requests without an uploaded file', async () => {
    const analyzer = vi.fn();
    const app = createApp(db, { uploadsDir, clipAnalysis: { analyze: analyzer } });

    const res = await request(app)
      .post('/api/clip-analysis')
      .field('target_language', '英语')
      .expect(400);

    expect(res.body).toEqual({ error: 'file is required', message: 'file is required' });
    expect(analyzer).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects unsupported files before analysis', async () => {
    activeConfig();
    const analyzer = vi.fn();
    const app = createApp(db, { uploadsDir, clipAnalysis: { analyze: analyzer } });

    const res = await request(app)
      .post('/api/clip-analysis')
      .attach('file', Buffer.from('pdf'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .expect(400);

    expect(res.body.error).toBe('Unsupported file type');
    expect(analyzer).not.toHaveBeenCalled();
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('analyzes an mp4 with active config, passes languages, returns DTO, and cleans temp files', async () => {
    activeConfig();
    const seen: Array<{ inputPath: string; audioPath: string; frameDir: string; languages: unknown }> = [];
    const analyzer = vi.fn(async (options): Promise<ClipAnalysisResponseDto> => {
      seen.push({
        inputPath: options.inputPath,
        audioPath: options.audioPath,
        frameDir: options.frameDir,
        languages: options.languages,
      });
      fs.writeFileSync(options.audioPath, 'audio');
      fs.mkdirSync(options.frameDir, { recursive: true });
      fs.writeFileSync(path.join(options.frameDir, 'frame.jpg'), 'frame');
      return {
        status: 'success',
        sentence: {
          source: 'subtitle_ocr',
          status: 'success',
          text: 'The hotel charges $100 per night.',
          confidence: 'high',
        },
        candidates: [{ target_word: 'charges', reason: 'key verb', difficulty_hint: 'medium' }],
        note: 'OCR subtitle selected.',
      };
    });
    const app = createApp(db, { uploadsDir, clipAnalysis: { analyze: analyzer } });

    const res = await request(app)
      .post('/api/clip-analysis')
      .field('target_language', '英语')
      .field('definition_language', '中文')
      .attach('file', Buffer.from('fake-mp4'), { filename: '../../../clip.mp4', contentType: 'video/mp4' })
      .expect(200);

    expect(res.body).toEqual({
      status: 'success',
      sentence: {
        source: 'subtitle_ocr',
        status: 'success',
        text: 'The hotel charges $100 per night.',
        confidence: 'high',
      },
      candidates: [{ target_word: 'charges', reason: 'key verb', difficulty_hint: 'medium' }],
      note: 'OCR subtitle selected.',
    });
    expect(analyzer).toHaveBeenCalledOnce();
    expect(seen[0].inputPath).toContain(uploadsDir);
    expect(path.basename(seen[0].inputPath)).not.toContain('..');
    expect(seen[0].languages).toEqual({ target_language: '英语', definition_language: '中文' });
    expect(fs.existsSync(seen[0].inputPath)).toBe(false);
    expect(fs.existsSync(seen[0].audioPath)).toBe(false);
    expect(fs.existsSync(seen[0].frameDir)).toBe(false);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
  });

  it('rejects unsupported optional language fields', async () => {
    const app = createApp(db, { uploadsDir, clipAnalysis: { analyze: vi.fn() } });

    const res = await request(app)
      .post('/api/clip-analysis')
      .field('target_language', '意大利语')
      .attach('file', Buffer.from('fake-mp4'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(400);

    expect(res.body.message).toBe('target_language must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语');
  });
});

describe('clip analysis domain', () => {
  const config = {
    id: 'cfg',
    name: 'Local AI',
    base_url: 'https://ai.example/v1',
    api_key: 'sk-secret',
    model: 'test-model',
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  };

  it('detects a sentence locally without active AI config and returns no candidates', async () => {
    const result = await analyzeClip({
      config: undefined,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'success', text: 'Heard sentence.', segments: [] })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'none' as const, text: '', confidence: 'unknown' as const, message: 'No visible subtitle' })),
    });

    expect(result).toEqual({
      status: 'success',
      sentence: { source: 'audio_stt', status: 'success', text: 'Heard sentence.', confidence: 'medium' },
      candidates: [],
      note: 'Using audio transcription because subtitle OCR was unavailable.',
    });
  });

  it('prefers OCR over different STT text and records the audio difference', async () => {
    const ocr = { source: 'subtitle_ocr' as const, status: 'success' as const, text: 'Visible subtitle.', confidence: 'high' as const };
    const stt = { source: 'audio_stt' as const, status: 'success' as const, text: 'Heard sentence.', confidence: 'medium' as const };

    expect(chooseBestSentence(ocr, stt)).toEqual({
      sentence: ocr,
      note: 'Using visible subtitle OCR; audio transcription differs: Heard sentence.',
    });
  });

  it('uses OCR and STT successes to return the best sentence and candidates', async () => {
    const result = await analyzeClip({
      config,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      languages: { target_language: '英语', definition_language: '中文' },
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'success', text: 'Heard sentence.', segments: [] })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'success' as const, text: 'Visible subtitle.', confidence: 'high' as const })),
      candidates: vi.fn(async () => [{ target_word: 'Visible', reason: 'important word', difficulty_hint: 'easy' }]),
    });

    expect(result).toEqual({
      status: 'success',
      sentence: { source: 'subtitle_ocr', status: 'success', text: 'Visible subtitle.', confidence: 'high' },
      candidates: [{ target_word: 'Visible', reason: 'important word', difficulty_hint: 'easy' }],
      note: 'Using visible subtitle OCR; audio transcription differs: Heard sentence.',
    });
  });

  it('falls back to STT when OCR fails', async () => {
    const result = await analyzeClip({
      config,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'success', text: 'Heard sentence.', segments: [] })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'error' as const, text: '', confidence: 'unknown' as const, message: 'OCR unavailable' })),
      candidates: vi.fn(async () => []),
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('expected success');
    expect(result.sentence).toEqual({ source: 'audio_stt', status: 'success', text: 'Heard sentence.', confidence: 'medium' });
    expect(result.note).toBe('Using audio transcription because subtitle OCR was unavailable.');
  });

  it('falls back to OCR when STT fails', async () => {
    const result = await analyzeClip({
      config,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'none', text: '', segments: [], message: 'Transcription unavailable' })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'success' as const, text: 'Visible subtitle.', confidence: 'high' as const })),
      candidates: vi.fn(async () => []),
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('expected success');
    expect(result.sentence).toEqual({ source: 'subtitle_ocr', status: 'success', text: 'Visible subtitle.', confidence: 'high' });
    expect(result.note).toBe('Using visible subtitle OCR; audio transcription unavailable.');
  });

  it('returns none with manual-edit message when OCR and STT both fail', async () => {
    const result = await analyzeClip({
      config,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'none', text: '', segments: [], message: 'Transcription unavailable' })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'none' as const, text: '', confidence: 'unknown' as const, message: 'No visible subtitle' })),
      candidates: vi.fn(async () => [{ target_word: 'ignored', reason: 'ignored', difficulty_hint: 'ignored' }]),
    });

    expect(result).toEqual({
      status: 'none',
      sentence: null,
      candidates: [],
      message: 'Could not detect a sentence from subtitles or audio. Please enter or edit the sentence manually.',
    });
  });


  it('does not call cloud fetch for sentence detection by default; candidates use cloud only with safe config', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{ message: { content: JSON.stringify({ candidates: [{ target_word: 'Visible', reason: 'reason', difficulty_hint: 'easy' }] }) } }],
    }));

    const result = await analyzeClip({
      config,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'none', text: '', segments: [], message: 'Transcription unavailable' })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'success' as const, text: 'Visible subtitle.', confidence: 'high' as const })),
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('expected success');
    expect(result.candidates).toEqual([{ target_word: 'Visible', reason: 'reason', difficulty_hint: 'easy' }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.anything());
  });

  it('does not call fetch at all when sentence exists but no AI config is active', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await analyzeClip({
      config: undefined,
      inputPath: '/tmp/clip.mp4',
      audioPath: '/tmp/audio.wav',
      frameDir: '/tmp/frames',
      extractor: vi.fn(async () => '/tmp/audio.wav'),
      stt: vi.fn(async (): Promise<TranscribeMediaResponseDto> => ({ status: 'none', text: '', segments: [], message: 'Transcription unavailable' })),
      frameExtractor: vi.fn(async () => ['/tmp/frame-001.jpg']),
      ocr: vi.fn(async () => ({ source: 'subtitle_ocr' as const, status: 'success' as const, text: 'Visible subtitle.', confidence: 'high' as const })),
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('expected success');
    expect(result.candidates).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('dedupes and caps target word candidate JSON from OpenAI-compatible chat', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            candidates: [
              { target_word: 'charge', reason: 'verb', difficulty_hint: 'medium' },
              { target_word: 'Charge', reason: 'duplicate', difficulty_hint: 'medium' },
              { target_word: 'hotel', reason: 'noun', difficulty_hint: 'easy' },
              { target_word: 'per', reason: 'preposition', difficulty_hint: 'easy' },
              { target_word: 'night', reason: 'noun', difficulty_hint: 'easy' },
              { target_word: 'fees', reason: 'noun', difficulty_hint: 'medium' },
              { target_word: 'booking', reason: 'noun', difficulty_hint: 'medium' },
              { target_word: 'reservation', reason: 'noun', difficulty_hint: 'hard' },
              { target_word: 'extra', reason: 'too many', difficulty_hint: 'easy' },
            ],
          }),
        },
      }],
    }));

    const candidates = await requestTargetWordCandidates(config, 'The hotel charges $100 per night.', {
      target_language: '英语',
      definition_language: '中文',
    });

    expect(candidates).toHaveLength(8);
    expect(candidates.map((item) => item.target_word)).toEqual([
      'charge', 'hotel', 'per', 'night', 'fees', 'booking', 'reservation', 'extra',
    ]);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-secret' }),
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    }));
  });

  it('returns empty target word candidates when AI content is invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{
        message: {
          content: 'I found useful words: hotel, charges, night.',
        },
      }],
    }));

    await expect(requestTargetWordCandidates(config, 'The hotel charges $100 per night.', {
      target_language: '英语',
      definition_language: '中文',
    })).resolves.toEqual([]);
  });
});
