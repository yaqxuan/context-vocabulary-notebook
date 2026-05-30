import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import type { Database } from 'better-sqlite3';
import type { ExportJson, ExportType } from '../../shared/types.js';
import { resolveUploadPath } from '../storage/uploads.js';

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
      SELECT fs.* FROM fsrs_states fs
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
