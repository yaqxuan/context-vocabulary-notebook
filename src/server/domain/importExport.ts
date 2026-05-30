import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import type { Database } from 'better-sqlite3';
import type {
  ExportJson,
  ExportType,
  ImportConflictDecision,
  ImportExecuteDecisionDto,
  ImportExecuteResponseDto,
  ImportScanResponseDto,
} from '../../shared/types.js';
import { resolveUploadPath } from '../storage/uploads.js';
import { BadRequestError } from '../http/errors.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MEDIA_TYPES } from '../../shared/constants.js';
import { MAX_IMPORT_CARDS } from '../../shared/validators.js';

const MAX_EXPORT_JSON_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_CONTEXTS = 20000;
const MAX_IMPORT_MEDIA_FILES = 20000;
const MAX_IMPORT_TAGS = 10000;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

interface PendingMediaWrite {
  storedPath: string;
  storedName: string;
  mediaBuffer: Buffer;
}

function assertSafeUploadEntry(fileName: string): void {
  if (!fileName || fileName.includes('\0') || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || path.basename(fileName) !== fileName) {
    throw new BadRequestError('Unsafe media file path');
  }

  if (!Object.prototype.hasOwnProperty.call(ALLOWED_EXTENSIONS, path.extname(fileName).toLowerCase())) {
    throw new BadRequestError('Unsupported media file extension');
  }
}

async function readExportJsonFromZip(buffer: Buffer): Promise<{ zip: JSZip; data: ExportJson }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new BadRequestError('Invalid zip file');
  }

  const exportFile = zip.file('export.json');
  if (!exportFile) throw new BadRequestError('export.json is required');

  let data: ExportJson;
  try {
    const jsonText = await exportFile.async('string');
    if (Buffer.byteLength(jsonText, 'utf8') > MAX_EXPORT_JSON_BYTES) {
      throw new BadRequestError('export.json exceeds size limit');
    }
    data = JSON.parse(jsonText) as ExportJson;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError('export.json must be valid JSON');
  }

  if (data.schema_version !== 1) throw new BadRequestError('Unsupported export schema_version');
  if (data.export_type !== 'marked' && data.export_type !== 'pure') throw new BadRequestError('Invalid export_type');
  if (!Array.isArray(data.cards) || !Array.isArray(data.contexts) || !Array.isArray(data.media_files) || !Array.isArray(data.tags) || !Array.isArray(data.card_tags)) {
    throw new BadRequestError('Invalid export.json shape');
  }
  if (data.cards.length > MAX_IMPORT_CARDS || data.contexts.length > MAX_IMPORT_CONTEXTS || data.media_files.length > MAX_IMPORT_MEDIA_FILES || data.tags.length > MAX_IMPORT_TAGS) {
    throw new BadRequestError('Import exceeds maximum record count');
  }

  validateExportJson(data);
  return { zip, data };
}

function validateExportJson(data: ExportJson): void {
  for (const card of data.cards) {
    requireIsoTimestamp(card.created_at);
    requireIsoTimestamp(card.updated_at);
  }

  for (const context of data.contexts) {
    requireIsoTimestamp(context.created_at);
    requireIsoTimestamp(context.updated_at);
  }

  for (const media of data.media_files) {
    assertSafeUploadEntry(media.file_name);
    requireIsoTimestamp(media.created_at);
    if (!MEDIA_TYPES.includes(media.media_type)) throw new BadRequestError('Invalid media_type');
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, media.mime_type)) throw new BadRequestError('Unsupported media mime_type');
  }

  for (const tag of data.tags) {
    requireIsoTimestamp(tag.created_at);
    requireIsoTimestamp(tag.updated_at);
  }

  for (const cardTag of data.card_tags) requireIsoTimestamp(cardTag.created_at);
  for (const fsrs of data.fsrs_states ?? []) {
    requireIsoTimestamp(fsrs.due_date);
    requireIsoTimestamp(fsrs.created_at);
    requireIsoTimestamp(fsrs.updated_at);
    if (fsrs.last_reviewed_at !== null) requireIsoTimestamp(fsrs.last_reviewed_at);
  }
  for (const log of data.review_logs ?? []) {
    requireIsoTimestamp(log.reviewed_at);
    requireIsoTimestamp(log.due_date_before);
    requireIsoTimestamp(log.due_date_after);
    requireIsoTimestamp(log.created_at);
  }
}

function requireIsoTimestamp(value: string): void {
  if (!ISO_TIMESTAMP_RE.test(value)) throw new BadRequestError('Invalid timestamp');
}

export async function buildExportZip(db: Database, uploadsDir: string, type: ExportType): Promise<Buffer> {
  const marked = type === 'marked';
  const cards = db.prepare(`
    SELECT id, target_word, context_meaning, target_language, definition_language,
           ${marked ? 'is_favorite, status,' : ''} created_at, updated_at
    FROM word_sense_cards
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC, id ASC
  `).all() as ExportJson['cards'];

  const contexts = db.prepare(`
    SELECT ce.id, ce.card_id, ce.sentence, ce.note, ce.is_primary, ce.sort_order, ce.created_at, ce.updated_at
    FROM context_examples ce
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY ce.card_id ASC, ce.sort_order ASC, ce.created_at ASC, ce.id ASC
  `).all() as ExportJson['contexts'];

  const mediaFiles = db.prepare(`
    SELECT mf.id, mf.context_example_id, mf.media_type, mf.file_name, mf.file_path, mf.mime_type,
           mf.file_size, mf.is_available, mf.created_at
    FROM media_files mf
    JOIN context_examples ce ON ce.id = mf.context_example_id
    JOIN word_sense_cards wsc ON wsc.id = ce.card_id
    WHERE mf.deleted_at IS NULL AND ce.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY mf.created_at ASC, mf.id ASC
  `).all() as ExportJson['media_files'];

  const tags = db.prepare(`
    SELECT DISTINCT t.id, t.name, t.created_at, t.updated_at
    FROM tags t
    JOIN card_tags ct ON ct.tag_id = t.id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE t.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY t.name ASC, t.id ASC
  `).all() as ExportJson['tags'];

  const cardTags = db.prepare(`
    SELECT ct.card_id, ct.tag_id, ct.created_at
    FROM card_tags ct
    JOIN tags t ON t.id = ct.tag_id
    JOIN word_sense_cards wsc ON wsc.id = ct.card_id
    WHERE t.deleted_at IS NULL AND wsc.deleted_at IS NULL
    ORDER BY ct.created_at ASC
  `).all() as ExportJson['card_tags'];

  const exportJson: ExportJson = {
    schema_version: 1,
    export_type: type,
    exported_at: new Date().toISOString(),
    cards,
    contexts,
    media_files: mediaFiles,
    tags,
    card_tags: cardTags,
  };

  if (marked) {
    exportJson.fsrs_states = db.prepare(`
      SELECT fs.id, fs.card_id, fs.due_date, fs.stability, fs.difficulty, fs.reps, fs.lapses,
             fs.state, fs.last_reviewed_at, fs.created_at, fs.updated_at
      FROM fsrs_states fs
      JOIN word_sense_cards wsc ON wsc.id = fs.card_id
      WHERE wsc.deleted_at IS NULL
      ORDER BY fs.created_at ASC, fs.id ASC
    `).all() as ExportJson['fsrs_states'];
    exportJson.review_logs = db.prepare(`
      SELECT rl.* FROM review_logs rl
      JOIN word_sense_cards wsc ON wsc.id = rl.card_id
      WHERE wsc.deleted_at IS NULL
      ORDER BY rl.reviewed_at ASC, rl.id ASC
    `).all() as ExportJson['review_logs'];
    exportJson.settings = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as ExportJson['settings'];
  }

  const zip = new JSZip();
  zip.file('export.json', JSON.stringify(exportJson, null, 2));
  const uploadFolder = zip.folder('uploads');

  for (const media of mediaFiles) {
    if (!media.is_available) continue;
    const safePath = resolveUploadPath(uploadsDir, media.file_name);
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      uploadFolder?.file(media.file_name, fs.readFileSync(safePath));
    }
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

export async function scanImportZip(db: Database, buffer: Buffer): Promise<ImportScanResponseDto> {
  const { zip, data } = await readExportJsonFromZip(buffer);
  const conflicts = data.cards.flatMap((card) => {
    const existing = findExistingCard(db, card.target_word, card.context_meaning);

    return existing ? [{
      import_card_id: card.id,
      existing_card_id: existing.id,
      target_word: card.target_word,
      context_meaning: card.context_meaning,
    }] : [];
  });

  const missing_media = data.media_files
    .filter((media) => media.is_available && !zip.file(`uploads/${media.file_name}`))
    .map((media) => media.file_name);

  return {
    schema_version: 1,
    export_type: data.export_type,
    counts: {
      cards: data.cards.length,
      contexts: data.contexts.length,
      media_files: data.media_files.length,
      tags: data.tags.length,
    },
    conflicts,
    missing_media,
  };
}

export async function executeImportZip(
  db: Database,
  uploadsDir: string,
  buffer: Buffer,
  decisions: ImportExecuteDecisionDto,
): Promise<ImportExecuteResponseDto> {
  const { zip, data } = await readExportJsonFromZip(buffer);
  const mediaBuffers = new Map<string, Buffer>();

  for (const media of data.media_files) {
    const entry = media.is_available ? zip.file(`uploads/${media.file_name}`) : null;
    if (entry) mediaBuffers.set(media.id, await entry.async('nodebuffer'));
  }

  const now = new Date().toISOString();
  const fsrsByCard = new Map((data.fsrs_states ?? []).map((state) => [state.card_id, state]));
  const pendingMediaWrites: PendingMediaWrite[] = [];
  const response: ImportExecuteResponseDto = {
    imported_cards: 0,
    imported_contexts: 0,
    imported_media_files: 0,
    skipped_cards: 0,
    merged_cards: 0,
    missing_media_files: 0,
  };

  const transaction = db.transaction(() => {
    const cardMap = new Map<string, string>();
    const contextMap = new Map<string, string>();
    const mergedCardIds = new Set<string>();

    for (const card of data.cards) {
      const existing = findExistingCard(db, card.target_word, card.context_meaning);
      const decision = decisionForCard(card.id, Boolean(existing), decisions);

      if (decision === 'skip') {
        response.skipped_cards += 1;
        continue;
      }

      if (decision === 'merge' && existing) {
        cardMap.set(card.id, existing.id);
        mergedCardIds.add(card.id);
        response.merged_cards += 1;
        continue;
      }

      const newCardId = randomUUID();
      cardMap.set(card.id, newCardId);
      db.prepare(`
        INSERT INTO word_sense_cards (id, target_word, context_meaning, target_language, definition_language, status, is_favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newCardId,
        card.target_word,
        card.context_meaning,
        card.target_language,
        card.definition_language,
        data.export_type === 'marked' ? (card.status ?? 'reviewing') : 'reviewing',
        data.export_type === 'marked' ? (card.is_favorite ?? 0) : 0,
        card.created_at,
        now,
      );
      response.imported_cards += 1;
    }

    const contextsByCard = new Map<string, ExportJson['contexts']>();
    for (const context of data.contexts) {
      const contexts = contextsByCard.get(context.card_id) ?? [];
      contexts.push(context);
      contextsByCard.set(context.card_id, contexts);
    }

    for (const [importCardId, contexts] of contextsByCard) {
      const localCardId = cardMap.get(importCardId);
      if (!localCardId) continue;

      for (const context of normalizeContexts(contexts)) {
        const newContextId = randomUUID();
        contextMap.set(context.id, newContextId);
        db.prepare(`
          INSERT INTO context_examples (id, card_id, sentence, note, is_primary, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newContextId, localCardId, context.sentence, context.note, context.is_primary, context.sort_order, context.created_at, now);
        response.imported_contexts += 1;
      }
    }

    const tagMap = new Map<string, string>();
    for (const tag of data.tags) {
      const existing = db.prepare('SELECT id FROM tags WHERE name = ? AND deleted_at IS NULL').get(tag.name) as { id: string } | undefined;
      if (existing) {
        tagMap.set(tag.id, existing.id);
      } else {
        const newTagId = randomUUID();
        tagMap.set(tag.id, newTagId);
        db.prepare('INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newTagId, tag.name, tag.created_at, now);
      }
    }

    for (const cardTag of data.card_tags) {
      const localCardId = cardMap.get(cardTag.card_id);
      const localTagId = tagMap.get(cardTag.tag_id);
      if (!localCardId || !localTagId) continue;
      db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id, created_at) VALUES (?, ?, ?)').run(localCardId, localTagId, now);
    }

    for (const media of data.media_files) {
      const localContextId = contextMap.get(media.context_example_id);
      if (!localContextId) continue;

      const mediaBuffer = mediaBuffers.get(media.id);
      const hasFile = Boolean(mediaBuffer);
      const storedName = hasFile ? `${randomUUID()}${path.extname(media.file_name).toLowerCase()}` : media.file_name;
      const storedPath = resolveUploadPath(uploadsDir, storedName);
      if (mediaBuffer) pendingMediaWrites.push({ storedPath, storedName, mediaBuffer });

      db.prepare(`
        INSERT INTO media_files (id, context_example_id, media_type, file_name, file_path, mime_type, file_size, is_available, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), localContextId, media.media_type, storedName, storedPath, media.mime_type, media.file_size, hasFile ? 1 : 0, media.created_at);
      response.imported_media_files += 1;
      if (!hasFile) response.missing_media_files += 1;
    }

    for (const card of data.cards) {
      const localCardId = cardMap.get(card.id);
      if (!localCardId || mergedCardIds.has(card.id)) continue;
      const fsrs = data.export_type === 'marked' ? fsrsByCard.get(card.id) : undefined;

      db.prepare(`
        INSERT INTO fsrs_states (id, card_id, due_date, stability, difficulty, reps, lapses, state, last_reviewed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        localCardId,
        fsrs?.due_date ?? now,
        fsrs?.stability ?? null,
        fsrs?.difficulty ?? null,
        fsrs?.reps ?? 0,
        fsrs?.lapses ?? 0,
        fsrs?.state ?? 0,
        fsrs?.last_reviewed_at ?? null,
        fsrs?.created_at ?? now,
        now,
      );
    }

    if (data.export_type === 'marked') {
      for (const log of data.review_logs ?? []) {
        const localCardId = cardMap.get(log.card_id);
        if (!localCardId || mergedCardIds.has(log.card_id)) continue;
        db.prepare(`
          INSERT INTO review_logs (id, card_id, rating, reviewed_at, due_date_before, due_date_after, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), localCardId, log.rating, log.reviewed_at, log.due_date_before, log.due_date_after, log.created_at);
      }

      if (data.settings) {
        db.prepare(`
          UPDATE user_settings
          SET interface_language = ?, default_target_language = ?, default_definition_language = ?, daily_review_limit = ?, updated_at = ?
          WHERE id = 1
        `).run(data.settings.interface_language, data.settings.default_target_language, data.settings.default_definition_language, data.settings.daily_review_limit, now);
      }
    }
  });

  transaction();
  writeImportedMedia(db, pendingMediaWrites);
  return response;
}

function writeImportedMedia(db: Database, writes: PendingMediaWrite[]): void {
  const written: string[] = [];
  try {
    for (const write of writes) {
      fs.writeFileSync(write.storedPath, write.mediaBuffer);
      written.push(write.storedPath);
    }
  } catch (error) {
    for (const filePath of written) fs.rmSync(filePath, { force: true });
    for (const write of writes) {
      db.prepare('UPDATE media_files SET is_available = 0 WHERE file_name = ?').run(write.storedName);
    }
    throw error;
  }
}

function findExistingCard(db: Database, targetWord: string, contextMeaning: string): { id: string } | undefined {
  return db.prepare(`
    SELECT id FROM word_sense_cards
    WHERE target_word = ? AND context_meaning = ? AND deleted_at IS NULL
    ORDER BY created_at ASC LIMIT 1
  `).get(targetWord, contextMeaning) as { id: string } | undefined;
}

function decisionForCard(cardId: string, hasConflict: boolean, decisions: ImportExecuteDecisionDto): ImportConflictDecision {
  if (!hasConflict) return 'import_as_new';
  if (decisions.mode === 'skip_all') return 'skip';
  if (decisions.mode === 'merge_all') return 'merge';
  if (decisions.mode === 'import_all_as_new') return 'import_as_new';
  return decisions.items.find((item) => item.import_card_id === cardId)?.decision ?? 'skip';
}

function normalizeContexts(contexts: ExportJson['contexts']): ExportJson['contexts'] {
  const sorted = [...contexts].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const primaryIndex = sorted.findIndex((context) => context.is_primary === 1);
  const fallbackPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return sorted.map((context, index) => ({
    ...context,
    sort_order: (index + 1) * 10,
    is_primary: index === fallbackPrimaryIndex ? 1 : 0,
  }));
}
