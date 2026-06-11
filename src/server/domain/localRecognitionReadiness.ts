import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';

import type { SupportedLanguage } from '../../shared/constants.js';
import type { LocalRecognitionReadinessDto } from '../../shared/types.js';
import { resolveLocalRecognitionConfig, type LocalRecognitionConfig } from './localRecognitionConfig.js';

const execFileAsync = promisify(execFile);
const DEFAULT_READINESS_TIMEOUT_MS = 5_000;
const READINESS_TIMEOUT_ENV = 'CVN_LOCAL_READINESS_TIMEOUT_MS';

function resolveReadinessTimeoutMs(): number {
  const raw = process.env[READINESS_TIMEOUT_ENV];
  if (!raw) return DEFAULT_READINESS_TIMEOUT_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_READINESS_TIMEOUT_MS;

  return Math.round(parsed);
}

export type ReadinessExecFileRunner = (
  file: string,
  args: string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

export interface ReadinessFsAccess {
  access(path: string): Promise<void>;
}

export interface LocalRecognitionReadinessOptions {
  runner?: ReadinessExecFileRunner;
  fsAccess?: ReadinessFsAccess;
  resolveConfig?: (targetLanguage?: SupportedLanguage) => LocalRecognitionConfig;
}

const defaultRunner: ReadinessExecFileRunner = async (file, args, options) => {
  const result = await execFileAsync(file, args, { timeout: options.timeout });
  return { stdout: result.stdout, stderr: result.stderr };
};

const defaultFsAccess: ReadinessFsAccess = {
  access: (path) => fs.access(path, fsConstants.R_OK),
};

function commandErrorMessage(label: string, executablePath: string, error: unknown): string {
  const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
  return `${label} is not ready at ${executablePath}${detail}`;
}

async function checkCommand(label: string, executablePath: string, args: string[], runner: ReadinessExecFileRunner): Promise<{ ready: boolean; message: string }> {
  try {
    await runner(executablePath, args, { timeout: resolveReadinessTimeoutMs() });
    return { ready: true, message: `${label} is ready` };
  } catch (error) {
    return { ready: false, message: commandErrorMessage(label, executablePath, error) };
  }
}

export async function getLocalRecognitionReadiness(
  targetLanguage?: SupportedLanguage,
  options: LocalRecognitionReadinessOptions = {},
): Promise<LocalRecognitionReadinessDto> {
  const runner = options.runner ?? defaultRunner;
  const fsAccess = options.fsAccess ?? defaultFsAccess;
  const config = (options.resolveConfig ?? resolveLocalRecognitionConfig)(targetLanguage);

  const ffmpeg = await checkCommand('ffmpeg', 'ffmpeg', ['-version'], runner);

  let stt: LocalRecognitionReadinessDto['stt'];
  if (config.stt.provider === 'disabled') {
    stt = {
      provider: 'disabled',
      ready: false,
      executablePath: config.stt.executablePath,
      modelPath: config.stt.modelPath,
      message: 'Local STT is disabled',
    };
  } else if (!config.stt.modelPath) {
    stt = {
      provider: 'whisper.cpp',
      ready: false,
      executablePath: config.stt.executablePath,
      modelPath: config.stt.modelPath,
      message: 'whisper.cpp model path is not configured',
    };
  } else {
    const executable = await checkCommand('whisper.cpp', config.stt.executablePath, ['--help'], runner);
    if (!executable.ready) {
      stt = {
        provider: 'whisper.cpp',
        ready: false,
        executablePath: config.stt.executablePath,
        modelPath: config.stt.modelPath,
        message: executable.message,
      };
    } else {
      try {
        await fsAccess.access(config.stt.modelPath);
        stt = {
          provider: 'whisper.cpp',
          ready: true,
          executablePath: config.stt.executablePath,
          modelPath: config.stt.modelPath,
          message: 'whisper.cpp executable and model are ready',
        };
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
        stt = {
          provider: 'whisper.cpp',
          ready: false,
          executablePath: config.stt.executablePath,
          modelPath: config.stt.modelPath,
          message: `whisper.cpp model is not readable at ${config.stt.modelPath}${detail}`,
        };
      }
    }
  }

  let ocr: LocalRecognitionReadinessDto['ocr'];
  if (config.ocr.provider === 'disabled') {
    ocr = {
      provider: 'disabled',
      ready: false,
      executablePath: config.ocr.executablePath,
      language: config.ocr.language,
      message: 'Local OCR is disabled',
    };
  } else {
    const executable = await checkCommand('Tesseract OCR', config.ocr.executablePath, ['--version'], runner);
    ocr = {
      provider: 'tesseract',
      ready: executable.ready,
      executablePath: config.ocr.executablePath,
      language: config.ocr.language,
      message: executable.message,
    };
  }

  return { ffmpeg, stt, ocr };
}
