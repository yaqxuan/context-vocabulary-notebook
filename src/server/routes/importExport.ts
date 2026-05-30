import { Router } from 'express';
import multer from 'multer';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { buildExportZip, executeImportZip, scanImportZip } from '../domain/importExport.js';
import { isExportType, isImportExecuteDecision } from '../../shared/validators.js';
import type { ImportExecuteDecisionDto } from '../../shared/types.js';

const MAX_IMPORT_ZIP_BYTES = 1024 * 1024 * 1024;

export function importExportRouter(db: Database, uploadsDir: string): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMPORT_ZIP_BYTES },
    fileFilter: (_req, file, callback) => {
      callback(null, file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip'));
    },
  });

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

  router.post('/import/execute', upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) throw new BadRequestError('file is required');
    if (typeof req.body.decisions !== 'string') throw new BadRequestError('decisions is required');

    let decisions: unknown;
    try {
      decisions = JSON.parse(req.body.decisions);
    } catch {
      throw new BadRequestError('decisions must be valid JSON');
    }

    if (!isImportExecuteDecision(decisions)) throw new BadRequestError('Invalid import decisions');
    const result = await executeImportZip(db, uploadsDir, req.file.buffer, decisions as ImportExecuteDecisionDto);
    res.json(result);
  }));

  return router;
}
