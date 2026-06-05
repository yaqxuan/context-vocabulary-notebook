import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { SUPPORTED_LANGUAGES } from '../../shared/constants.js';
import { isSupportedLanguage } from '../../shared/validators.js';
import { getSettings, updateSettings, type UpdateSettingsInput } from '../domain/settings.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError } from '../http/errors.js';

function optionalLanguage(field: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestError(`${field} must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (!isSupportedLanguage(trimmed)) {
    throw new BadRequestError(`${field} must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  return trimmed;
}

export function settingsRouter(db: Database): Router {
  const router = Router();

  router.get('/', asyncRoute(async (_req, res) => {
    res.json(getSettings(db));
  }));

  router.patch('/', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const input: UpdateSettingsInput = {
      interface_language: optionalLanguage('interface_language', body.interface_language),
      default_target_language: optionalLanguage('default_target_language', body.default_target_language),
      default_definition_language: optionalLanguage('default_definition_language', body.default_definition_language),
    };

    if (body.daily_review_limit !== undefined) {
      const dailyReviewLimit = body.daily_review_limit;
      if (typeof dailyReviewLimit !== 'number' || !Number.isInteger(dailyReviewLimit) || dailyReviewLimit <= 0) {
        throw new BadRequestError('daily_review_limit must be a positive integer');
      }
      input.daily_review_limit = dailyReviewLimit;
    }

    res.json(updateSettings(db, input));
  }));

  return router;
}
