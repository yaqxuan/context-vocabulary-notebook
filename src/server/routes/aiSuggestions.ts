import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import type { AiSuggestionRequestDto } from '../../shared/types.js';
import { isNonEmptyString } from '../../shared/validators.js';
import { BadRequestError } from '../http/errors.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { getActiveAiConfigWithKey } from '../domain/aiConfigs.js';
import { requestAiSuggestion } from '../domain/aiSuggestions.js';

export function aiSuggestionsRouter(db: Database): Router {
  const router = Router();

  router.post('/suggestions', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (!isNonEmptyString(body.target_word)) throw new BadRequestError('target_word is required');
    if (!isNonEmptyString(body.sentence)) throw new BadRequestError('sentence is required');

    const targetWord = body.target_word.trim();
    const sentence = body.sentence.trim();
    if (targetWord.length > 200) throw new BadRequestError('target_word must be at most 200 characters');
    if (sentence.length > 2000) throw new BadRequestError('sentence must be at most 2000 characters');

    const input: AiSuggestionRequestDto = {
      target_word: targetWord,
      sentence,
      target_language: isNonEmptyString(body.target_language) ? body.target_language.trim() : undefined,
      definition_language: isNonEmptyString(body.definition_language) ? body.definition_language.trim() : undefined,
    };

    res.json(await requestAiSuggestion(getActiveAiConfigWithKey(db), input));
  }));

  return router;
}
