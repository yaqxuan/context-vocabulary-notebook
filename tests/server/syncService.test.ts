import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createApp } from '../../src/server/app.js';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createSyncApp } from '../../src/server/syncApp.js';

let db: Database;
let uploadsDir: string;

beforeEach(() => {
  db = createTestDb();
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-sync-service-'));
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

async function pairAndroid(deviceId = 'android-1'): Promise<{ credential: string; sessionId: string; secret: string }> {
  const admin = createApp(db, { uploadsDir });
  const sync = createSyncApp(db, uploadsDir);
  const created = await request(admin).post('/api/device-sync/pairing-sessions').expect(201);
  const payload = created.body as { session_id: string; secret: string };
  await request(sync)
    .post('/v1/pair')
    .set('X-CVN-Protocol', '1')
    .send({ session_id: payload.session_id, secret: payload.secret, device_id: deviceId, device_name: 'My Android' })
    .expect(202);
  await request(admin).post(`/api/device-sync/pairing-sessions/${payload.session_id}/approve`).expect(200);
  const status = await request(sync)
    .get(`/v1/pair/${payload.session_id}/status`)
    .set('X-CVN-Protocol', '1')
    .set('X-Pairing-Secret', payload.secret)
    .expect(200);
  return { credential: status.body.credential as string, sessionId: payload.session_id, secret: payload.secret };
}

describe('dedicated sync service', () => {
  it('exposes capabilities and no regular application API', async () => {
    const sync = createSyncApp(db, uploadsDir);
    const capabilities = await request(sync).get('/v1/capabilities').expect(200);
    expect(capabilities.body).toMatchObject({ protocol_version: 1, minimum_client_version: '0.3.0-alpha' });
    expect(capabilities.body.server_id).toBeTruthy();
    await request(sync).get('/api/cards').expect(404);
  });

  it('requires an explicit protocol version and device credential', async () => {
    const sync = createSyncApp(db, uploadsDir);
    await request(sync).get('/v1/snapshot').expect(426);
    await request(sync).get('/v1/snapshot').set('X-CVN-Protocol', '1').expect(401);
    await request(sync)
      .get('/v1/snapshot')
      .set('X-CVN-Protocol', '1')
      .set('Authorization', 'Bearer wrong')
      .expect(401);
  });

  it('pairs after PC approval and stores only the long-term credential hash', async () => {
    const { credential } = await pairAndroid();
    expect(credential).toBeTruthy();
    const stored = db.prepare('SELECT credential_hash FROM sync_devices WHERE device_id = ?').get('android-1') as { credential_hash: string };
    expect(stored.credential_hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(stored.credential_hash).not.toBe(credential);
    const adminStatus = await request(createApp(db, { uploadsDir })).get('/api/device-sync/status').expect(200);
    expect(JSON.stringify(adminStatus.body)).not.toContain(credential);
    expect(adminStatus.body.devices).toHaveLength(1);
  });

  it('authenticates event, snapshot, and acknowledgement endpoints', async () => {
    const card = createCard(db, { target_word: 'secure', context_meaning: '安全', target_language: '英语', definition_language: '中文' });
    const { credential } = await pairAndroid();
    const sync = createSyncApp(db, uploadsDir);
    const headers = { 'X-CVN-Protocol': '1', Authorization: `Bearer ${credential}` };

    const events = await request(sync).post('/v1/events').set(headers).send({ events: [] }).expect(200);
    expect(events.body.accepted_through).toBe(0);
    const snapshot = await request(sync).get('/v1/snapshot').set(headers).expect(200);
    expect(snapshot.body.cards.map((item: { id: string }) => item.id)).toContain(card.id);
    await request(sync).post(`/v1/snapshot/${snapshot.body.revision}/ack`).set(headers).expect(204);
    await request(sync).get(`/v1/snapshot?known_revision=${snapshot.body.revision}`).set(headers).expect(204);
  });

  it('revokes both transport credentials and requires revocation before replacing the Android', async () => {
    const { credential } = await pairAndroid();
    const admin = createApp(db, { uploadsDir });
    const sync = createSyncApp(db, uploadsDir);

    const nextSession = await request(admin).post('/api/device-sync/pairing-sessions').expect(201);
    await request(sync).post('/v1/pair').set('X-CVN-Protocol', '1').send({
      session_id: nextSession.body.session_id,
      secret: nextSession.body.secret,
      device_id: 'android-2',
      device_name: 'Second Android',
    }).expect(202);
    await request(admin).post(`/api/device-sync/pairing-sessions/${nextSession.body.session_id}/approve`).expect(409);

    await request(admin).delete('/api/device-sync/devices/android-1').expect(204);
    await request(sync)
      .get('/v1/snapshot')
      .set('X-CVN-Protocol', '1')
      .set('Authorization', `Bearer ${credential}`)
      .expect(403);
    await request(admin).post(`/api/device-sync/pairing-sessions/${nextSession.body.session_id}/approve`).expect(200);
  });

  it('stores a validated Tailscale HTTPS origin and exposes the Serve command', async () => {
    const admin = createApp(db, { uploadsDir });
    const updated = await request(admin)
      .patch('/api/device-sync/tailscale')
      .send({ tailscale_url: 'https://workstation.example.ts.net/some/path' })
      .expect(200);
    expect(updated.body.configured_url).toBe('https://workstation.example.ts.net');
    expect(updated.body.serve_command).toBe('tailscale serve --bg 3108');
    await request(admin).patch('/api/device-sync/tailscale').send({ tailscale_url: 'http://insecure.test' }).expect(409);
  });
});
