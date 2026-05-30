import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../src/server/app.js';

describe('health route', () => {
  it('returns ok for GET /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
