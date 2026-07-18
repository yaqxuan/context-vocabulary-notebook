import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { CardInput } from 'ts-fsrs';
import {
  MAX_SYNC_CARD_ACTION_BATCH,
  MAX_SYNC_EVENT_BATCH,
  SYNC_PROTOCOL_VERSION,
  type SyncCardActionBatchResult,
  type SyncCardActionInput,
  type SyncEventBatchResult,
  type SyncReviewEventInput,
  type SyncSnapshot,
} from '../../shared/sync.js';
import {
  LEGACY_SCHEDULER_PARAMETER_VERSIONS,
  SCHEDULER_PARAMETER_VERSION,
  SCHEDULER_VERSION,
  scheduleReview,
} from '../../shared/scheduler.js';
import { resolveLocalRecognitionConfig } from './localRecognitionConfig.js';
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

function validateCardActions(actions: SyncCardActionInput[]): void {
  if (actions.length > MAX_SYNC_CARD_ACTION_BATCH) {
    throw new SyncEventConflictError(`A batch may contain at most ${MAX_SYNC_CARD_ACTION_BATCH} card actions`);
  }
  for (let index = 0; index < actions.length; index += 1) {
    const item = actions[index]!;
    if (!item.action_id || !item.card_id || !Number.isSafeInteger(item.action_sequence) || item.action_sequence < 1) {
      throw new SyncEventConflictError('Invalid card action identity or sequence');
    }
    if (!Number.isFinite(Date.parse(item.recorded_at))) throw new SyncEventConflictError('Invalid card action timestamp');
    if (item.action !== 'set_favorite' && item.action !== 'mark_mastered') {
      throw new SyncEventConflictError('Unsupported card action');
    }
    if (typeof item.value !== 'boolean' || (item.action === 'mark_mastered' && item.value !== true)) {
      throw new SyncEventConflictError('Invalid card action value');
    }
    if (index > 0 && item.action_sequence !== actions[index - 1]!.action_sequence + 1) {
      throw new SyncEventConflictError('Card action batch must contain contiguous sequences');
    }
  }
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
    if (
      event.scheduler_version !== SCHEDULER_VERSION
      || (
        event.parameter_version !== SCHEDULER_PARAMETER_VERSION
        && !LEGACY_SCHEDULER_PARAMETER_VERSIONS.includes(
          event.parameter_version as (typeof LEGACY_SCHEDULER_PARAMETER_VERSIONS)[number],
        )
      )
    ) {
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

export function applyCardActionBatch(
  db: Database,
  deviceId: string,
  actions: SyncCardActionInput[],
  receivedAt = new Date(),
): SyncCardActionBatchResult {
  validateCardActions(actions);
  return db.transaction(() => {
    const now = receivedAt.toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO sync_device_cursors
        (device_id, accepted_event_sequence, accepted_card_action_sequence, acknowledged_revision, updated_at)
      VALUES (?, 0, 0, 0, ?)
    `).run(deviceId, now);
    const cursor = db.prepare(`
      SELECT accepted_card_action_sequence FROM sync_device_cursors WHERE device_id = ?
    `).get(deviceId) as { accepted_card_action_sequence: number };
    if (actions.length === 0) {
      return {
        accepted_through: cursor.accepted_card_action_sequence,
        canonical_revision: currentRevision(db),
        affected_card_ids: [],
        ignored_deleted_card_ids: [],
      };
    }

    if (actions[0]!.action_sequence <= cursor.accepted_card_action_sequence) {
      const duplicate = actions.every((item) => {
        const row = db.prepare(`
          SELECT action_id FROM sync_card_action_events
          WHERE device_id = ? AND action_sequence = ?
        `).get(deviceId, item.action_sequence) as { action_id: string } | undefined;
        return row?.action_id === item.action_id;
      });
      if (duplicate && actions.at(-1)!.action_sequence <= cursor.accepted_card_action_sequence) {
        return {
          accepted_through: cursor.accepted_card_action_sequence,
          canonical_revision: currentRevision(db),
          affected_card_ids: [],
          ignored_deleted_card_ids: [],
        };
      }
      throw new SyncEventConflictError('Card action sequence was already used by a different action');
    }

    const expected = cursor.accepted_card_action_sequence + 1;
    if (actions[0]!.action_sequence !== expected) throw new SyncSequenceGapError(expected);
    const affected = new Set<string>();
    const ignoredDeleted = new Set<string>();
    for (const item of actions) {
      if (db.prepare('SELECT action_id FROM sync_card_action_events WHERE action_id = ?').get(item.action_id)) {
        throw new SyncEventConflictError(`Card action id ${item.action_id} already exists`);
      }
      const card = db.prepare(`
        SELECT id FROM word_sense_cards WHERE id = ? AND deleted_at IS NULL
      `).get(item.card_id) as { id: string } | undefined;
      const outcome = card ? 'applied' : 'ignored_deleted';
      db.prepare(`
        INSERT INTO sync_card_action_events (
          action_id, card_id, device_id, action_sequence, action, value_json,
          recorded_at, received_at, outcome
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.action_id,
        item.card_id,
        deviceId,
        item.action_sequence,
        item.action,
        JSON.stringify(item.value),
        item.recorded_at,
        now,
        outcome,
      );
      if (!card) {
        ignoredDeleted.add(item.card_id);
        continue;
      }
      if (item.action === 'set_favorite') {
        db.prepare(`
          UPDATE word_sense_cards SET is_favorite = ?, updated_at = ? WHERE id = ?
        `).run(item.value ? 1 : 0, now, item.card_id);
      } else {
        db.prepare(`
          UPDATE word_sense_cards SET status = 'mastered', updated_at = ? WHERE id = ?
        `).run(now, item.card_id);
      }
      affected.add(item.card_id);
    }
    const acceptedThrough = actions.at(-1)!.action_sequence;
    db.prepare(`
      UPDATE sync_device_cursors
      SET accepted_card_action_sequence = ?, updated_at = ?
      WHERE device_id = ?
    `).run(acceptedThrough, now, deviceId);
    return {
      accepted_through: acceptedThrough,
      canonical_revision: currentRevision(db),
      affected_card_ids: [...affected].sort(),
      ignored_deleted_card_ids: [...ignoredDeleted].sort(),
    };
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

function ensureMediaHashes(db: Database, uploadsDir: string): boolean {
  const rows = db.prepare(`
    SELECT id, file_name, sha256 FROM media_files
    WHERE deleted_at IS NULL AND is_available = 1 AND media_type IN ('image', 'audio', 'video')
  `).all() as Array<{ id: string; file_name: string; sha256: string | null }>;
  const update = db.prepare('UPDATE media_files SET sha256 = ?, is_available = ? WHERE id = ?');
  let changed = false;
  for (const row of rows) {
    const filePath = resolveUploadPath(uploadsDir, row.file_name);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      update.run(null, 0, row.id);
      changed = true;
      continue;
    }
    if (!row.sha256) {
      update.run(createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'), 1, row.id);
      changed = true;
    }
  }
  return changed;
}

const DERIVED_AUDIO_DIR = '.cvn-sync-audio';
const failedDerivedAudioSources = new Set<string>();

export interface SyncAudioExtractionOptions {
  extractAudio?: (sourcePath: string, outputPath: string) => void;
}

function defaultExtractAudio(sourcePath: string, outputPath: string): void {
  const ffmpeg = resolveLocalRecognitionConfig().ffmpeg.executablePath;
  execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
    '-map', '0:a:0', '-vn', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outputPath,
  ], { timeout: 120_000, stdio: ['ignore', 'ignore', 'ignore'] });
}

function ensureDerivedAudio(
  db: Database,
  uploadsDir: string,
  options: SyncAudioExtractionOptions = {},
): { items: SyncSnapshot['media']; created: boolean } {
  const videos = db.prepare(`
    SELECT mf.id, mf.context_example_id, mf.file_name, mf.created_at
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE mf.media_type = 'video' AND mf.is_available = 1
      AND mf.deleted_at IS NULL AND ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM media_files audio
        WHERE audio.context_example_id = mf.context_example_id AND audio.media_type = 'audio'
          AND audio.is_available = 1 AND audio.deleted_at IS NULL
      )
    ORDER BY mf.id
  `).all() as Array<{ id: string; context_example_id: string; file_name: string; created_at: string }>;
  if (!videos.length) return { items: [], created: false };

  const cacheDir = path.join(uploadsDir, DERIVED_AUDIO_DIR);
  fs.mkdirSync(cacheDir, { recursive: true });
  const extractor = options.extractAudio ?? defaultExtractAudio;
  const items: SyncSnapshot['media'] = [];
  let created = false;

  for (const video of videos) {
    const sourcePath = resolveUploadPath(uploadsDir, video.file_name);
    try {
      const sourceStat = fs.statSync(sourcePath);
      if (!sourceStat.isFile()) continue;
      const sourceKey = createHash('sha256').update(video.id).digest('hex').slice(0, 24);
      const prefix = `${sourceKey}-${sourceStat.size}-${Math.trunc(sourceStat.mtimeMs)}-`;
      if (failedDerivedAudioSources.has(prefix)) continue;
      let fileName = fs.readdirSync(cacheDir).find((name) => (
        name.startsWith(prefix) && /^[a-f0-9]{24}-\d+-\d+-[a-f0-9]{64}\.m4a$/u.test(name)
      ));
      if (!fileName) {
        const tempPath = path.join(cacheDir, `.tmp-${randomUUID()}.m4a`);
        try {
          extractor(sourcePath, tempPath);
          const output = fs.readFileSync(tempPath);
          if (!output.length) continue;
          const sha256 = createHash('sha256').update(output).digest('hex');
          fileName = `${prefix}${sha256}.m4a`;
          const finalPath = path.join(cacheDir, fileName);
          if (!fs.existsSync(finalPath)) fs.renameSync(tempPath, finalPath);
          else fs.rmSync(tempPath, { force: true });
          failedDerivedAudioSources.delete(prefix);
          created = true;
        } finally {
          if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
        }
      }
      const hashMatch = fileName.match(/-([a-f0-9]{64})\.m4a$/u);
      if (!hashMatch) continue;
      const relativeName = path.join(DERIVED_AUDIO_DIR, fileName);
      const audioPath = resolveUploadPath(uploadsDir, relativeName);
      items.push({
        id: `derived-audio-${video.id}`,
        context_example_id: video.context_example_id,
        media_type: 'audio',
        file_name: relativeName,
        mime_type: 'audio/mp4',
        file_size: fs.statSync(audioPath).size,
        sha256: hashMatch[1]!,
        offline_available: true,
        created_at: video.created_at,
      });
    } catch {
      // A video without an audio stream or an unavailable ffmpeg binary should not
      // prevent text snapshots from syncing. The UI keeps the video-only notice.
      try {
        const sourceStat = fs.statSync(sourcePath);
        const sourceKey = createHash('sha256').update(video.id).digest('hex').slice(0, 24);
        failedDerivedAudioSources.add(`${sourceKey}-${sourceStat.size}-${Math.trunc(sourceStat.mtimeMs)}-`);
      } catch { /* missing sources are already excluded from the snapshot */ }
    }
  }
  return { items, created };
}

export function resolveDerivedAudioPath(uploadsDir: string, sha256: string): string | null {
  const cacheDir = path.join(uploadsDir, DERIVED_AUDIO_DIR);
  if (!fs.existsSync(cacheDir)) return null;
  const suffix = `-${sha256}.m4a`;
  const fileName = fs.readdirSync(cacheDir).find((name) => name.endsWith(suffix));
  return fileName ? path.join(cacheDir, fileName) : null;
}

export function buildSyncSnapshot(
  db: Database,
  uploadsDir: string,
  knownRevision?: number,
  audioOptions: SyncAudioExtractionOptions = {},
): SyncSnapshot | null {
  const mediaHashesChanged = db.transaction(() => ensureMediaHashes(db, uploadsDir))();
  const derivedAudio = ensureDerivedAudio(db, uploadsDir, audioOptions);
  if (mediaHashesChanged || derivedAudio.created) {
    db.prepare('UPDATE sync_state SET content_revision = content_revision + 1 WHERE id = 1').run();
  }
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
           mf.file_size, mf.sha256, mf.is_available, mf.created_at
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE mf.deleted_at IS NULL AND ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY mf.id
  `).all().map((row) => {
    const item = row as Omit<SyncSnapshot['media'][number], 'offline_available'> & { is_available: number };
    const { is_available: isAvailable, ...manifestItem } = item;
    return { ...manifestItem, offline_available: Boolean(isAvailable && item.sha256) };
  }).concat(derivedAudio.items);
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
