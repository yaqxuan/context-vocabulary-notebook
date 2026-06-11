import { describe, expect, it, vi } from 'vitest';

import {
  requestTesseractSubtitleOcr,
  type OcrExecFileRunner,
} from '../../src/server/domain/localOcr.js';

describe('local Tesseract subtitle OCR', () => {
  it('returns none when no frames are provided', async () => {
    const runner = vi.fn(async () => ({ stdout: 'ignored', stderr: '' })) satisfies OcrExecFileRunner;

    await expect(requestTesseractSubtitleOcr([], {
      executablePath: 'tesseract',
      language: 'eng',
      timeoutMs: 1000,
      runner,
    })).resolves.toEqual({
      source: 'subtitle_ocr',
      status: 'none',
      text: '',
      confidence: 'unknown',
      message: 'No subtitle frames extracted',
    });
    expect(runner).not.toHaveBeenCalled();
  });

  it('runs tesseract for each frame and chooses repeated normalized text with high confidence', async () => {
    const runner = vi.fn(async (_file, args) => {
      const framePath = args[0];
      return {
        stdout: framePath === '/tmp/f2.jpg' ? '  Hello   world.\n' : 'Hello world.\n',
        stderr: '',
      };
    }) satisfies OcrExecFileRunner;

    await expect(requestTesseractSubtitleOcr(['/tmp/f1.jpg', '/tmp/f2.jpg', '/tmp/f3.jpg'], {
      executablePath: '/bin/tesseract',
      language: 'eng',
      timeoutMs: 3000,
      runner,
    })).resolves.toEqual({
      source: 'subtitle_ocr',
      status: 'success',
      text: 'Hello world.',
      confidence: 'high',
    });

    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner).toHaveBeenCalledWith('/bin/tesseract', ['/tmp/f1.jpg', 'stdout', '-l', 'eng', '--psm', '6'], { timeout: 3000 });
  });

  it('chooses longest plausible text with medium confidence when nothing repeats', async () => {
    const outputs = ['Hi', 'Short text', 'A much longer subtitle line.'];
    const runner = vi.fn(async () => ({ stdout: outputs.shift() ?? '', stderr: '' })) satisfies OcrExecFileRunner;

    await expect(requestTesseractSubtitleOcr(['/tmp/f1.jpg', '/tmp/f2.jpg', '/tmp/f3.jpg'], {
      executablePath: 'tesseract',
      language: 'eng',
      timeoutMs: 1000,
      runner,
    })).resolves.toEqual({
      source: 'subtitle_ocr',
      status: 'success',
      text: 'A much longer subtitle line.',
      confidence: 'medium',
    });
  });

  it('continues after partial command failures and reports error when all commands fail', async () => {
    const partialRunner = vi.fn(async (_file, args) => {
      if (args[0] === '/tmp/f1.jpg') throw new Error('fail');
      return { stdout: 'Visible subtitle.', stderr: '' };
    }) satisfies OcrExecFileRunner;

    await expect(requestTesseractSubtitleOcr(['/tmp/f1.jpg', '/tmp/f2.jpg'], {
      executablePath: 'tesseract',
      language: 'eng',
      timeoutMs: 1000,
      runner: partialRunner,
    })).resolves.toEqual({
      source: 'subtitle_ocr',
      status: 'success',
      text: 'Visible subtitle.',
      confidence: 'medium',
    });

    const noisyError = `missing language data\n${'x'.repeat(500)}`;
    const failingRunner = vi.fn(async () => { throw new Error(noisyError); }) satisfies OcrExecFileRunner;
    const result = await requestTesseractSubtitleOcr(['/tmp/f1.jpg', '/tmp/f2.jpg'], {
      executablePath: 'tesseract',
      language: 'eng',
      timeoutMs: 1000,
      runner: failingRunner,
    });

    expect(result).toMatchObject({
      source: 'subtitle_ocr',
      status: 'error',
      text: '',
      confidence: 'unknown',
    });
    expect(result.message).toMatch(/^Subtitle OCR unavailable: /u);
    expect(result.message).toContain('missing language data');
    expect(result.message).not.toContain('\n');
    expect(result.message?.length).toBeLessThanOrEqual('Subtitle OCR unavailable: '.length + 200);
  });
});
