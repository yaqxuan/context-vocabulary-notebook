import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Database } from 'better-sqlite3';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';

import { TRANSCRIPTION_MESSAGES, TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES } from '../../shared/constants.js';
import { isNonEmptyString, resolveMediaType } from '../../shared/validators.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, HttpError } from '../http/errors.js';
import { getActiveAiConfigWithKey } from '../domain/aiConfigs.js';
import { safeFileName } from '../storage/uploads.js';
import { transcribeMedia } from '../domain/transcriptions.js';
import type { AudioExtractor, SpeechToTextProvider } from '../domain/transcriptions.js';

export interface TranscriptionsRouterOptions {
  maxFileSizeBytes?: number;
  extractor?: AudioExtractor;
  stt?: SpeechToTextProvider;
}

function removeIfExists(filePath: string | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Best-effort cleanup only.
  }
}

function createAudioOutputPath(uploadsDir: string): string {
  return path.join(uploadsDir, safeFileName('transcription-audio.mp3'));
}

export function transcriptionsRouter(db: Database, uploadsDir: string, options: TranscriptionsRouterOptions = {}): Router {
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
      if (mediaType !== 'video' && mediaType !== 'audio') {
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
    try {
      if (!req.file) throw new BadRequestError('file is required');

      const mediaType = resolveMediaType(req.file.originalname, req.file.mimetype);
      if (mediaType !== 'video' && mediaType !== 'audio') throw new BadRequestError('Unsupported file type');
      if (req.file.size > (options.maxFileSizeBytes ?? TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES)) {
        throw new BadRequestError(TRANSCRIPTION_MESSAGES.sizeLimit);
      }

      extractedAudioPath = createAudioOutputPath(uploadsDir);
      const language = isNonEmptyString(req.body.target_language) ? req.body.target_language.trim() : undefined;

      const result = await transcribeMedia({
        config: getActiveAiConfigWithKey(db),
        inputPath: req.file.path,
        audioPath: extractedAudioPath,
        language,
        responseFormat: 'verbose_json',
        extractor: options.extractor,
        stt: options.stt,
      });
      res.json(result);
    } finally {
      removeIfExists(req.file?.path);
      removeIfExists(extractedAudioPath);
    }
  }));

  return router;
}
