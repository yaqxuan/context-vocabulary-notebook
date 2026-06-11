import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { ClipSentenceCandidateDto } from '../../shared/types.js';

const execFileAsync = promisify(execFile);

export type OcrExecFileRunner = (
  file: string,
  args: readonly string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

const defaultRunner: OcrExecFileRunner = async (file, args, options) => {
  const result = await execFileAsync(file, [...args], options);
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

function sentenceNone(message: string): ClipSentenceCandidateDto {
  return { source: 'subtitle_ocr', status: 'none', text: '', confidence: 'unknown', message };
}

function sentenceError(message: string): ClipSentenceCandidateDto {
  return { source: 'subtitle_ocr', status: 'error', text: '', confidence: 'unknown', message };
}

function normalizeOcrText(value: string): string {
  return value
    .replace(/[|_~`^]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function isPlausibleSubtitle(value: string): boolean {
  const compact = value.replace(/\s+/gu, '');
  if (compact.length < 3) return false;
  const lettersOrNumbers = compact.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return lettersOrNumbers >= Math.max(3, Math.ceil(compact.length * 0.5));
}

function sanitizeOcrErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const sanitized = raw.replace(/[\u0000-\u001F\u007F]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!sanitized) return 'unknown error';
  return sanitized.length > 200 ? `${sanitized.slice(0, 197)}...` : sanitized;
}

export interface TesseractSubtitleOcrOptions {
  executablePath: string;
  language: string;
  timeoutMs: number;
  runner?: OcrExecFileRunner;
}

export async function requestTesseractSubtitleOcr(
  framePaths: string[],
  options: TesseractSubtitleOcrOptions,
): Promise<ClipSentenceCandidateDto> {
  if (framePaths.length === 0) return sentenceNone('No subtitle frames extracted');

  const runner = options.runner ?? defaultRunner;
  const texts: string[] = [];
  let failures = 0;
  let lastFailureMessage = '';

  for (const framePath of framePaths) {
    try {
      const { stdout } = await runner(options.executablePath, [
        framePath,
        'stdout',
        '-l', options.language,
        '--psm', '6',
      ], { timeout: options.timeoutMs });
      const normalized = normalizeOcrText(stdout);
      if (isPlausibleSubtitle(normalized)) texts.push(normalized);
    } catch (error) {
      failures += 1;
      lastFailureMessage = sanitizeOcrErrorMessage(error);
    }
  }

  if (texts.length === 0) {
    if (failures === framePaths.length) {
      return sentenceError(`Subtitle OCR unavailable: ${lastFailureMessage || 'unknown error'}`);
    }
    return sentenceNone('No visible subtitle');
  }

  const counts = new Map<string, { text: string; count: number }>();
  for (const text of texts) {
    const key = text.toLocaleLowerCase();
    const current = counts.get(key) ?? { text, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  const repeated = [...counts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || b.text.length - a.text.length)[0];
  if (repeated) {
    return { source: 'subtitle_ocr', status: 'success', text: repeated.text, confidence: 'high' };
  }

  const longest = [...texts].sort((a, b) => b.length - a.length)[0];
  return { source: 'subtitle_ocr', status: 'success', text: longest, confidence: 'medium' };
}
