import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createApp } from '../../src/server/app.js';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { createMedia } from '../../src/server/domain/media.js';
import { createSyncApp } from '../../src/server/syncApp.js';

let db: Database;
let uploadsDir: string;

function adminApp() {
  return createApp(db, { uploadsDir, syncIdentityDir: path.join(uploadsDir, 'sync-identity') });
}

beforeEach(() => {
  db = createTestDb();
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-sync-service-'));
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

async function pairAndroid(deviceId = 'android-1'): Promise<{ credential: string; sessionId: string; secret: string }> {
  const admin = adminApp();
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
    await request(sync).get('/v1/capabilities').set('X-CVN-Protocol', '0').expect(200);
    await request(sync).get('/v1/snapshot').set('X-CVN-Protocol', '0').expect(426);
  });

  it('pairs after PC approval and stores only the long-term credential hash', async () => {
    const { credential, sessionId, secret } = await pairAndroid();
    expect(credential).toBeTruthy();
    const stored = db.prepare('SELECT credential_hash FROM sync_devices WHERE device_id = ?').get('android-1') as { credential_hash: string };
    expect(stored.credential_hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(stored.credential_hash).not.toBe(credential);
    const adminStatus = await request(adminApp()).get('/api/device-sync/status').expect(200);
    expect(JSON.stringify(adminStatus.body)).not.toContain(credential);
    expect(adminStatus.body.devices).toHaveLength(1);
    await request(createSyncApp(db, uploadsDir))
      .get(`/v1/pair/${sessionId}/status`)
      .set('X-CVN-Protocol', '1')
      .set('X-Pairing-Secret', secret)
      .expect(401);
    expect(db.prepare('SELECT session_id FROM pairing_sessions WHERE session_id = ?').get(sessionId)).toBeUndefined();
  });

  it('authenticates event, snapshot, and acknowledgement endpoints', async () => {
    const card = createCard(db, { target_word: 'secure', context_meaning: '安全', target_language: '英语', definition_language: '中文' });
    const context = createContext(db, { card_id: card.id, sentence: 'Resume this audio.' });
    const mediaBytes = Buffer.from('abcdef');
    fs.writeFileSync(path.join(uploadsDir, 'resume.mp3'), mediaBytes);
    createMedia(db, {
      context_example_id: context.id,
      media_type: 'audio',
      file_name: 'resume.mp3',
      file_path: path.join(uploadsDir, 'resume.mp3'),
      mime_type: 'audio/mpeg',
      file_size: mediaBytes.length,
    });
    const { credential } = await pairAndroid();
    const sync = createSyncApp(db, uploadsDir);
    const headers = { 'X-CVN-Protocol': '1', Authorization: `Bearer ${credential}` };

    const events = await request(sync).post('/v1/events').set(headers).send({ events: [] }).expect(200);
    expect(events.body.accepted_through).toBe(0);
    const snapshot = await request(sync).get('/v1/snapshot').set(headers).expect(200);
    expect(snapshot.body.cards.map((item: { id: string }) => item.id)).toContain(card.id);
    await request(sync).post(`/v1/snapshot/${snapshot.body.revision}/ack`).set(headers).expect(204);
    await request(sync).get(`/v1/snapshot?known_revision=${snapshot.body.revision}`).set(headers).expect(204);
    await request(sync).get('/v1/media/../../api/cards').set(headers).expect(404);
    await request(sync).get('/v1/media/not-a-hash').set(headers).expect(400);
    const mediaHash = createHash('sha256').update(mediaBytes).digest('hex');
    const ranged = await request(sync).get(`/v1/media/${mediaHash}`).set(headers).set('Range', 'bytes=1-3').expect(206);
    expect(ranged.body).toEqual(Buffer.from('bcd'));
  });

  it('revokes both transport credentials and requires revocation before replacing the Android', async () => {
    const { credential } = await pairAndroid();
    const admin = adminApp();
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
    const admin = adminApp();
    const updated = await request(admin)
      .patch('/api/device-sync/tailscale')
      .send({ tailscale_url: 'https://workstation.example.ts.net/some/path' })
      .expect(200);
    expect(updated.body.configured_url).toBe('https://workstation.example.ts.net');
    expect(updated.body.serve_command).toBe('tailscale serve --bg 3108');
    await request(admin).patch('/api/device-sync/tailscale').send({ tailscale_url: 'http://insecure.test' }).expect(409);
    await request(admin).patch('/api/device-sync/tailscale').send({ tailscale_url: 'https://not-tailnet.example.com' }).expect(409);
  });

  it('includes pinned LAN connection details after LAN is enabled', async () => {
    const admin = adminApp();
    await request(admin).patch('/api/device-sync/lan').send({ enabled: true }).expect(200);
    const pairing = await request(admin).post('/api/device-sync/pairing-sessions').expect(201);
    expect(pairing.body.lan.spki_sha256).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(pairing.body.lan.service_name).toBe('cvn-vocabulary-notebook');
    const profile = await request(admin).get('/api/device-sync/connection-profile').expect(200);
    expect(profile.body.profile.lan_spki_sha256).toBe(pairing.body.lan.spki_sha256);
    expect(profile.body.signature).toBeTruthy();
  });
});
