import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { ReviewRating } from '../shared/constants.js';
import { SCHEDULER_PARAMETER_VERSION, SCHEDULER_VERSION, scheduleReview } from '../shared/scheduler.js';
import type { SyncReviewEventInput, SyncSnapshot } from '../shared/sync.js';
import type { CardInput } from 'ts-fsrs';

const DATABASE_NAME = 'context-vocabulary-notebook-mobile';
const MOBILE_SCHEMA_VERSION = 1;

export type MobileTransport = 'lan' | 'tailscale';

export interface MobileConfig {
  device_id: string;
  device_name: string;
  server_id: string | null;
  credential: string | null;
  selected_transport: MobileTransport;
  lan_url: string | null;
  lan_spki_sha256: string | null;
  lan_public_key: string | null;
  lan_service_name: string | null;
  tailscale_url: string | null;
  snapshot_revision: number;
  next_device_sequence: number;
  last_sync_at: string | null;
  interface_language: string;
}

export interface MobileDueCard {
  id: string;
  target_word: string;
  context_meaning: string;
  target_language: string;
  definition_language: string;
  due_date: string;
  primary_sentence: string | null;
  media: Array<{ media_type: string; local_path: string | null; offline_available: number }>;
}

export interface MobileProgress {
  reviewedToday: number;
  dailyLimit: number;
  pendingUpload: number;
}

function randomBase64Url(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  let binary = '';
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`Snapshot field ${field} is invalid`);
  return value;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

export class MobileDatabase {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private connection: SQLiteDBConnection | null = null;

  async open(): Promise<void> {
    if (this.connection) return;
    const stored = await this.sqlite.isSecretStored();
    if (!stored.result) await this.sqlite.setEncryptionSecret(randomBase64Url(32));
    const consistent = await this.sqlite.checkConnectionsConsistency();
    if (!consistent.result) await this.sqlite.closeAllConnections();
    const existing = await this.sqlite.isConnection(DATABASE_NAME, false);
    this.connection = existing.result
      ? await this.sqlite.retrieveConnection(DATABASE_NAME, false)
      : await this.sqlite.createConnection(DATABASE_NAME, true, 'secret', MOBILE_SCHEMA_VERSION, false);
    await this.connection.open();
    await this.createSchema();
  }

  private db(): SQLiteDBConnection {
    if (!this.connection) throw new Error('Mobile database is not open');
    return this.connection;
  }

  private async createSchema(): Promise<void> {
    await this.db().execute(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS mobile_schema_migrations (
        version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mobile_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        server_id TEXT,
        credential TEXT,
        selected_transport TEXT NOT NULL DEFAULT 'lan' CHECK (selected_transport IN ('lan', 'tailscale')),
        lan_url TEXT,
        lan_spki_sha256 TEXT,
        lan_public_key TEXT,
        lan_service_name TEXT,
        tailscale_url TEXT,
        snapshot_revision INTEGER NOT NULL DEFAULT 0,
        next_device_sequence INTEGER NOT NULL DEFAULT 1,
        last_sync_at TEXT,
        interface_language TEXT NOT NULL DEFAULT '英语'
      );
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY, target_word TEXT NOT NULL, context_meaning TEXT NOT NULL,
        target_language TEXT NOT NULL, definition_language TEXT NOT NULL,
        status TEXT NOT NULL, is_favorite INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY, card_id TEXT NOT NULL, sentence TEXT NOT NULL, note TEXT,
        is_primary INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS card_tags (card_id TEXT NOT NULL, tag_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(card_id, tag_id));
      CREATE TABLE IF NOT EXISTS fsrs_states (
        id TEXT PRIMARY KEY, card_id TEXT NOT NULL UNIQUE, due_date TEXT NOT NULL,
        stability REAL, difficulty REAL, elapsed_days INTEGER NOT NULL, scheduled_days INTEGER NOT NULL,
        learning_steps INTEGER NOT NULL, reps INTEGER NOT NULL, lapses INTEGER NOT NULL,
        state INTEGER NOT NULL, last_reviewed_at TEXT, same_day_retry_at TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY, context_example_id TEXT NOT NULL, media_type TEXT NOT NULL,
        file_name TEXT NOT NULL, mime_type TEXT NOT NULL, file_size INTEGER NOT NULL,
        sha256 TEXT, offline_available INTEGER NOT NULL, local_path TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scheduler_profile (
        profile_id TEXT PRIMARY KEY, scheduler_version TEXT NOT NULL, parameters_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mobile_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1), default_target_language TEXT NOT NULL,
        default_definition_language TEXT NOT NULL, daily_review_limit INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS review_outbox (
        event_id TEXT PRIMARY KEY, card_id TEXT NOT NULL, device_sequence INTEGER NOT NULL UNIQUE,
        rating TEXT NOT NULL, reviewed_at TEXT NOT NULL, recorded_at TEXT NOT NULL,
        scheduler_version TEXT NOT NULL, parameter_version TEXT NOT NULL,
        due_date_before TEXT NOT NULL, due_date_after TEXT NOT NULL,
        state_before_json TEXT, state_after_json TEXT, uploaded INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_due ON fsrs_states (due_date);
      CREATE INDEX IF NOT EXISTS idx_mobile_outbox ON review_outbox (uploaded, device_sequence);
      INSERT OR IGNORE INTO mobile_schema_migrations (version, applied_at) VALUES (1, CURRENT_TIMESTAMP);
    `);
    const config = await this.db().query('SELECT id FROM mobile_config WHERE id = 1');
    if (!config.values?.length) {
      await this.db().run(
        `INSERT INTO mobile_config (id, device_id, device_name) VALUES (1, ?, ?)`,
        [crypto.randomUUID(), 'Android'],
      );
    }
  }

  async getConfig(): Promise<MobileConfig> {
    const result = await this.db().query('SELECT * FROM mobile_config WHERE id = 1');
    const row = result.values?.[0] as MobileConfig | undefined;
    if (!row) throw new Error('Mobile configuration is missing');
    return row;
  }

  async updateConnection(input: {
    serverId: string;
    credential?: string | null;
    transport?: MobileTransport;
    lanUrl?: string | null;
    lanSpkiSha256?: string | null;
    lanPublicKey?: string | null;
    lanServiceName?: string | null;
    tailscaleUrl?: string | null;
  }): Promise<void> {
    const current = await this.getConfig();
    await this.db().run(`
      UPDATE mobile_config SET server_id = ?, credential = ?, selected_transport = ?,
        lan_url = ?, lan_spki_sha256 = ?, lan_public_key = ?, lan_service_name = ?, tailscale_url = ? WHERE id = 1
    `, [
      input.serverId,
      input.credential === undefined ? current.credential : input.credential,
      input.transport ?? current.selected_transport,
      input.lanUrl === undefined ? current.lan_url : input.lanUrl,
      input.lanSpkiSha256 === undefined ? current.lan_spki_sha256 : input.lanSpkiSha256,
      input.lanPublicKey === undefined ? current.lan_public_key : input.lanPublicKey,
      input.lanServiceName === undefined ? current.lan_service_name : input.lanServiceName,
      input.tailscaleUrl === undefined ? current.tailscale_url : input.tailscaleUrl,
    ]);
  }

  async setTransport(transport: MobileTransport): Promise<void> {
    await this.db().run('UPDATE mobile_config SET selected_transport = ? WHERE id = 1', [transport]);
  }

  async setInterfaceLanguage(language: string): Promise<void> {
    await this.db().run('UPDATE mobile_config SET interface_language = ? WHERE id = 1', [language]);
  }

  async clearPairing(): Promise<void> {
    const db = this.db();
    await db.beginTransaction();
    try {
      await db.execute('DELETE FROM card_tags; DELETE FROM tags; DELETE FROM media; DELETE FROM contexts; DELETE FROM fsrs_states; DELETE FROM cards; DELETE FROM scheduler_profile; DELETE FROM mobile_settings; DELETE FROM review_outbox;', false);
      await db.run(`
        UPDATE mobile_config SET device_id = ?, server_id = NULL, credential = NULL, lan_url = NULL,
          lan_spki_sha256 = NULL, lan_public_key = NULL, lan_service_name = NULL, tailscale_url = NULL,
          snapshot_revision = 0, next_device_sequence = 1, last_sync_at = NULL WHERE id = 1
      `, [crypto.randomUUID()], false);
      await db.commitTransaction();
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  async applySnapshot(snapshot: SyncSnapshot): Promise<void> {
    const db = this.db();
    const config = await this.getConfig();
    if (snapshot.protocol_version !== 1) throw new Error('Snapshot protocol is incompatible');
    if (!Number.isInteger(snapshot.revision) || snapshot.revision < config.snapshot_revision) throw new Error('Snapshot revision is invalid');
    const existingMedia = await db.query('SELECT sha256, local_path FROM media WHERE local_path IS NOT NULL');
    const paths = new Map((existingMedia.values ?? []).map((row) => [row.sha256 as string, row.local_path as string]));
    await db.beginTransaction();
    try {
      await db.execute('DELETE FROM card_tags; DELETE FROM tags; DELETE FROM media; DELETE FROM contexts; DELETE FROM fsrs_states; DELETE FROM cards; DELETE FROM scheduler_profile; DELETE FROM mobile_settings;', false);
      for (const card of snapshot.cards) {
        await db.run(`INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          requiredString(card.id, 'card.id'), requiredString(card.target_word, 'card.target_word'),
          requiredString(card.context_meaning, 'card.context_meaning'), requiredString(card.target_language, 'card.target_language'),
          requiredString(card.definition_language, 'card.definition_language'), requiredString(card.status, 'card.status'),
          Number(card.is_favorite ?? 0), requiredString(card.created_at, 'card.created_at'), requiredString(card.updated_at, 'card.updated_at'),
        ], false);
      }
      for (const context of snapshot.contexts) {
        await db.run('INSERT INTO contexts VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
          requiredString(context.id, 'context.id'), requiredString(context.card_id, 'context.card_id'),
          requiredString(context.sentence, 'context.sentence'), typeof context.note === 'string' ? context.note : null,
          Number(context.is_primary ?? 0), Number(context.sort_order ?? 0),
          requiredString(context.created_at, 'context.created_at'), requiredString(context.updated_at, 'context.updated_at'),
        ], false);
      }
      for (const tag of snapshot.tags) await db.run('INSERT INTO tags VALUES (?, ?, ?, ?)', [tag.id, tag.name, tag.created_at, tag.updated_at], false);
      for (const relation of snapshot.card_tags) await db.run('INSERT INTO card_tags VALUES (?, ?, ?)', [relation.card_id, relation.tag_id, relation.created_at], false);
      for (const state of snapshot.fsrs_states) {
        await db.run('INSERT INTO fsrs_states VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          state.id, state.card_id, state.due_date, nullableNumber(state.stability), nullableNumber(state.difficulty),
          Number(state.elapsed_days ?? 0), Number(state.scheduled_days ?? 0), Number(state.learning_steps ?? 0),
          Number(state.reps ?? 0), Number(state.lapses ?? 0), Number(state.state ?? 0),
          state.last_reviewed_at ?? null, state.same_day_retry_at ?? null, state.created_at, state.updated_at,
        ], false);
      }
      for (const item of snapshot.media) {
        await db.run('INSERT INTO media VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          item.id, item.context_example_id, item.media_type, item.file_name, item.mime_type,
          item.file_size, item.sha256, item.offline_available ? 1 : 0,
          item.sha256 ? paths.get(item.sha256) ?? null : null, item.created_at,
        ], false);
      }
      const profile = snapshot.scheduler_profile;
      await db.run('INSERT INTO scheduler_profile VALUES (?, ?, ?, ?)', [profile.profile_id, profile.scheduler_version, profile.parameters_json, profile.created_at], false);
      await db.run('INSERT INTO mobile_settings VALUES (1, ?, ?, ?)', [snapshot.settings.default_target_language, snapshot.settings.default_definition_language, snapshot.settings.daily_review_limit], false);
      await db.run('UPDATE mobile_config SET snapshot_revision = ?, last_sync_at = ? WHERE id = 1', [snapshot.revision, new Date().toISOString()], false);
      await db.commitTransaction();
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  async pendingEvents(): Promise<SyncReviewEventInput[]> {
    const result = await this.db().query('SELECT * FROM review_outbox WHERE uploaded = 0 ORDER BY device_sequence LIMIT 500');
    return (result.values ?? []).map((row) => ({
      event_id: row.event_id as string,
      card_id: row.card_id as string,
      device_sequence: row.device_sequence as number,
      rating: row.rating as ReviewRating,
      reviewed_at: row.reviewed_at as string,
      recorded_at: row.recorded_at as string,
      scheduler_version: row.scheduler_version as string,
      parameter_version: row.parameter_version as string,
      due_date_before: row.due_date_before as string,
      due_date_after: row.due_date_after as string,
      state_before_json: row.state_before_json as string | null,
      state_after_json: row.state_after_json as string | null,
    }));
  }

  async markUploaded(acceptedThrough: number): Promise<void> {
    await this.db().run('UPDATE review_outbox SET uploaded = 1 WHERE device_sequence <= ?', [acceptedThrough]);
  }

  async nextDueCard(now = new Date()): Promise<MobileDueCard | null> {
    const nowIso = now.toISOString();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const result = await this.db().query(`
      SELECT c.*, fs.due_date,
        (SELECT sentence FROM contexts WHERE card_id = c.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS primary_sentence
      FROM cards c JOIN fsrs_states fs ON fs.card_id = c.id
      WHERE c.status = 'reviewing' AND (fs.due_date <= ? OR fs.same_day_retry_at >= ?)
      ORDER BY CASE WHEN fs.same_day_retry_at >= ? THEN 1 ELSE 0 END, fs.due_date, c.created_at, c.id LIMIT 1
    `, [nowIso, start.toISOString(), start.toISOString()]);
    const card = result.values?.[0] as Omit<MobileDueCard, 'media'> | undefined;
    if (!card) return null;
    const media = await this.db().query(`
      SELECT m.media_type, m.local_path, m.offline_available FROM media m
      JOIN contexts c ON c.id = m.context_example_id WHERE c.card_id = ? ORDER BY m.created_at
    `, [card.id]);
    return { ...card, media: (media.values ?? []) as MobileDueCard['media'] };
  }

  async submitReview(cardId: string, rating: ReviewRating, reviewedAt = new Date()): Promise<void> {
    const db = this.db();
    await db.beginTransaction();
    try {
      const query = await db.query('SELECT * FROM fsrs_states WHERE card_id = ?', [cardId]);
      const state = query.values?.[0] as Record<string, unknown> | undefined;
      if (!state) throw new Error('Card scheduling state is missing');
      const input: CardInput = {
        due: requiredString(state.due_date, 'due_date'),
        stability: nullableNumber(state.stability) ?? 0,
        difficulty: nullableNumber(state.difficulty) ?? 0,
        elapsed_days: Number(state.elapsed_days ?? 0), scheduled_days: Number(state.scheduled_days ?? 0),
        learning_steps: Number(state.learning_steps ?? 0), reps: Number(state.reps ?? 0),
        lapses: Number(state.lapses ?? 0), state: Number(state.state ?? 0),
        last_review: typeof state.last_reviewed_at === 'string' ? state.last_reviewed_at : null,
      };
      const scheduled = scheduleReview(input, reviewedAt, rating);
      const next = scheduled.card;
      const config = await this.getConfig();
      const reviewedAtIso = reviewedAt.toISOString();
      const dueAfter = next.due.toISOString();
      await db.run(`
        UPDATE fsrs_states SET due_date = ?, stability = ?, difficulty = ?, elapsed_days = ?,
          scheduled_days = ?, learning_steps = ?, reps = ?, lapses = ?, state = ?,
          last_reviewed_at = ?, same_day_retry_at = ?, updated_at = ? WHERE card_id = ?
      `, [dueAfter, next.stability, next.difficulty, next.elapsed_days, next.scheduled_days,
        next.learning_steps, next.reps, next.lapses, next.state, reviewedAtIso,
        scheduled.sameDayRetryAt, reviewedAtIso, cardId], false);
      await db.run(`
        INSERT INTO review_outbox VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [crypto.randomUUID(), cardId, config.next_device_sequence, rating, reviewedAtIso,
        reviewedAtIso, SCHEDULER_VERSION, SCHEDULER_PARAMETER_VERSION, state.due_date,
        dueAfter, JSON.stringify(state), JSON.stringify({ ...next, due: dueAfter })], false);
      await db.run('UPDATE mobile_config SET next_device_sequence = next_device_sequence + 1 WHERE id = 1', [], false);
      await db.commitTransaction();
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  async missingMedia(): Promise<Array<{ sha256: string }>> {
    const result = await this.db().query(`
      SELECT DISTINCT sha256 FROM media WHERE offline_available = 1 AND sha256 IS NOT NULL AND local_path IS NULL
    `);
    return (result.values ?? []) as Array<{ sha256: string }>;
  }

  async setMediaPath(sha256: string, localPath: string): Promise<void> {
    await this.db().run('UPDATE media SET local_path = ? WHERE sha256 = ?', [localPath, sha256]);
  }

  async mediaHashes(): Promise<string[]> {
    const result = await this.db().query('SELECT DISTINCT sha256 FROM media WHERE offline_available = 1 AND sha256 IS NOT NULL');
    return (result.values ?? []).map((row) => row.sha256 as string);
  }

  async markSyncCompleted(now = new Date()): Promise<void> {
    await this.db().run('UPDATE mobile_config SET last_sync_at = ? WHERE id = 1', [now.toISOString()]);
  }

  async progress(now = new Date()): Promise<MobileProgress> {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const reviewed = await this.db().query('SELECT COUNT(*) AS count FROM review_outbox WHERE reviewed_at >= ?', [start.toISOString()]);
    const pending = await this.db().query('SELECT COUNT(*) AS count FROM review_outbox WHERE uploaded = 0');
    const settings = await this.db().query('SELECT daily_review_limit FROM mobile_settings WHERE id = 1');
    return {
      reviewedToday: Number(reviewed.values?.[0]?.count ?? 0),
      pendingUpload: Number(pending.values?.[0]?.count ?? 0),
      dailyLimit: Number(settings.values?.[0]?.daily_review_limit ?? 0),
    };
  }
}
