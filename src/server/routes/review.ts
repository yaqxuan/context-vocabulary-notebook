import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { REVIEW_RATINGS, SUPPORTED_LANGUAGES, type ReviewRating } from '../../shared/constants.js';
import { isNonEmptyString, isSupportedLanguage } from '../../shared/validators.js';
import { getContextsForCard } from '../domain/contexts.js';
import { getMediaForCard } from '../domain/media.js';
import { getDailyReviewProgress, getDueBubbleWords, getNextDueCard, submitReview } from '../domain/review.js';
import { getSettings } from '../domain/settings.js';
import { getCardTags } from '../domain/tags.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0]! : p;
}

function isReviewRating(value: unknown): value is ReviewRating {
  return typeof value === 'string' && (REVIEW_RATINGS as readonly string[]).includes(value);
}

function optionalSupportedLanguage(field: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!isNonEmptyString(raw)) throw new BadRequestError(`${field} must be a non-empty string`);
  const trimmed = raw.trim();
  if (!isSupportedLanguage(trimmed)) {
    throw new BadRequestError(`${field} must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  return trimmed;
}

function reviewTargetLanguage(db: Database, queryValue: unknown): string {
  return optionalSupportedLanguage('target_language', queryValue) ?? getSettings(db).default_target_language;
}

export function reviewRouter(db: Database): Router {
  const router = Router();

  router.get('/due', asyncRoute(async (req, res) => {
    const targetLanguage = reviewTargetLanguage(db, req.query.target_language);
    const scope = { target_language: targetLanguage };
    const card = getNextDueCard(db, scope);
    const progress = getDailyReviewProgress(db, new Date(), scope);

    if (!card) {
      res.json({ status: 'empty', message: '今天没有待复习内容', card: null, progress });
      return;
    }

    res.json({
      status: 'due',
      card: {
        ...card,
        contexts: getContextsForCard(db, card.id),
        media: getMediaForCard(db, card.id),
        tags: getCardTags(db, card.id),
      },
      progress,
    });
  }));

  router.get('/progress', asyncRoute(async (req, res) => {
    const targetLanguage = reviewTargetLanguage(db, req.query.target_language);
    res.json(getDailyReviewProgress(db, new Date(), { target_language: targetLanguage }));
  }));

  router.get('/due-bubbles', asyncRoute(async (req, res) => {
    const targetLanguage = reviewTargetLanguage(db, req.query.target_language);
    res.json(getDueBubbleWords(db, { target_language: targetLanguage }));
  }));

  router.post('/:cardId', asyncRoute(async (req, res) => {
    const cardId = paramStr(req.params.cardId);
    const body = req.body as Record<string, unknown>;

    if (!isReviewRating(body.rating)) {
      throw new BadRequestError('rating must be again or good');
    }

    const targetLanguage = optionalSupportedLanguage('target_language', body.target_language);
    const result = submitReview(db, cardId, body.rating, new Date(), { target_language: targetLanguage });
    if (!result) throw new NotFoundError(`Card not found: ${cardId}`);

    res.json(result);
  }));

  return router;
}
