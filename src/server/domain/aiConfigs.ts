import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { AiConfigDto, CreateAiConfigBody, PatchAiConfigBody } from '../../shared/types.js';

export interface AiConfigRow {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function toDto(row: AiConfigRow): AiConfigDto {
  return {
    id: row.id,
    name: row.name,
    base_url: row.base_url,
    model: row.model,
    is_active: row.is_active,
    has_api_key: row.api_key.length > 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function deactivateAll(db: Database): void {
  db.prepare('UPDATE ai_configs SET is_active = 0 WHERE deleted_at IS NULL').run();
}

export function listAiConfigs(db: Database): AiConfigDto[] {
  const rows = db.prepare(`
    SELECT * FROM ai_configs
    WHERE deleted_at IS NULL
    ORDER BY is_active DESC, updated_at DESC, created_at ASC, id ASC
  `).all() as AiConfigRow[];

  return rows.map(toDto);
}

export function getAiConfig(db: Database, id: string): AiConfigRow | undefined {
  return db.prepare('SELECT * FROM ai_configs WHERE id = ? AND deleted_at IS NULL').get(id) as AiConfigRow | undefined;
}

export function getActiveAiConfigWithKey(db: Database): AiConfigRow | undefined {
  return db.prepare(`
    SELECT * FROM ai_configs
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY updated_at DESC, created_at ASC, id ASC
    LIMIT 1
  `).get() as AiConfigRow | undefined;
}

export function createAiConfig(db: Database, input: CreateAiConfigBody): AiConfigDto {
  const id = randomUUID();
  const now = new Date().toISOString();

  const create = db.transaction(() => {
    if (input.is_active) deactivateAll(db);

    db.prepare(`
      INSERT INTO ai_configs (id, name, base_url, api_key, model, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name.trim(),
      normalizeBaseUrl(input.base_url),
      input.api_key.trim(),
      input.model.trim(),
      input.is_active ? 1 : 0,
      now,
      now,
    );
  });

  create();
  return toDto(getAiConfig(db, id)!);
}

export function updateAiConfig(db: Database, id: string, input: PatchAiConfigBody): AiConfigDto | undefined {
  const current = getAiConfig(db, id);
  if (!current) return undefined;

  const now = new Date().toISOString();
  const update = db.transaction(() => {
    if (input.is_active === true) deactivateAll(db);

    db.prepare(`
      UPDATE ai_configs
      SET name = ?, base_url = ?, api_key = ?, model = ?, is_active = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      input.name === undefined ? current.name : input.name.trim(),
      input.base_url === undefined ? current.base_url : normalizeBaseUrl(input.base_url),
      input.api_key === undefined ? current.api_key : input.api_key.trim(),
      input.model === undefined ? current.model : input.model.trim(),
      input.is_active === undefined ? current.is_active : input.is_active ? 1 : 0,
      now,
      id,
    );
  });

  update();
  return toDto(getAiConfig(db, id)!);
}

export function setActiveAiConfig(db: Database, id: string): AiConfigDto | undefined {
  const current = getAiConfig(db, id);
  if (!current) return undefined;

  const now = new Date().toISOString();
  const activate = db.transaction(() => {
    deactivateAll(db);
    db.prepare('UPDATE ai_configs SET is_active = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, id);
  });

  activate();
  return toDto(getAiConfig(db, id)!);
}

export function deleteAiConfig(db: Database, id: string): boolean {
  const current = getAiConfig(db, id);
  if (!current) return false;

  const now = new Date().toISOString();
  db.prepare('UPDATE ai_configs SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(
    now,
    now,
    id,
  );
  return true;
}
