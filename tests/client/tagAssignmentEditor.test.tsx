import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TAG_LOAD_TIMEOUT_MS, TagAssignmentEditor } from '../../src/client/components/TagAssignmentEditor';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('TagAssignmentEditor', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stops showing loading forever when the tag request never settles', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => undefined));

    render(<TagAssignmentEditor selectedTagIds={[]} onSelectedTagIdsChange={vi.fn()} />);

    expect(screen.getByText('加载标签中…')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(TAG_LOAD_TIMEOUT_MS);
    });

    expect(screen.queryByText('加载标签中…')).not.toBeInTheDocument();
    expect(screen.getByText('标签列表加载超时，请重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新加载标签' })).toBeInTheDocument();
  });

  it('keeps the retry timeout active when an earlier timed-out request settles later', async () => {
    vi.useFakeTimers();
    let resolveFirstRequest: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      if (!resolveFirstRequest) {
        return new Promise<Response>((resolve) => {
          resolveFirstRequest = resolve;
        });
      }
      return new Promise<Response>(() => undefined);
    });

    render(<TagAssignmentEditor selectedTagIds={[]} onSelectedTagIdsChange={vi.fn()} />);

    await act(async () => {
      vi.advanceTimersByTime(TAG_LOAD_TIMEOUT_MS);
    });
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
