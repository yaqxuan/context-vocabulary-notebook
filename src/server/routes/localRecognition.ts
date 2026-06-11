import { Router } from 'express';

import { SUPPORTED_LANGUAGES } from '../../shared/constants.js';
import { isNonEmptyString, isSupportedLanguage } from '../../shared/validators.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';
import { getLocalRecognitionReadiness } from '../domain/localRecognitionReadiness.js';
import type { LocalRecognitionReadinessOptions } from '../domain/localRecognitionReadiness.js';

export function localRecognitionRouter(options: LocalRecognitionReadinessOptions = {}): Router {
  const router = Router();

  router.get('/readiness', asyncRoute(async (req, res) => {
    const rawTargetLanguage = req.query.target_language;
    const targetLanguage = isNonEmptyString(rawTargetLanguage) ? rawTargetLanguage.trim() : undefined;
    if (targetLanguage !== undefined && !isSupportedLanguage(targetLanguage)) {
      throw new BadRequestError(`target_language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
    }

    const result = await getLocalRecognitionReadiness(targetLanguage, options);
    res.json(result);
  }));

  return router;
}
