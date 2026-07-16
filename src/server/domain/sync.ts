import fs from 'node:fs';
import { createHash } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { CardInput } from 'ts-fsrs';
import {
  MAX_SYNC_EVENT_BATCH,
  SYNC_PROTOCOL_VERSION,
  type SyncEventBatchResult,
  type SyncReviewEventInput,
  type SyncSnapshot,
} from '../../shared/sync.js';
import { SCHEDULER_PARAMETER_VERSION, SCHEDULER_VERSION, scheduleReview } from '../../shared/scheduler.js';
import { resolveUploadPath } from '../storage/uploads.js';

interface FsrsReplayState {
  id: string;
  card_id: string;
  due_date: string;
  stability: number | null;
  difficulty: number | null;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_reviewed_at: string | null;
  same_day_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StoredReviewEvent extends SyncReviewEventInput {
  device_id: string;
}

export class SyncSequenceGapError extends Error {
  constructor(public readonly expectedSequence: number) {
    super(`Expected device sequence ${expectedSequence}`);
    this.name = 'SyncSequenceGapError';
  }
}

export class SyncEventConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncEventConflictError';
  }
}

function currentRevision(db: Database): number {
  return (db.prepare('SELECT content_revision FROM sync_state WHERE id = 1').get() as { content_revision: number }).content_revision;
}

function validateEvents(events: SyncReviewEventInput[]): void {
  if (events.length > MAX_SYNC_EVENT_BATCH) throw new SyncEventConflictError(`A batch may contain at most ${MAX_SYNC_EVENT_BATCH} events`);
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (!event.event_id || !event.card_id || !Number.isSafeInteger(event.device_sequence) || event.device_sequence < 1) {
      throw new SyncEventConflictError('Invalid event identity or sequence');
    }
    if (event.rating !== 'again' && event.rating !== 'good') throw new SyncEventConflictError('Invalid review rating');
    if (!Number.isFinite(Date.parse(event.reviewed_at)) || !Number.isFinite(Date.parse(event.recorded_at))) {
      throw new SyncEventConflictError('Invalid review timestamp');
    }
    if (!Number.isFinite(Date.parse(event.due_date_before)) || !Number.isFinite(Date.parse(event.due_date_after))) {
      throw new SyncEventConflictError('Invalid review due date');
    }
    if (event.scheduler_version !== SCHEDULER_VERSION || event.parameter_version !== SCHEDULER_PARAMETER_VERSION) {
      throw new SyncEventConflictError('Unsupported scheduler or parameter version');
    }
    if (index > 0 && event.device_sequence !== events[index - 1]!.device_sequence + 1) {
      throw new SyncEventConflictError('Event batch must contain contiguous device sequences');
    }
  }
}

function orderedEvents(events: StoredReviewEvent[]): StoredReviewEvent[] {
  const streams = new Map<string, StoredReviewEvent[]>();
  for (const event of events) {
    const stream = streams.get(event.device_id) ?? [];
    stream.push(event);
    streams.set(event.device_id, stream);
  }
  for (const stream of streams.values()) stream.sort((a, b) => a.device_sequence - b.device_sequence);
  const positions = new Map([...streams.keys()].map((deviceId) => [deviceId, 0]));
  const result: StoredReviewEvent[] = [];
  while (result.length < events.length) {
    const heads = [...streams.entries()].flatMap(([deviceId, stream]) => {
      const event = stream[positions.get(deviceId) ?? 0];
      return event ? [event] : [];
    });
    heads.sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at) || a.event_id.localeCompare(b.event_id));
    const next = heads[0];
    if (!next) break;
    result.push(next);
    positions.set(next.device_id, (positions.get(next.device_id) ?? 0) + 1);
  }
  return result;
}

export function replayCanonicalCard(db: Database, cardId: string, replayEpoch = 1): FsrsReplayState {
  const checkpoint = db.prepare(`
    SELECT state_json FROM sync_card_checkpoints WHERE card_id = ? AND replay_epoch = ?
  `).get(cardId, replayEpoch) as { state_json: string } | undefined;
  if (!checkpoint) throw new SyncEventConflictError(`Missing replay checkpoint for card ${cardId}`);
  let state = JSON.parse(checkpoint.state_json) as FsrsReplayState;
  const events = orderedEvents(db.prepare(`
    SELECT event_id, card_id, device_id, device_sequence, rating, reviewed_at, recorded_at,
           scheduler_version, parameter_version, due_date_before, due_date_after,
           state_before_json, state_after_json
    FROM review_events
    WHERE card_id = ? AND replay_epoch = ?
  `).all(cardId, replayEpoch) as StoredReviewEvent[]);

  for (const event of events) {
    const input: CardInput = {
      due: state.due_date,
      stability: state.stability ?? 0,
      difficulty: state.difficulty ?? 0,
      elapsed_days: state.elapsed_days,
      scheduled_days: state.scheduled_days,
      learning_steps: state.learning_steps,
      reps: state.reps,
      lapses: state.lapses,
      state: state.state,
      last_review: state.last_reviewed_at,
    };
    const scheduled = scheduleReview(input, new Date(event.reviewed_at), event.rating);
    const next = scheduled.card;
    state = {
      ...state,
      due_date: next.due.toISOString(),
      stability: next.stability,
      difficulty: next.difficulty,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      learning_steps: next.learning_steps,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      last_reviewed_at: event.reviewed_at,
      same_day_retry_at: scheduled.sameDayRetryAt,
      updated_at: new Date().toISOString(),
    };
  }

  db.prepare(`
    UPDATE fsrs_states
    SET due_date = ?, stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
        learning_steps = ?, reps = ?, lapses = ?, state = ?, last_reviewed_at = ?,
        same_day_retry_at = ?, updated_at = ?
    WHERE card_id = ?
  `).run(
    state.due_date, state.stability, state.difficulty, state.elapsed_days, state.scheduled_days,
    state.learning_steps, state.reps, state.lapses, state.state, state.last_reviewed_at,
    state.same_day_retry_at, state.updated_at, cardId,
  );
  return state;
}

export function applyReviewEventBatch(
  db: Database,
  deviceId: string,
  events: SyncReviewEventInput[],
  receivedAt = new Date(),
): SyncEventBatchResult {
  validateEvents(events);
  return db.transaction(() => {
    const now = receivedAt.toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO sync_device_cursors
        (device_id, accepted_event_sequence, acknowledged_revision, updated_at)
      VALUES (?, 0, 0, ?)
    `).run(deviceId, now);
    const cursor = db.prepare(`
      SELECT accepted_event_sequence FROM sync_device_cursors WHERE device_id = ?
    `).get(deviceId) as { accepted_event_sequence: number };
    if (events.length === 0) {
      return { accepted_through: cursor.accepted_event_sequence, canonical_revision: currentRevision(db), affected_card_ids: [] };
    }

    if (events[0]!.device_sequence <= cursor.accepted_event_sequence) {
      const duplicate = events.every((event) => {
        const row = db.prepare('SELECT id FROM review_logs WHERE device_id = ? AND device_sequence = ?').get(deviceId, event.device_sequence) as { id: string } | undefined;
        return row?.id === event.event_id;
      });
      if (duplicate && events.at(-1)!.device_sequence <= cursor.accepted_event_sequence) {
        return { accepted_through: cursor.accepted_event_sequence, canonical_revision: currentRevision(db), affected_card_ids: [] };
      }
      throw new SyncEventConflictError('Device sequence was already used by a different event');
    }

    const expected = cursor.accepted_event_sequence + 1;
    if (events[0]!.device_sequence !== expected) throw new SyncSequenceGapError(expected);
    const affected = new Set<string>();
    for (const event of events) {
      const card = db.prepare('SELECT id FROM word_sense_cards WHERE id = ?').get(event.card_id);
      if (!card) throw new SyncEventConflictError(`Unknown card ${event.card_id}`);
      if (db.prepare('SELECT id FROM review_logs WHERE id = ?').get(event.event_id)) {
        throw new SyncEventConflictError(`Event id ${event.event_id} already exists`);
      }
      db.prepare(`
        INSERT INTO review_logs (
          id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at,
          device_id, device_sequence, recorded_at, received_at, scheduler_version,
          parameter_version, state_before_json, state_after_json, replay_epoch
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        event.event_id, event.card_id, event.rating, event.reviewed_at, event.due_date_before,
        event.due_date_after, event.recorded_at, deviceId, event.device_sequence,
        event.recorded_at, now, event.scheduler_version, event.parameter_version,
        event.state_before_json, event.state_after_json,
      );
      affected.add(event.card_id);
    }
    for (const cardId of affected) replayCanonicalCard(db, cardId);
    const acceptedThrough = events.at(-1)!.device_sequence;
    db.prepare(`
      UPDATE sync_device_cursors
      SET accepted_event_sequence = ?, updated_at = ?
      WHERE device_id = ?
    `).run(acceptedThrough, now, deviceId);
    return { accepted_through: acceptedThrough, canonical_revision: currentRevision(db), affected_card_ids: [...affected].sort() };
  })();
}

export function acknowledgeSnapshot(db: Database, deviceId: string, revision: number): void {
  const revisionNow = currentRevision(db);
  if (!Number.isSafeInteger(revision) || revision < 0 || revision > revisionNow) {
    throw new SyncEventConflictError('Invalid snapshot revision acknowledgement');
  }
  const result = db.prepare(`
    UPDATE sync_device_cursors
    SET acknowledged_revision = MAX(acknowledged_revision, ?), updated_at = ?
    WHERE device_id = ?
  `).run(revision, new Date().toISOString(), deviceId);
  if (result.changes === 0) throw new SyncEventConflictError(`Unknown sync device ${deviceId}`);
}

function ensureMediaHashes(db: Database, uploadsDir: string): void {
  const rows = db.prepare(`
    SELECT id, file_name FROM media_files
    WHERE deleted_at IS NULL AND is_available = 1 AND media_type IN ('image', 'audio') AND sha256 IS NULL
  `).all() as Array<{ id: string; file_name: string }>;
  const update = db.prepare('UPDATE media_files SET sha256 = ?, is_available = ? WHERE id = ?');
  for (const row of rows) {
    const filePath = resolveUploadPath(uploadsDir, row.file_name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      update.run(null, 0, row.id);
      continue;
    }
    update.run(createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'), 1, row.id);
  }
}

export function buildSyncSnapshot(db: Database, uploadsDir: string, knownRevision?: number): SyncSnapshot | null {
  db.transaction(() => ensureMediaHashes(db, uploadsDir))();
  const revision = currentRevision(db);
  if (knownRevision === revision) return null;
  const cards = db.prepare('SELECT * FROM word_sense_cards WHERE deleted_at IS NULL ORDER BY id').all() as Array<Record<string, unknown>>;
  const contexts = db.prepare(`
    SELECT ce.* FROM context_examples ce JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE ce.deleted_at IS NULL AND wsc.deleted_at IS NULL ORDER BY ce.id
  `).all() as Array<Record<string, unknown>>;
  const tags = db.prepare('SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY id').all() as Array<Record<string, unknown>>;
  const cardTags = db.prepare(`
    SELECT ct.* FROM card_tags ct
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    JOIN tags t ON t.id = ct.tag_id
    WHERE wsc.deleted_at IS NULL AND t.deleted_at IS NULL
    ORDER BY ct.card_id, ct.tag_id
  `).all() as Array<Record<string, unknown>>;
  const fsrsStates = db.prepare(`
    SELECT fs.* FROM fsrs_states fs JOIN word_sense_cards wsc ON wsc.id = fs.card_id
    WHERE wsc.deleted_at IS NULL ORDER BY fs.card_id
  `).all() as Array<Record<string, unknown>>;
  const media = db.prepare(`
    SELECT mf.id, mf.context_example_id, mf.media_type, mf.file_name, mf.mime_type,
           mf.file_size, mf.sha256, mf.created_at
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE mf.deleted_at IS NULL AND ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY mf.id
  `).all().map((row) => {
    const item = row as Omit<SyncSnapshot['media'][number], 'offline_available'>;
    return { ...item, offline_available: item.media_type !== 'video' && Boolean(item.sha256) };
  });
  const settings = db.prepare(`
    SELECT default_target_language, default_definition_language, daily_review_limit
    FROM user_settings WHERE id = 1
  `).get() as SyncSnapshot['settings'];
  const schedulerProfile = db.prepare(`
    SELECT profile_id, scheduler_version, parameters_json, created_at
    FROM scheduler_profiles WHERE is_active = 1
  `).get() as Record<string, unknown>;
  return {
    protocol_version: SYNC_PROTOCOL_VERSION,
    revision,
    generated_at: new Date().toISOString(),
    cards,
    contexts,
    tags,
    card_tags: cardTags,
    fsrs_states: fsrsStates,
    scheduler_profile: schedulerProfile,
    settings,
    media,
  };
}
