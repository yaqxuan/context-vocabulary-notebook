import { Router } from 'express';
import multer from 'multer';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { buildExportZip, executeImportZip, scanImportZip } from '../domain/importExport.js';
import { isExportType, isImportExecuteDecision } from '../../shared/validators.js';
import type { ImportExecuteDecisionDto } from '../../shared/types.js';
import { getLanguageIso6391Code, normalizeSupportedLanguage } from '../../shared/constants.js';

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
    const requestedLanguage = req.query.language;
    const normalizedLanguage = requestedLanguage === undefined ? null : normalizeSupportedLanguage(requestedLanguage);
    if (requestedLanguage !== undefined && !normalizedLanguage) throw new BadRequestError('language must be supported');
    const language = normalizedLanguage ?? undefined;
    const zip = await buildExportZip(db, uploadsDir, type, language);
    res.setHeader('Content-Type', 'application/zip');
    const suffix = language ? `-${getLanguageIso6391Code(language)}` : '';
    res.setHeader('Content-Disposition', `attachment; filename="cvn-${type}${suffix}-export.zip"`);
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
    let languages: string[] | undefined;
    if (req.body.languages !== undefined) {
      if (typeof req.body.languages !== 'string') throw new BadRequestError('languages must be valid JSON');
      try {
        const parsed = JSON.parse(req.body.languages) as unknown;
        if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((value) => typeof value !== 'string' || !value.trim())) {
          throw new BadRequestError('languages must be a non-empty string array');
        }
        languages = [...new Set(parsed.map((value) => value.trim()))];
      } catch (error) {
        if (error instanceof BadRequestError) throw error;
        throw new BadRequestError('languages must be valid JSON');
      }
    }
    const result = await executeImportZip(db, uploadsDir, req.file.buffer, decisions as ImportExecuteDecisionDto, languages);
    res.json(result);
  }));

  return router;
}
