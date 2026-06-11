import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app.js';
import { createTestDb, destroyTestDb } from '../../src/server/db/testDb.js';
import type { TestDb } from '../../src/server/db/testDb.js';
import type { AiConfigDto, CreateAiConfigBody, AiSuggestionResponseDto } from '../../src/shared/types.js';

// Compile-time shape checks; runtime endpoint coverage comes with AI config routes.
const typeSmokeAiConfig: AiConfigDto = {
  id: 'cfg-1',
  name: 'DeepSeek',
  base_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  is_active: 1,
  has_api_key: true,
  created_at: '2026-06-03T00:00:00.000Z',
  updated_at: '2026-06-03T00:00:00.000Z',
};
const typeSmokeCreateAiConfig: CreateAiConfigBody = {
  name: 'DeepSeek',
  base_url: 'https://api.deepseek.com/v1',
  api_key: 'sk-local',
  model: 'deepseek-chat',
};
const typeSmokeAiSuggestion: AiSuggestionResponseDto = {
  status: 'success',
  meaning_suggestion: '收费',
  usage_note: '在句中表示收取费用。',
};
void typeSmokeAiConfig;
void typeSmokeCreateAiConfig;
void typeSmokeAiSuggestion;

let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  db = createTestDb();
  app = createApp(db);
});

afterAll(() => {
  destroyTestDb(db);
});

afterEach(() => {
  db.prepare("UPDATE user_settings SET interface_language = '英语', default_target_language = '英语', default_definition_language = '中文', daily_review_limit = 20 WHERE id = 1").run();
});

describe('settings API', () => {
  it('returns singleton settings row defaults', async () => {
    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      interface_language: '英语',
      default_target_language: '英语',
      default_definition_language: '中文',
      daily_review_limit: 20,
    });
  });

  it('updates V1 settings using fixed id=1', async () => {
    const res = await request(app).patch('/api/settings').send({
      interface_language: '英语',
      default_target_language: '日语',
      default_definition_language: '英语',
      daily_review_limit: 50,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      interface_language: '英语',
      default_target_language: '日语',
      default_definition_language: '英语',
      daily_review_limit: 50,
    });
    expect(db.prepare('SELECT COUNT(*) AS count FROM user_settings').get()).toEqual({ count: 1 });
  });

  it('updates only provided setting fields', async () => {
    db.prepare("UPDATE user_settings SET interface_language = 'en-US', default_target_language = '日语', default_definition_language = '英语', daily_review_limit = 50 WHERE id = 1").run();

    const res = await request(app).patch('/api/settings').send({ daily_review_limit: 100 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      interface_language: 'en-US',
      default_target_language: '日语',
      default_definition_language: '英语',
      daily_review_limit: 100,
    });
  });

  it('rejects invalid daily review limits', async () => {
    for (const dailyReviewLimit of [0, -1, 1.5, '20', null]) {
      const res = await request(app).patch('/api/settings').send({ daily_review_limit: dailyReviewLimit });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('daily_review_limit must be a positive integer');
    }
  });

  it('rejects non-string or empty language settings', async () => {
    for (const value of [42, '']) {
      for (const field of ['interface_language', 'default_target_language', 'default_definition_language']) {
        const res = await request(app).patch('/api/settings').send({ [field]: value });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(`${field} must be a non-empty string`);
      }
    }
  });

  it('rejects unsupported language settings', async () => {
    for (const field of ['interface_language', 'default_target_language', 'default_definition_language']) {
      const res = await request(app).patch('/api/settings').send({ [field]: '意大利语' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(`${field} must be one of: 中文, 英语, 日语, 韩语, 法语, 德语, 西班牙语, 俄语`);
    }
  });

  it('ignores future-scope settings', async () => {
    const res = await request(app).patch('/api/settings').send({ sync_enabled: true, local_api_enabled: true });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('sync_enabled');
    expect(res.body).not.toHaveProperty('local_api_enabled');
    expect(db.prepare('SELECT COUNT(*) AS count FROM user_settings').get()).toEqual({ count: 1 });
  });
});
