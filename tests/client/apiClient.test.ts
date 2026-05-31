import { afterEach, describe, expect, it, vi } from 'vitest';

import { listCards } from '../../src/client/api/cards';
import { ApiError, apiBlob, apiFormData, apiRequest, buildQuery } from '../../src/client/api/client';
import { exportCards } from '../../src/client/api/importExport';
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

  it('downloads pure-card exports', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip', { status: 200 }));

    await exportCards('pure');

    expect(fetchMock).toHaveBeenCalledWith('/api/export?type=pure', expect.any(Object));
  });
});
