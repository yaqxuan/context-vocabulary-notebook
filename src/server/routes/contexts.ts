import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';
import {
  createContext,
  deleteContext,
  getContext,
  moveContextDown,
  moveContextUp,
  setPrimaryContext,
  updateContext,
} from '../domain/contexts.js';
import { getCard } from '../domain/cards.js';
import { isNonEmptyString } from '../../shared/validators.js';

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0]! : p;
}

export function contextsRouter(db: Database): Router {
  const router = Router();

  // POST /api/cards/:id/contexts
  router.post('/cards/:id/contexts', asyncRoute(async (req, res) => {
    const cardId = paramStr(req.params.id);
    const card = getCard(db, cardId);
    if (!card) throw new NotFoundError(`Card not found: ${cardId}`);

    const body = req.body as Record<string, unknown>;
    if (!isNonEmptyString(body.sentence)) {
      throw new BadRequestError('sentence is required');
    }

    const ctx = createContext(db, {
      card_id: card.id,
      sentence: body.sentence,
      note: isNonEmptyString(body.note) ? body.note : undefined,
    });

    res.status(201).json(ctx);
  }));

  // PATCH /api/contexts/:id
  router.patch('/contexts/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getContext(db, id);
    if (!existing) throw new NotFoundError(`Context not found: ${id}`);

    const body = req.body as Record<string, unknown>;
    const updated = updateContext(db, id, {
      sentence: isNonEmptyString(body.sentence) ? body.sentence : undefined,
      note: typeof body.note === 'string' ? body.note : undefined,
    });

    res.json(updated);
  }));

  // POST /api/contexts/:id/primary
  router.post('/contexts/:id/primary', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getContext(db, id);
    if (!existing) throw new NotFoundError(`Context not found or deleted: ${id}`);

    try {
      setPrimaryContext(db, id);
    } catch {
      throw new NotFoundError(`Context not found or deleted: ${id}`);
    }

    res.json({ ok: true });
  }));

  // POST /api/contexts/:id/move-up
  router.post('/contexts/:id/move-up', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getContext(db, id);
    if (!existing) throw new NotFoundError(`Context not found: ${id}`);
    moveContextUp(db, id);
    res.json({ ok: true });
  }));

  // POST /api/contexts/:id/move-down
  router.post('/contexts/:id/move-down', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getContext(db, id);
    if (!existing) throw new NotFoundError(`Context not found: ${id}`);
    moveContextDown(db, id);
    res.json({ ok: true });
  }));

  // DELETE /api/contexts/:id
  router.delete('/contexts/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getContext(db, id);
    if (!existing) throw new NotFoundError(`Context not found: ${id}`);
    deleteContext(db, id);
    res.json({ ok: true });
  }));

  return router;
}
