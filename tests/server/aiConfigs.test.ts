import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { Database } from 'better-sqlite3';
import request from 'supertest';

import { createTestDb } from '../../src/server/db/testDb.js';
import { createApp } from '../../src/server/app.js';
import {
  createAiConfig,
  deleteAiConfig,
  getActiveAiConfigWithKey,
  listAiConfigs,
  setActiveAiConfig,
  updateAiConfig,
} from '../../src/server/domain/aiConfigs.js';

let db: Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  delete process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS;
  vi.restoreAllMocks();
  db.close();
});

describe('AI config domain', () => {
  it('creates masked config DTOs without exposing API keys', () => {
    const config = createAiConfig(db, {
      name: ' DeepSeek ',
      base_url: 'https://api.deepseek.com/v1/',
      api_key: ' sk-secret ',
      model: ' deepseek-chat ',
      is_active: true,
    });

    expect(config).toMatchObject({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      is_active: 1,
      has_api_key: true,
    });
    expect(config).not.toHaveProperty('api_key');
    expect(listAiConfigs(db)).toHaveLength(1);
  });

  it('keeps exactly one active config', () => {
    const first = createAiConfig(db, {
      name: 'First',
      base_url: 'https://example.com/v1',
      api_key: 'key-1',
      model: 'model-1',
      is_active: true,
    });
    const second = createAiConfig(db, {
      name: 'Second',
      base_url: 'https://example.org/v1',
      api_key: 'key-2',
      model: 'model-2',
      is_active: true,
    });

    const configs = listAiConfigs(db);
    expect(configs.find((cfg) => cfg.id === first.id)?.is_active).toBe(0);
    expect(configs.find((cfg) => cfg.id === second.id)?.is_active).toBe(1);
    expect(getActiveAiConfigWithKey(db)?.api_key).toBe('key-2');
  });

  it('updates metadata without clearing API key when api_key is omitted', () => {
    const config = createAiConfig(db, {
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
    });

    const updated = updateAiConfig(db, config.id, { name: 'DeepSeek Chat', model: 'deepseek-chat-v2' });

    expect(updated).toMatchObject({ name: 'DeepSeek Chat', model: 'deepseek-chat-v2', has_api_key: true });
    expect(getActiveAiConfigWithKey(db)).toBeUndefined();
    const row = db.prepare('SELECT api_key FROM ai_configs WHERE id = ?').get(config.id) as { api_key: string };
    expect(row.api_key).toBe('sk-secret');
  });

  it('can activate and soft-delete configs', () => {
    const first = createAiConfig(db, {
      name: 'First',
      base_url: 'https://example.com/v1',
      api_key: 'key-1',
      model: 'model-1',
    });
    const second = createAiConfig(db, {
      name: 'Second',
      base_url: 'https://example.org/v1',
      api_key: 'key-2',
      model: 'model-2',
    });

    setActiveAiConfig(db, first.id);
    expect(getActiveAiConfigWithKey(db)?.id).toBe(first.id);
    deleteAiConfig(db, first.id);
    expect(getActiveAiConfigWithKey(db)).toBeUndefined();
    expect(listAiConfigs(db).map((cfg) => cfg.id)).toEqual([second.id]);
  });
});

describe('AI config API', () => {
  it('creates, lists, activates, patches, and deletes masked configs', async () => {
    const app = createApp(db);

    const created = await request(app).post('/api/ai-configs').send({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
      is_active: true,
    }).expect(201);

    expect(created.body).toMatchObject({
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      is_active: 1,
      has_api_key: true,
    });
    expect(created.body).not.toHaveProperty('api_key');

    const listed = await request(app).get('/api/ai-configs').expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]).not.toHaveProperty('api_key');

    const patched = await request(app).patch(`/api/ai-configs/${created.body.id}`).send({
      name: 'DeepSeek Chat',
      model: 'deepseek-chat-v2',
    }).expect(200);
    expect(patched.body).toMatchObject({ name: 'DeepSeek Chat', model: 'deepseek-chat-v2', has_api_key: true });

    await request(app).post(`/api/ai-configs/${created.body.id}/activate`).expect(200);
    await request(app).delete(`/api/ai-configs/${created.body.id}`).expect(200);
    await request(app).get('/api/ai-configs').expect(200).expect([]);
  });

  it('fetches model list from entered Base URL and API Key', async () => {
    process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS = 'true';
    const app = createApp(db);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'qwen2.5' }, { id: 'deepseek-chat' }, { id: '' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      const res = await request(app).post('/api/ai-configs/models').send({
        base_url: 'http://127.0.0.1:11434/v1/',
        api_key: 'ollama',
      }).expect(200);

      expect(res.body.models).toEqual(['deepseek-chat', 'qwen2.5']);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'Bearer ollama' }),
          redirect: 'manual',
        }),
      );
    } finally {
      delete process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS;
    }
  });

  it('fetches model list for a saved config without exposing its key', async () => {
    process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS = 'true';
    const app = createApp(db);
    const config = createAiConfig(db, {
      name: 'Local',
      base_url: 'http://127.0.0.1:11434/v1',
      api_key: 'stored-key',
      model: 'qwen2.5',
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'qwen2.5' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      const res = await request(app).get(`/api/ai-configs/${config.id}/models`).expect(200);

      expect(res.body.models).toEqual(['qwen2.5']);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/v1/models',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer stored-key' }) }),
      );
    } finally {
      delete process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS;
    }
  });

  it('rejects empty PATCH bodies', async () => {
    const app = createApp(db);
    const created = createAiConfig(db, {
      name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key: 'sk-secret',
      model: 'deepseek-chat',
    });

    const res = await request(app).patch(`/api/ai-configs/${created.id}`).send({}).expect(400);

    expect(res.body.message).toBe('PATCH body must include at least one field to update');
  });

  it('rejects invalid AI config inputs', async () => {
    const app = createApp(db);

    await request(app).post('/api/ai-configs').send({
      name: '',
      base_url: 'ftp://invalid.example',
      api_key: '',
      model: '',
    }).expect(400);

    await request(app).post('/api/ai-configs').send({
      name: 'Bad',
      base_url: 'https://example.com/v1',
      api_key: 'sk-secret',
      model: 'model',
      is_active: 'yes',
    }).expect(400);
  });
});
