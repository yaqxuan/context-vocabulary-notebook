import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createTestDb } from '../../src/server/db/testDb.js';
import { createCard } from '../../src/server/domain/cards.js';
import { createContext } from '../../src/server/domain/contexts.js';
import { createMedia } from '../../src/server/domain/media.js';
import { submitReview } from '../../src/server/domain/review.js';
import {
  SyncEventConflictError,
  SyncSequenceGapError,
  acknowledgeSnapshot,
  applyCardActionBatch,
  applyReviewEventBatch,
  buildSyncSnapshot,
} from '../../src/server/domain/sync.js';
import type { SyncCardActionInput, SyncReviewEventInput, SyncSnapshot } from '../../src/shared/sync.js';

let db: Database;
let replica: Database;
let uploadsDir: string;

beforeEach(() => {
  db = createTestDb();
  replica = new BetterSqlite3(':memory:');
  replica.exec(`
    CREATE TABLE cards (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
    CREATE TABLE fsrs_states (card_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
    CREATE TABLE replica_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL);
    INSERT INTO replica_state (id, revision) VALUES (1, 0);
  `);
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvn-sync-'));
});

afterEach(() => {
  db.close();
  replica.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

function mobileEvent(cardId: string, sequence: number, reviewedAt: string, rating: 'again' | 'good' = 'good'): SyncReviewEventInput {
  return {
    event_id: `mobile-event-${sequence}`,
    card_id: cardId,
    device_sequence: sequence,
    rating,
    reviewed_at: reviewedAt,
    recorded_at: reviewedAt,
    scheduler_version: 'ts-fsrs@5.4.1',
    parameter_version: 'default-v1',
    due_date_before: reviewedAt,
    due_date_after: reviewedAt,
    state_before_json: null,
    state_after_json: null,
  };
}

function mobileAction(
  cardId: string,
  sequence: number,
  action: 'set_favorite' | 'mark_mastered',
  value = true,
): SyncCardActionInput {
  return {
    action_id: `mobile-action-${sequence}`,
    card_id: cardId,
    action_sequence: sequence,
    action,
    value,
    recorded_at: `2026-07-${String(sequence).padStart(2, '0')}T09:00:00.000Z`,
  } as SyncCardActionInput;
}

function applySnapshotToReplica(snapshot: SyncSnapshot): void {
  replica.transaction(() => {
    replica.exec('DELETE FROM cards; DELETE FROM fsrs_states;');
    const insertCard = replica.prepare('INSERT INTO cards (id, payload_json) VALUES (?, ?)');
    for (const card of snapshot.cards) insertCard.run(card.id, JSON.stringify(card));
    const insertFsrs = replica.prepare('INSERT INTO fsrs_states (card_id, payload_json) VALUES (?, ?)');
    for (const state of snapshot.fsrs_states) insertFsrs.run(state.card_id, JSON.stringify(state));
    replica.prepare('UPDATE replica_state SET revision = ? WHERE id = 1').run(snapshot.revision);
  })();
}

describe('sync engine', () => {
  it('applies contiguous events once and rejects sequence gaps or conflicts', () => {
    const card = createCard(db, { target_word: 'sync', context_meaning: '同步', target_language: '英语', definition_language: '中文' });
    const event = mobileEvent(card.id, 1, '2026-07-01T08:00:00.000Z');
    const first = applyReviewEventBatch(db, 'android-1', [event]);
    const duplicate = applyReviewEventBatch(db, 'android-1', [event]);

    expect(first.accepted_through).toBe(1);
    expect(first.affected_card_ids).toEqual([card.id]);
    expect(duplicate.accepted_through).toBe(1);
    expect(duplicate.affected_card_ids).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM review_logs WHERE id = ?').get(event.event_id)).toEqual({ count: 1 });
    expect(() => applyReviewEventBatch(db, 'android-1', [mobileEvent(card.id, 3, '2026-07-03T08:00:00.000Z')]))
      .toThrowError(SyncSequenceGapError);
    expect(() => applyReviewEventBatch(db, 'android-1', [{ ...event, event_id: 'different-event' }]))
      .toThrowError(SyncEventConflictError);
    expect(() => applyReviewEventBatch(
      db,
      'android-oversized',
      Array.from({ length: 501 }, (_, index) => mobileEvent(card.id, index + 1, '2026-07-04T08:00:00.000Z')),
    )).toThrowError(SyncEventConflictError);
  });

  it('replays concurrent PC and Android streams into one canonical state', () => {
    const card = createCard(db, { target_word: 'merge', context_meaning: '合并', target_language: '英语', definition_language: '中文' });
    submitReview(db, card.id, 'good', new Date('2026-07-02T08:00:00.000Z'));
    applyReviewEventBatch(db, 'android-1', [mobileEvent(card.id, 1, '2026-07-01T08:00:00.000Z', 'again')]);

    const state = db.prepare('SELECT reps, last_reviewed_at FROM fsrs_states WHERE card_id = ?').get(card.id);
    expect(state).toEqual({ reps: 2, last_reviewed_at: '2026-07-02T08:00:00.000Z' });
    expect(db.prepare('SELECT COUNT(*) AS count FROM review_logs WHERE card_id = ? AND replay_epoch = 1').get(card.id)).toEqual({ count: 2 });
  });

  it('applies offline favorite and mastered actions once with an independent sequence', () => {
    const card = createCard(db, {
      target_word: 'action',
      context_meaning: '操作',
      target_language: '英语',
      definition_language: '中文',
    });
    const actions = [
      mobileAction(card.id, 1, 'set_favorite', true),
      mobileAction(card.id, 2, 'mark_mastered'),
    ];
    const first = applyCardActionBatch(db, 'android-actions', actions);
    const duplicate = applyCardActionBatch(db, 'android-actions', actions);

    expect(first.accepted_through).toBe(2);
    expect(first.affected_card_ids).toEqual([card.id]);
    expect(duplicate.accepted_through).toBe(2);
    expect(duplicate.affected_card_ids).toEqual([]);
    expect(db.prepare(`
      SELECT is_favorite, status FROM word_sense_cards WHERE id = ?
    `).get(card.id)).toEqual({ is_favorite: 1, status: 'mastered' });
    expect(db.prepare(`
      SELECT COUNT(*) AS count FROM sync_card_action_events WHERE device_id = ?
    `).get('android-actions')).toEqual({ count: 2 });
    expect(() => applyCardActionBatch(
      db,
      'android-actions',
      [mobileAction(card.id, 4, 'set_favorite', false)],
    )).toThrowError(SyncSequenceGapError);
  });

  it('acknowledges but does not resurrect actions for a deleted card', () => {
    const card = createCard(db, {
      target_word: 'deleted',
      context_meaning: '已删除',
      target_language: '英语',
      definition_language: '中文',
    });
    db.prepare('UPDATE word_sense_cards SET deleted_at = ? WHERE id = ?')
      .run('2026-07-01T00:00:00.000Z', card.id);

    const result = applyCardActionBatch(
      db,
      'android-deleted',
      [mobileAction(card.id, 1, 'set_favorite', true)],
    );

    expect(result.accepted_through).toBe(1);
    expect(result.affected_card_ids).toEqual([]);
    expect(result.ignored_deleted_card_ids).toEqual([card.id]);
    expect(db.prepare(`
      SELECT outcome FROM sync_card_action_events WHERE device_id = ?
    `).get('android-deleted')).toEqual({ outcome: 'ignored_deleted' });
  });

  it('builds an atomic full snapshot that can replace a second SQLite replica', () => {
    const card = createCard(db, { target_word: 'snapshot', context_meaning: '快照', target_language: '英语', definition_language: '中文' });
    createContext(db, { card_id: card.id, sentence: 'Keep a complete snapshot.' });
    db.prepare(`
      INSERT INTO ai_configs (id, name, base_url, api_key, model, created_at, updated_at)
      VALUES ('secret-config', 'private', 'https://example.test', 'sk-never-sync', 'model', ?, ?)
    `).run(new Date().toISOString(), new Date().toISOString());

    const snapshot = buildSyncSnapshot(db, uploadsDir);
    expect(snapshot).not.toBeNull();
    applySnapshotToReplica(snapshot!);
    expect(replica.prepare('SELECT COUNT(*) AS count FROM cards').get()).toEqual({ count: 1 });
    expect(replica.prepare('SELECT COUNT(*) AS count FROM fsrs_states').get()).toEqual({ count: 1 });
    expect(replica.prepare('SELECT revision FROM replica_state WHERE id = 1').get()).toEqual({ revision: snapshot!.revision });
    expect(JSON.stringify(snapshot)).not.toContain('sk-never-sync');
    expect(buildSyncSnapshot(db, uploadsDir, snapshot!.revision)).toBeNull();

    applyReviewEventBatch(db, 'android-replica', []);
    acknowledgeSnapshot(db, 'android-replica', 0);
    const cursor = db.prepare('SELECT acknowledged_revision FROM sync_device_cursors WHERE device_id = ?').get('android-replica');
    expect(cursor).toEqual({ acknowledged_revision: 0 });
  });

  it('hashes image, audio, and video media for offline sync', () => {
    const card = createCard(db, { target_word: 'media', context_meaning: '媒体', target_language: '英语', definition_language: '中文' });
    const context = createContext(db, { card_id: card.id, sentence: 'Media travels by hash.' });
    for (const [name, type, mime] of [
      ['image.png', 'image', 'image/png'],
      ['audio.mp3', 'audio', 'audio/mpeg'],
      ['video.mp4', 'video', 'video/mp4'],
    ] as const) {
      const contents = Buffer.from(name);
      fs.writeFileSync(path.join(uploadsDir, name), contents);
      createMedia(db, {
        context_example_id: context.id,
        media_type: type,
        file_name: name,
        file_path: path.join(uploadsDir, name),
        mime_type: mime,
        file_size: contents.length,
      });
    }

    const snapshot = buildSyncSnapshot(db, uploadsDir)!;
    expect(snapshot.media.find((item) => item.media_type === 'image')).toMatchObject({ offline_available: true });
    expect(snapshot.media.find((item) => item.media_type === 'audio')).toMatchObject({ offline_available: true });
    expect(snapshot.media.find((item) => item.media_type === 'video')).toMatchObject({ offline_available: true });
    expect(snapshot.media.find((item) => item.media_type === 'video')?.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('increments the snapshot revision when existing video gains its offline hash', () => {
    const card = createCard(db, { target_word: 'watch', context_meaning: '观看', target_language: '英语', definition_language: '中文' });
    const context = createContext(db, { card_id: card.id, sentence: 'Watch the original context.' });
    const video = Buffer.from('video-revision-source');
    fs.writeFileSync(path.join(uploadsDir, 'revision-video.mp4'), video);
    const created = createMedia(db, {
      context_example_id: context.id,
      media_type: 'video',
      file_name: 'revision-video.mp4',
      file_path: path.join(uploadsDir, 'revision-video.mp4'),
      mime_type: 'video/mp4',
      file_size: video.length,
    });
    const knownRevision = db.prepare('SELECT content_revision FROM sync_state WHERE id = 1').pluck().get() as number;
    expect(db.prepare('SELECT sha256 FROM media_files WHERE id = ?').pluck().get(created.id)).toBeNull();

    const snapshot = buildSyncSnapshot(db, uploadsDir, knownRevision)!;
    expect(snapshot.revision).toBeGreaterThan(knownRevision);
    expect(snapshot.media.find((item) => item.id === created.id)).toMatchObject({ offline_available: true });
  });

  it('derives a cached offline audio asset when a context only has video', () => {
    const card = createCard(db, { target_word: 'listen', context_meaning: '听', target_language: '英语', definition_language: '中文' });
    const context = createContext(db, { card_id: card.id, sentence: 'Listen to the original context.' });
    const video = Buffer.from('video-source');
    fs.writeFileSync(path.join(uploadsDir, 'video-only.mp4'), video);
    createMedia(db, {
      context_example_id: context.id,
      media_type: 'video',
      file_name: 'video-only.mp4',
      file_path: path.join(uploadsDir, 'video-only.mp4'),
      mime_type: 'video/mp4',
      file_size: video.length,
    });

    let extractionCount = 0;
    const extractAudio = (_sourcePath: string, outputPath: string) => {
      extractionCount += 1;
      fs.writeFileSync(outputPath, Buffer.from('derived-audio'));
    };
    const first = buildSyncSnapshot(db, uploadsDir, undefined, { extractAudio })!;
    const audio = first.media.find((item) => item.id.startsWith('derived-audio-'));
    expect(audio).toMatchObject({ media_type: 'audio', mime_type: 'audio/mp4', offline_available: true });
    expect(audio?.sha256).toMatch(/^[a-f0-9]{64}$/u);

    const second = buildSyncSnapshot(db, uploadsDir, undefined, { extractAudio })!;
    expect(second.media.find((item) => item.id === audio?.id)?.sha256).toBe(audio?.sha256);
    expect(extractionCount).toBe(1);
  });
});
