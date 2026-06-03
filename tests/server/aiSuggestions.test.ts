import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from 'better-sqlite3';
import { lookup } from 'node:dns/promises';

vi.mock('node:dns/promises', () => {
  const lookupMock = vi.fn(async () => []);
  return { default: { lookup: lookupMock }, lookup: lookupMock };
});

import { createApp } from '../../src/server/app.js';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createAiConfig } from '../../src/server/domain/aiConfigs.js';

let db: Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

function aiResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('AI suggestions API', () => {
  it('returns none when no active AI config exists', async () => {
    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
      target_language: '英语',
      definition_language: '中文',
    }).expect(200);

    expect(res.body).toEqual({
      status: 'none',
      meaning_suggestion: '',
      usage_note: '',
      message: 'No active AI config',
    });
  });

  it('calls active OpenAI-compatible endpoint and parses JSON suggestions', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            meaning_suggestion: '收费',
            usage_note: '在句中表示酒店按每晚收取费用。',
          }),
        },
      }],
    }));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body).toEqual({
      status: 'success',
      meaning_suggestion: '收费',
      usage_note: '在句中表示酒店按每晚收取费用。',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-secret' }),
      redirect: 'manual',
    }));
  });

  it('parses suggestions wrapped in Markdown JSON code fences', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{
        message: {
          content: '```json\n{"meaning_suggestion":"收费","usage_note":"在句中表示酒店按每晚收取费用。"}\n```',
        },
      }],
    }));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body).toEqual({
      status: 'success',
      meaning_suggestion: '收费',
      usage_note: '在句中表示酒店按每晚收取费用。',
    });
  });

  it('returns none for malformed upstream content', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{ message: { content: 'not json' } }],
    }));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
  });

  it('returns none for upstream failure without blocking manual creation', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({ error: 'bad' }, 500));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
  });

  it('returns none for manual upstream redirects', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.objectContaining({
      redirect: 'manual',
    }));
  });

  it('returns none when fetch throws', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
  });

  it('returns none without calling fetch when active base URL is unsafe', async () => {
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'http://169.254.169.254/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns none without calling fetch for IPv4-mapped IPv6 metadata URLs', async () => {
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'http://[::ffff:169.254.169.254]/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns none without calling fetch for AWS IMDS IPv6 metadata URLs', async () => {
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'http://[fd00:ec2::254]/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns none without calling fetch for hostnames resolving to metadata link-local addresses', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }] as never);
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns none without calling fetch for hostnames resolving to AWS IMDS IPv6 addresses', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: 'fd00:ec2::254', family: 6 }] as never);
    createAiConfig(db, {
      name: 'Unsafe AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(res.body.status).toBe('none');
    expect(res.body.message).toBe('AI suggestion unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes an abort signal to upstream AI fetches', async () => {
    createAiConfig(db, {
      name: 'Local AI',
      base_url: 'https://ai.example/v1',
      api_key: 'sk-secret',
      model: 'test-model',
      is_active: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse({
      choices: [{ message: { content: '{"meaning_suggestion":"收费","usage_note":"用法说明"}' } }],
    }));

    await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'The hotel charges $100 per night.',
    }).expect(200);

    expect(fetchMock).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
  });

  it('rejects missing target word or sentence', async () => {
    await request(createApp(db)).post('/api/ai/suggestions').send({ target_word: '', sentence: '' }).expect(400);
  });

  it('rejects too-long target word or sentence', async () => {
    const targetWordRes = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'a'.repeat(201),
      sentence: 'The hotel charges $100 per night.',
    }).expect(400);

    expect(targetWordRes.body.message).toBe('target_word must be at most 200 characters');

    const sentenceRes = await request(createApp(db)).post('/api/ai/suggestions').send({
      target_word: 'charge',
      sentence: 'a'.repeat(2001),
    }).expect(400);

    expect(sentenceRes.body.message).toBe('sentence must be at most 2000 characters');
  });
});
