import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { asyncRoute } from '../http/asyncRoute.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';
import {
  createCard,
  deleteCard,
  getCard,
  getCardSuggestions,
  listCards,
  updateCard,
} from '../domain/cards.js';
import { createContext, getContextsForCard } from '../domain/contexts.js';
import { addTagToCard, getCardTags, getTag } from '../domain/tags.js';
import { getMediaForCard } from '../domain/media.js';
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

export function cardsRouter(db: Database): Router {
  const router = Router();

  // GET /api/cards/suggestions?target_word=...
  // Must be registered before /:id to avoid "suggestions" being treated as an id
  router.get('/suggestions', asyncRoute(async (req, res) => {
    const tw = req.query.target_word;
    const target_word = Array.isArray(tw) ? tw[0] : tw;
    if (!isNonEmptyString(target_word)) {
      throw new BadRequestError('target_word query parameter is required');
    }
    const suggestions = getCardSuggestions(db, target_word);
    res.json(suggestions.map(c => ({
      id: c.id,
      target_word: c.target_word,
      context_meaning: c.context_meaning,
    })));
  }));

  // GET /api/cards
  router.get('/', asyncRoute(async (req, res) => {
    const rawSize = req.query.page_size;
    if (rawSize !== undefined && !isValidPageSize(Number(rawSize))) {
      throw new BadRequestError('page_size must be 20, 50, or 100');
    }
    const pageSize = parsePageSize(rawSize, DEFAULT_PAGE_SIZE);
    const page = parsePageNumber(req.query.page);

    const rawSearch = req.query.search;
    const search = typeof rawSearch === 'string' ? rawSearch : undefined;
    const rawStatus = req.query.status;
    const status = typeof rawStatus === 'string' ? rawStatus : undefined;
    const rawFavorite = req.query.favorite;
    const favorite = typeof rawFavorite === 'string' ? rawFavorite : undefined;
    const rawTagId = req.query.tag_id;
    const tagId = typeof rawTagId === 'string' ? rawTagId : undefined;

    const result = listCards(db, {
      search,
      status: isValidCardStatus(status) ? status : undefined,
      is_favorite: favorite === 'true' ? true : favorite === 'false' ? false : undefined,
      tag_id: tagId,
      page,
      pageSize,
    });

    res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    });
  }));

  // POST /api/cards
  router.post('/', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;

    // Append-to-existing mode: card_id provided
    if (isNonEmptyString(body.card_id)) {
      const existing = getCard(db, body.card_id);
      if (!existing) throw new NotFoundError(`Card not found: ${body.card_id}`);
      if (!isNonEmptyString(body.sentence)) {
        throw new BadRequestError('sentence is required');
      }
      const ctx = createContext(db, {
        card_id: existing.id,
        sentence: body.sentence,
        note: isNonEmptyString(body.note) ? body.note : undefined,
      });
      res.status(201).json({ card: existing, context: ctx });
      return;
    }

    // New card mode
    if (!isNonEmptyString(body.target_word)) {
      throw new BadRequestError('target_word is required');
    }
    if (!isNonEmptyString(body.context_meaning)) {
      throw new BadRequestError('context_meaning is required');
    }
    if (!isNonEmptyString(body.sentence)) {
      throw new BadRequestError('sentence is required');
    }

    const card = createCard(db, {
      target_word: body.target_word,
      context_meaning: body.context_meaning,
      target_language: isNonEmptyString(body.target_language) ? body.target_language : '英语',
      definition_language: isNonEmptyString(body.definition_language) ? body.definition_language : '中文',
    });

    const ctx = createContext(db, {
      card_id: card.id,
      sentence: body.sentence,
      note: isNonEmptyString(body.note) ? body.note : undefined,
    });

    // Optionally attach tags
    if (Array.isArray(body.tag_ids)) {
      for (const tagId of body.tag_ids) {
        if (typeof tagId === 'string') {
          try {
            addTagToCard(db, card.id, tagId);
          } catch {
            // Ignore duplicate / missing tag silently at create time
          }
        }
      }
    }

    res.status(201).json({ card, context: ctx });
  }));

  // GET /api/cards/:id
  router.get('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const card = getCard(db, id);
    if (!card) throw new NotFoundError(`Card not found: ${id}`);

    const contexts = getContextsForCard(db, card.id);
    const media = getMediaForCard(db, card.id);
    const tags = getCardTags(db, card.id);
    const fsrs = db.prepare('SELECT * FROM fsrs_states WHERE card_id = ?').get(card.id) as Record<string, unknown>;

    const primary_sentence = contexts.find((ctx) => ctx.is_primary === 1)?.sentence ?? contexts[0]?.sentence ?? null;
    res.json({
      ...card,
      primary_sentence,
      context_count: contexts.length,
      contexts,
      media,
      tags,
      fsrs,
    });
  }));

  // PATCH /api/cards/:id
  router.patch('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getCard(db, id);
    if (!existing) throw new NotFoundError(`Card not found: ${id}`);

    const body = req.body as Record<string, unknown>;
    const updated = db.transaction(() => {
      const card = updateCard(db, id, {
        context_meaning: isNonEmptyString(body.context_meaning) ? body.context_meaning : undefined,
        is_favorite: typeof body.is_favorite === 'boolean' ? body.is_favorite : undefined,
        status: isValidCardStatus(body.status) ? body.status : undefined,
      });

      if (Array.isArray(body.tag_ids)) {
        const tagIds = [...new Set(body.tag_ids)].filter((tagId): tagId is string => typeof tagId === 'string');
        for (const tagId of tagIds) {
          if (!getTag(db, tagId)) throw new BadRequestError(`Tag not found: ${tagId}`);
        }
        db.prepare('DELETE FROM card_tags WHERE card_id = ?').run(id);
        for (const tagId of tagIds) addTagToCard(db, id, tagId);
      }

      return card;
    })();

    if (!updated) throw new NotFoundError(`Card not found: ${id}`);
    res.json(updated);
  }));

  // DELETE /api/cards/:id
  router.delete('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const existing = getCard(db, id);
    if (!existing) throw new NotFoundError(`Card not found: ${id}`);
    deleteCard(db, id);
    res.json({ ok: true });
  }));

  return router;
}
