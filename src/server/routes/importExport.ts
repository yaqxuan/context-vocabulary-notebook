import { Router } from 'express';
import multer from 'multer';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { buildExportZip, scanImportZip } from '../domain/importExport.js';
import { isExportType } from '../../shared/validators.js';

export function importExportRouter(db: Database, uploadsDir: string): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage() });

  router.get('/export', asyncRoute(async (req, res) => {
    const type = req.query.type;
    if (!isExportType(type)) throw new BadRequestError('type must be marked or pure');
    const zip = await buildExportZip(db, uploadsDir, type);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="cvn-${type}-export.zip"`);
    res.send(zip);
  }));

  router.post('/import/scan', upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) throw new BadRequestError('file is required');
    const result = await scanImportZip(db, req.file.buffer);
    res.json(result);
  }));

  return router;
}
