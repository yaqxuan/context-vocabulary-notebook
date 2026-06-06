import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { SUPPORTED_LANGUAGES } from '../../shared/constants.js';
import type { AiSpellingCheckRequestDto, AiSuggestionRequestDto } from '../../shared/types.js';
import { isNonEmptyString, isSupportedLanguage } from '../../shared/validators.js';
import { BadRequestError } from '../http/errors.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { getActiveAiConfigWithKey } from '../domain/aiConfigs.js';
import { requestAiSpellingCheck, requestAiSuggestion } from '../domain/aiSuggestions.js';

function optionalSupportedLanguage(field: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!isNonEmptyString(value)) throw new BadRequestError(`${field} must be a non-empty string`);
  const trimmed = value.trim();
  if (!isSupportedLanguage(trimmed)) {
    throw new BadRequestError(`${field} must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  return trimmed;
}

function parseAiTextInput(body: Record<string, unknown>): { targetWord: string; sentence: string } {
  if (!isNonEmptyString(body.target_word)) throw new BadRequestError('target_word is required');
  if (!isNonEmptyString(body.sentence)) throw new BadRequestError('sentence is required');

  const targetWord = body.target_word.trim();
  const sentence = body.sentence.trim();
  if (targetWord.length > 200) throw new BadRequestError('target_word must be at most 200 characters');
  if (sentence.length > 2000) throw new BadRequestError('sentence must be at most 2000 characters');
  return { targetWord, sentence };
}

export function aiSuggestionsRouter(db: Database): Router {
  const router = Router();

  router.post('/suggestions', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const { targetWord, sentence } = parseAiTextInput(body);

    const input: AiSuggestionRequestDto = {
      target_word: targetWord,
      sentence,
      target_language: optionalSupportedLanguage('target_language', body.target_language),
      definition_language: optionalSupportedLanguage('definition_language', body.definition_language),
    };

    res.json(await requestAiSuggestion(getActiveAiConfigWithKey(db), input));
  }));

  router.post('/spelling-check', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const { targetWord, sentence } = parseAiTextInput(body);

    const input: AiSpellingCheckRequestDto = {
      target_word: targetWord,
      sentence,
      target_language: optionalSupportedLanguage('target_language', body.target_language),
    };

    res.json(await requestAiSpellingCheck(getActiveAiConfigWithKey(db), input));
  }));

  return router;
}
