import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeConnection } from '../../src/server/db/connection.js';

const ORIGINAL_DATABASE_PATH = process.env.DATABASE_PATH;
const ORIGINAL_UPLOADS_DIR = process.env.UPLOADS_DIR;

describe('production app startup', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.UPLOADS_DIR = './uploads-test-startup';
  });

  afterEach(() => {
    closeConnection();
  });

  afterAll(() => {
    if (ORIGINAL_DATABASE_PATH === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = ORIGINAL_DATABASE_PATH;
    }

    if (ORIGINAL_UPLOADS_DIR === undefined) {
      delete process.env.UPLOADS_DIR;
    } else {
      process.env.UPLOADS_DIR = ORIGINAL_UPLOADS_DIR;
    }
  });

  it('creates an app with full API routes initialized', async () => {
    const { createProductionApp } = await import('../../src/server/startup.js');
    const app = createProductionApp();

    const response = await request(app).get('/api/statistics/home');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      due_count: 0,
      reviewed_today_count: 0,
      again_today_count: 0,
      good_today_count: 0,
      daily_review_limit: 20,
      is_daily_target_reached: false,
    });
  });
});
