import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * Generate a safe, unique storage file name from the original name.
 * Strips path separators, traversal sequences, and non-ASCII characters;
 * prepends a UUID so names are unique and cannot be guessed.
 */
export function safeFileName(originalName: string): string {
  // Take only the basename (no directory components)
  const base = path.basename(originalName);
  // Keep extension, sanitize it
  const ext = path.extname(base).toLowerCase().replace(/[^a-z0-9.]/g, '');
  // UUID prefix guarantees uniqueness and no collisions
  return `${randomUUID()}${ext}`;
}

/**
 * Resolve the absolute path for a stored file inside uploadsDir.
 * Throws if the resolved path escapes uploadsDir (path traversal guard).
 */
export function resolveUploadPath(uploadsDir: string, fileName: string): string {
  const resolved = path.resolve(uploadsDir, fileName);
  if (!resolved.startsWith(path.resolve(uploadsDir) + path.sep) &&
      resolved !== path.resolve(uploadsDir)) {
    throw new Error(`Path traversal attempt detected: ${fileName}`);
  }
  return resolved;
}

/**
 * Check whether a stored file actually exists on disk.
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure the uploads directory exists, creating it if needed.
 */
export function ensureUploadsDir(uploadsDir: string): void {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
