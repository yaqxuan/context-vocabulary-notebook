import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Database } from 'better-sqlite3';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LANGUAGES, TRANSCRIPTION_MESSAGES, TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES } from '../../shared/constants.js';
import { isNonEmptyString, isSupportedLanguage, resolveMediaType } from '../../shared/validators.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, HttpError } from '../http/errors.js';
import { getActiveAiConfigWithKey } from '../domain/aiConfigs.js';
import { analyzeClip } from '../domain/clipAnalysis.js';
import type { AnalyzeClipOptions } from '../domain/clipAnalysis.js';
import { safeFileName } from '../storage/uploads.js';

export interface ClipAnalysisRouterOptions {
  maxFileSizeBytes?: number;
  analyze?: (options: AnalyzeClipOptions) => ReturnType<typeof analyzeClip>;
}

function removeIfExists(filePath: string | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Best-effort cleanup only.
  }
}

function removeDirIfExists(dirPath: string | undefined): void {
  if (!dirPath) return;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only.
  }
}

function createAudioOutputPath(uploadsDir: string): string {
  return path.join(uploadsDir, safeFileName('clip-analysis-audio.wav'));
}

function createFrameDir(uploadsDir: string): string {
  return path.join(uploadsDir, safeFileName('clip-analysis-frames'));
}

function parseOptionalLanguage(value: unknown, field: 'target_language' | 'definition_language') {
  if (!isNonEmptyString(value)) return undefined;
  const language = value.trim();
  if (!isSupportedLanguage(language)) {
    throw new BadRequestError(`${field} must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  return language;
}

export function clipAnalysisRouter(db: Database, uploadsDir: string, options: ClipAnalysisRouterOptions = {}): Router {
  const router = Router();
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
  });

  const upload = multer({
    storage,
    limits: { fileSize: options.maxFileSizeBytes ?? TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES },
    fileFilter: (_req, file, cb) => {
      const mediaType = resolveMediaType(file.originalname, file.mimetype);
      if (mediaType !== 'video') {
        cb(new BadRequestError('Unsupported file type'));
        return;
      }
      cb(null, true);
    },
  });

  function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const status = err instanceof HttpError ? err.status : 400;
        const message = err instanceof Error && err.message === 'File too large'
          ? TRANSCRIPTION_MESSAGES.sizeLimit
          : err instanceof Error ? err.message : 'Upload error';
        res.status(status).json({ error: message });
        return;
      }
      next();
    });
  }

  router.post('/', uploadMiddleware, asyncRoute(async (req, res) => {
    let extractedAudioPath: string | undefined;
    let frameDir: string | undefined;
    try {
      if (!req.file) throw new BadRequestError('file is required');

      const mediaType = resolveMediaType(req.file.originalname, req.file.mimetype);
      if (mediaType !== 'video') throw new BadRequestError('Unsupported file type');
      if (req.file.size > (options.maxFileSizeBytes ?? TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES)) {
        throw new BadRequestError(TRANSCRIPTION_MESSAGES.sizeLimit);
      }

      const targetLanguage = parseOptionalLanguage(req.body.target_language, 'target_language');
      const definitionLanguage = parseOptionalLanguage(req.body.definition_language, 'definition_language');
      extractedAudioPath = createAudioOutputPath(uploadsDir);
      frameDir = createFrameDir(uploadsDir);

      const analyzer = options.analyze ?? analyzeClip;
      const result = await analyzer({
        config: getActiveAiConfigWithKey(db),
        inputPath: req.file.path,
        audioPath: extractedAudioPath,
        frameDir,
        languages: {
          target_language: targetLanguage,
          definition_language: definitionLanguage,
        },
      });
      res.json(result);
    } finally {
      removeIfExists(req.file?.path);
      removeIfExists(extractedAudioPath);
      removeDirIfExists(frameDir);
    }
  }));

  return router;
}
