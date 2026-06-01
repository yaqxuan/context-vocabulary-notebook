import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Database } from 'better-sqlite3';
import multer from 'multer';
import fs from 'node:fs';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, HttpError, NotFoundError } from '../http/errors.js';
import { createMedia, deleteMedia, getMedia } from '../domain/media.js';
import { getContext } from '../domain/contexts.js';
import { safeFileName, resolveUploadPath } from '../storage/uploads.js';
import { resolveMediaType, isNonEmptyString } from '../../shared/validators.js';
import { MEDIA_SIZE_LIMITS_BYTES, MEDIA_SIZE_LIMIT_MESSAGES } from '../../shared/constants.js';
import type { MediaType } from '../../shared/constants.js';

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0]! : p;
}

export interface MediaRouterOptions {
  maxFileSizeBytes?: number;
  mediaSizeLimitsBytes?: Partial<Record<MediaType, number>>;
}

const DEFAULT_MAX_FILE_SIZE_BYTES = MEDIA_SIZE_LIMITS_BYTES.video;

export function mediaRouter(db: Database, uploadsDir: string, options: MediaRouterOptions = {}): Router {
  const router = Router();
  const mediaSizeLimitsBytes = { ...MEDIA_SIZE_LIMITS_BYTES, ...options.mediaSizeLimitsBytes };

  // Multer storage: generate safe file names, store in uploadsDir
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      cb(null, safeFileName(file.originalname));
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!resolveMediaType(file.originalname, file.mimetype)) {
        cb(new BadRequestError('Unsupported file type'));
        return;
      }
      cb(null, true);
    },
  });

  // Wrapper that runs multer then our async handler; converts multer errors to JSON too
  function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const status = err instanceof HttpError ? err.status : 400;
        const message = err instanceof Error ? err.message : 'Upload error';
        res.status(status).json({ error: message });
        return;
      }
      next();
    });
  }

  // POST /api/media
  router.post('/', uploadMiddleware, asyncRoute(async (req, res) => {
    try {
      const contextExampleId = req.body.context_example_id as unknown;
      if (!isNonEmptyString(contextExampleId)) {
        throw new BadRequestError('context_example_id is required');
      }

      if (!req.file) {
        throw new BadRequestError('file is required');
      }

      // Validate MIME type and extension
      const mediaType = resolveMediaType(req.file.originalname, req.file.mimetype);
      if (!mediaType) {
        throw new BadRequestError('Unsupported file type');
      }

      if (req.file.size > mediaSizeLimitsBytes[mediaType]) {
        throw new BadRequestError(MEDIA_SIZE_LIMIT_MESSAGES[mediaType]);
      }

      const ctx = getContext(db, contextExampleId);
      if (!ctx) throw new NotFoundError(`Context not found: ${contextExampleId}`);

      const filePath = resolveUploadPath(uploadsDir, req.file.filename);

      const media = createMedia(db, {
        context_example_id: contextExampleId,
        media_type: mediaType,
        file_name: req.file.filename,
        file_path: filePath,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      });

      res.status(201).json(media);
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      throw error;
    }
  }));

  // DELETE /api/media/:id
  router.delete('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getMedia(db, id);
    if (!existing) throw new NotFoundError(`Media not found: ${id}`);
    deleteMedia(db, id);
    res.json({ ok: true });
  }));

  return router;
}
