import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, ALLOWED_PAGE_SIZES, CARD_STATUSES, SUPPORTED_LANGUAGES } from './constants.js';
import type { MediaType, PageSize, CardStatus, SupportedLanguage } from './constants.js';
import path from 'node:path';

// --- Page size validation ---

export function isValidPageSize(value: unknown): value is PageSize {
  return ALLOWED_PAGE_SIZES.includes(value as PageSize);
}

export function parsePageSize(raw: unknown, fallback: PageSize = 20): PageSize {
  const n = Number(raw);
  if (isValidPageSize(n)) return n;
  return fallback;
}

export function parsePageNumber(raw: unknown, fallback = 1): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1) return n;
  return fallback;
}

// --- Card status validation ---

export function isValidCardStatus(value: unknown): value is CardStatus {
  return CARD_STATUSES.includes(value as CardStatus);
}

// --- Language validation ---

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

// --- Media validation ---

export function mediaTypeFromMime(mime: string): MediaType | null {
  return ALLOWED_MIME_TYPES[mime] ?? null;
}

export function mediaTypeFromExtension(filename: string): MediaType | null {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS[ext] ?? null;
}

export function isAllowedMediaFile(filename: string, mime: string): boolean {
  return mediaTypeFromMime(mime) !== null || mediaTypeFromExtension(filename) !== null;
}

// Determine the canonical media_type using MIME first, extension as fallback
export function resolveMediaType(filename: string, mime: string): MediaType | null {
  return mediaTypeFromMime(mime) ?? mediaTypeFromExtension(filename);
}

// --- String presence check ---

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isExportType(value: unknown): value is 'marked' | 'pure' {
  return value === 'marked' || value === 'pure';
}

export const MAX_IMPORT_CARDS = 5000;

export function isImportExecuteDecision(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const mode = (value as { mode?: unknown }).mode;
  if (mode === 'skip_all' || mode === 'merge_all' || mode === 'import_all_as_new') return true;
  if (mode !== 'per_item') return false;
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length > MAX_IMPORT_CARDS) return false;
  return items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as { import_card_id?: unknown; decision?: unknown };
    return typeof record.import_card_id === 'string'
      && (record.decision === 'skip' || record.decision === 'merge' || record.decision === 'import_as_new');
  });
}
