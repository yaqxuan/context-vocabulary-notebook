import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TAG_LOAD_TIMEOUT_MS, TagAssignmentEditor } from '../../src/client/components/TagAssignmentEditor';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('TagAssignmentEditor', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stops showing loading forever when the tag request never settles (English test)', async () => {
    vi.useFakeTimers();
    
    let resolveSettings: (val: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') {
        return new Promise<Response>((resolve) => {
          resolveSettings = resolve;
        });
      }
      return new Promise<Response>(() => undefined);
    });

    render(
      <I18nProvider>
        <TagAssignmentEditor selectedTagIds={[]} onSelectedTagIdsChange={vi.fn()} />
      </I18nProvider>
    );

    await act(async () => {
      resolveSettings(jsonResponse({ id: 1, interface_language: '英语' }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Loading tags...')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(TAG_LOAD_TIMEOUT_MS);
    });

    expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
    expect(screen.getByText('Loading tags timed out, please try again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload tags' })).toBeInTheDocument();
  });

  it('keeps the retry timeout active when an earlier timed-out request settles later', async () => {
    vi.useFakeTimers();
    
    let resolveFirstRequest: ((response: Response) => void) | undefined;
    let resolveSettings: (val: Response) => void = () => {};

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') {
        return new Promise<Response>((resolve) => {
          resolveSettings = resolve;
        });
      }
      if (!resolveFirstRequest) {
        return new Promise<Response>((resolve) => {
          resolveFirstRequest = resolve;
        });
      }
      return new Promise<Response>(() => undefined);
    });

    render(
      <I18nProvider>
        <TagAssignmentEditor selectedTagIds={[]} onSelectedTagIdsChange={vi.fn()} />
      </I18nProvider>
    );

    await act(async () => {
      resolveSettings(jsonResponse({ id: 1, interface_language: '中文' }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('加载标签中…')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(TAG_LOAD_TIMEOUT_MS);
    });
    
    expect(screen.getByText('标签列表加载超时，请重试')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新加载标签' }));
    expect(screen.getByText('加载标签中…')).toBeInTheDocument();

    await act(async () => {
      resolveFirstRequest?.(jsonResponse([]));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(TAG_LOAD_TIMEOUT_MS);
    });

    expect(screen.queryByText('加载标签中…')).not.toBeInTheDocument();
    expect(screen.getByText('标签列表加载超时，请重试')).toBeInTheDocument();
  });
});
