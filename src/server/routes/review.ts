import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { REVIEW_RATINGS, type ReviewRating } from '../../shared/constants.js';
import { getContextsForCard } from '../domain/contexts.js';
import { getMediaForCard } from '../domain/media.js';
import { getDailyReviewProgress, getNextDueCard, submitReview } from '../domain/review.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0]! : p;
}

function isReviewRating(value: unknown): value is ReviewRating {
  return typeof value === 'string' && (REVIEW_RATINGS as readonly string[]).includes(value);
}

export function reviewRouter(db: Database): Router {
  const router = Router();

  router.get('/due', asyncRoute(async (_req, res) => {
    const card = getNextDueCard(db);
    const progress = getDailyReviewProgress(db);

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
      },
      progress,
    });
  }));

  router.get('/progress', asyncRoute(async (_req, res) => {
    res.json(getDailyReviewProgress(db));
  }));

  router.post('/:cardId', asyncRoute(async (req, res) => {
    const cardId = paramStr(req.params.cardId);
    const body = req.body as Record<string, unknown>;

    if (!isReviewRating(body.rating)) {
      throw new BadRequestError('rating must be again or good');
    }

    const result = submitReview(db, cardId, body.rating);
    if (!result) throw new NotFoundError(`Card not found: ${cardId}`);

    res.json(result);
  }));

  return router;
}
