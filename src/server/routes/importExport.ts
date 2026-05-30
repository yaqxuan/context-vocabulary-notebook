import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { buildExportZip } from '../domain/importExport.js';
import { isExportType } from '../../shared/validators.js';

export function importExportRouter(db: Database, uploadsDir: string): Router {
  const router = Router();

  router.get('/export', asyncRoute(async (req, res) => {
    const type = req.query.type;
    if (!isExportType(type)) throw new BadRequestError('type must be marked or pure');
    const zip = await buildExportZip(db, uploadsDir, type);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="cvn-${type}-export.zip"`);
    res.send(zip);
  }));

  return router;
}
