import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, ConflictError, NotFoundError } from '../http/errors.js';
import {
  createTag,
  deleteTag,
  getTag,
  listTags,
  updateTag,
} from '../domain/tags.js';
import { listCards } from '../domain/cards.js';
import {
  isNonEmptyString,
  isValidCardStatus,
  isValidPageSize,
  parsePageNumber,
  parsePageSize,
} from '../../shared/validators.js';
import { DEFAULT_PAGE_SIZE } from '../../shared/constants.js';

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0]! : p;
}

export function tagsRouter(db: Database): Router {
  const router = Router();

  // GET /api/tags
  router.get('/', asyncRoute(async (_req, res) => {
    const tags = listTags(db);
    res.json(tags);
  }));

  // POST /api/tags
  router.post('/', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (!isNonEmptyString(body.name)) {
      throw new BadRequestError('name is required');
    }
    try {
      const tag = createTag(db, { name: body.name });
      res.status(201).json(tag);
    } catch {
      // SQLite unique constraint violation
      throw new ConflictError(`Tag name already exists: ${body.name as string}`);
    }
  }));

  // PATCH /api/tags/:id
  router.patch('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const body = req.body as Record<string, unknown>;
    if (!isNonEmptyString(body.name)) {
      throw new BadRequestError('name is required');
    }

    const existing = getTag(db, id);
    if (!existing) throw new NotFoundError(`Tag not found: ${id}`);

    try {
      const updated = updateTag(db, id, { name: body.name });
      res.json(updated);
    } catch {
      throw new ConflictError(`Tag name already exists: ${body.name as string}`);
    }
  }));

  // DELETE /api/tags/:id
  router.delete('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getTag(db, id);
    if (!existing) throw new NotFoundError(`Tag not found: ${id}`);
    deleteTag(db, id);
    res.json({ ok: true });
  }));

  // GET /api/tags/:id/cards
  router.get('/:id/cards', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getTag(db, id);
    if (!existing) throw new NotFoundError(`Tag not found: ${id}`);

    const rawSize = req.query.page_size;
    if (rawSize !== undefined && !isValidPageSize(Number(rawSize))) {
      throw new BadRequestError('page_size must be 20, 50, or 100');
    }

    const rawSearch = req.query.search;
    const rawStatus = req.query.status;
    const rawFavorite = req.query.favorite;
    const favorite = typeof rawFavorite === 'string' ? rawFavorite : undefined;

    const result = listCards(db, {
      tag_id: id,
      search: typeof rawSearch === 'string' ? rawSearch : undefined,
      status: typeof rawStatus === 'string' && isValidCardStatus(rawStatus) ? rawStatus : undefined,
      is_favorite: favorite === 'true' ? true : favorite === 'false' ? false : undefined,
      page: parsePageNumber(req.query.page),
      pageSize: parsePageSize(rawSize, DEFAULT_PAGE_SIZE),
    });

    res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    });
  }));

  return router;
}
