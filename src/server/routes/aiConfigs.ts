import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import type { AiModelListRequestDto, CreateAiConfigBody, PatchAiConfigBody } from '../../shared/types.js';
import { isNonEmptyString } from '../../shared/validators.js';
import { BadRequestError, NotFoundError } from '../http/errors.js';
import { asyncRoute } from '../http/asyncRoute.js';
import { createAiConfig, deleteAiConfig, getAiConfig, listAiConfigs, setActiveAiConfig, updateAiConfig } from '../domain/aiConfigs.js';
import { requestAiModelList } from '../domain/aiSuggestions.js';

function requireString(field: string, value: unknown): string {
  if (!isNonEmptyString(value)) throw new BadRequestError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalString(field: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!isNonEmptyString(value)) throw new BadRequestError(`${field} must be a non-empty string`);
  return value.trim();
}

function parseBoolean(field: string, value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new BadRequestError(`${field} must be a boolean`);
  return value;
}

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

function assertHttpBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestError('base_url must be a valid http(s) URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('base_url must be a valid http(s) URL');
  }
  return value.replace(/\/+$/, '');
}

export function aiConfigsRouter(db: Database): Router {
  const router = Router();

  router.get('/', asyncRoute(async (_req, res) => {
    res.json(listAiConfigs(db));
  }));

  router.post('/models', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const input: AiModelListRequestDto = {
      base_url: assertHttpBaseUrl(requireString('base_url', body.base_url)),
      api_key: requireString('api_key', body.api_key),
    };
    try {
      res.json({ models: await requestAiModelList(input.base_url, input.api_key) });
    } catch {
      throw new BadRequestError('AI model list unavailable');
    }
  }));

  router.get('/:id/models', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const config = getAiConfig(db, id);
    if (!config) throw new NotFoundError(`AI config not found: ${id}`);
    try {
      res.json({ models: await requestAiModelList(config.base_url, config.api_key) });
    } catch {
      throw new BadRequestError('AI model list unavailable');
    }
  }));

  router.post('/', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const input: CreateAiConfigBody = {
      name: requireString('name', body.name),
      base_url: assertHttpBaseUrl(requireString('base_url', body.base_url)),
      api_key: requireString('api_key', body.api_key),
      model: requireString('model', body.model),
      is_active: parseBoolean('is_active', body.is_active),
    };
    res.status(201).json(createAiConfig(db, input));
  }));

  router.patch('/:id', asyncRoute(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const baseUrl = optionalString('base_url', body.base_url);
    const input: PatchAiConfigBody = {
      name: optionalString('name', body.name),
      base_url: baseUrl === undefined ? undefined : assertHttpBaseUrl(baseUrl),
      api_key: optionalString('api_key', body.api_key),
      model: optionalString('model', body.model),
      is_active: parseBoolean('is_active', body.is_active),
    };
    if (!Object.values(input).some((value) => value !== undefined)) {
      throw new BadRequestError('PATCH body must include at least one field to update');
    }
    const id = paramStr(req.params.id);
    const updated = updateAiConfig(db, id, input);
    if (!updated) throw new NotFoundError(`AI config not found: ${id}`);
    res.json(updated);
  }));

  router.post('/:id/activate', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    const updated = setActiveAiConfig(db, id);
    if (!updated) throw new NotFoundError(`AI config not found: ${id}`);
    res.json(updated);
  }));

  router.delete('/:id', asyncRoute(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!deleteAiConfig(db, id)) throw new NotFoundError(`AI config not found: ${id}`);
    res.json({ ok: true });
  }));

  return router;
}
