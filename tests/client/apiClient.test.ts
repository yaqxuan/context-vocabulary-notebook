import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAiConfig, deleteAiConfig, listAiConfigs, patchAiConfig, setActiveAiConfig } from '../../src/client/api/aiConfigs';
import { getAiSuggestion } from '../../src/client/api/aiSuggestions';
import { listCards } from '../../src/client/api/cards';
import { ApiError, apiBlob, apiFormData, apiRequest, buildQuery } from '../../src/client/api/client';
import { executeImport, exportCards } from '../../src/client/api/importExport';
import { getHomeStatistics } from '../../src/client/api/statistics';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns typed JSON for successful API requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiRequest<{ ok: boolean }>('/health');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: expect.objectContaining({ accept: 'application/json' }),
    }));
  });

  it('serializes JSON bodies and sets content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'card-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiRequest('/cards', { method: 'POST', json: { target_word: 'charge' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ target_word: 'charge' }),
      headers: expect.objectContaining({ 'content-type': 'application/json' }),
    }));
  });

  it('rejects absolute URLs to keep API calls same-origin', async () => {
    await expect(apiRequest('https://example.com/api/cards')).rejects.toThrow('Absolute API URLs are not allowed');
  });

  it('throws ApiError with JSON error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'target_word is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiRequest('/cards')).rejects.toMatchObject({
      status: 400,
      message: 'target_word is required',
    });
  });

  it('throws ApiError with text fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Server exploded', { status: 500 }));

    try {
      await apiRequest('/cards');
      throw new Error('Expected apiRequest to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 500, message: 'Server exploded' });
    }
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/cards/card-1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('builds query strings without empty values', () => {
    expect(buildQuery({ search: 'charge', page: 2, favorite: undefined, empty: '' })).toBe('search=charge&page=2');
  });

  it('downloads blobs without forcing JSON parsing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip', { status: 200 }));

    const result = await apiBlob('/export?type=pure');

    expect(await result.text()).toBe('zip');
  });

  it('posts form data without JSON content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ imported_cards: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const formData = new FormData();
    formData.append('file', new Blob(['x']), 'cards.zip');

    await apiFormData('/import/scan', formData);

    expect(fetchMock).toHaveBeenCalledWith('/api/import/scan', expect.objectContaining({
      method: 'POST',
      body: formData,
      headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });
});

describe('endpoint modules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests card lists with query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listCards({ search: 'charge', page: 1, page_size: 20, favorite: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards?search=charge&page=1&page_size=20&favorite=true', expect.any(Object));
  });

  it('requests home statistics', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ due_count: 0, reviewed_today_count: 0, again_today_count: 0, good_today_count: 0, daily_review_limit: 20, is_daily_target_reached: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getHomeStatistics();

    expect(fetchMock).toHaveBeenCalledWith('/api/statistics/home', expect.any(Object));
  });

  it('calls AI config and suggestion endpoints', async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body ?? null });
      return Promise.resolve(new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } }));
    });

    await listAiConfigs();
    await createAiConfig({ name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', api_key: 'sk-secret', model: 'deepseek-chat' });
    await patchAiConfig('cfg-1', { model: 'deepseek-chat-v2' });
    await setActiveAiConfig('cfg-1');
    await deleteAiConfig('cfg-1');
    await getAiSuggestion({ target_word: 'charge', sentence: 'They charge extra.' });

    expect(calls.map((call) => [call.url, call.method])).toEqual([
      ['/api/ai-configs', 'GET'],
      ['/api/ai-configs', 'POST'],
      ['/api/ai-configs/cfg-1', 'PATCH'],
      ['/api/ai-configs/cfg-1/activate', 'POST'],
      ['/api/ai-configs/cfg-1', 'DELETE'],
      ['/api/ai/suggestions', 'POST'],
    ]);
  });

  it('downloads pure-card exports', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip', { status: 200 }));

    await exportCards('pure');

    expect(fetchMock).toHaveBeenCalledWith('/api/export?type=pure', expect.any(Object));
  });

  it('posts import execute decisions using the server form key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ imported_cards: 0, imported_contexts: 0, imported_media_files: 0, skipped_cards: 1, merged_cards: 0, missing_media_files: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const file = new File(['zip'], 'cards.zip', { type: 'application/zip' });

    await executeImport(file, { mode: 'skip_all' });

    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('decisions')).toBe(JSON.stringify({ mode: 'skip_all' }));
    expect(body.get('decision')).toBeNull();
  });
});
