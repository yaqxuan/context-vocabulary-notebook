import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewPage } from '../../src/client/pages/ReviewPage';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';
import type { DueReviewCardDto, MediaDto, ReviewDueResponseDto, ReviewProgressDto, SubmitReviewResponseDto } from '../../src/shared/types';

// --- Helpers ---

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const zhSettings = { interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' };

function mockFetchWithSettings(body: unknown): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    if (String(input) === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
    return Promise.resolve(jsonResponse(body));
  });
}

function mockCurrentFetchWithSettings(body: unknown): void {
  vi.mocked(globalThis.fetch).mockImplementation((input) => {
    if (String(input) === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
    return Promise.resolve(jsonResponse(body));
  });
}

async function renderReviewPage(): Promise<void> {
  render(<I18nProvider><ReviewPage /></I18nProvider>);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// --- Fixtures ---

const progress: ReviewProgressDto = {
  reviewed_count: 3,
  again_count: 1,
  good_count: 2,
  daily_review_limit: 20,
  is_limit_reached: false,
};

const limitReachedProgress: ReviewProgressDto = {
  ...progress,
  reviewed_count: 20,
  is_limit_reached: true,
};

const video: MediaDto = {
  id: 'media-1',
  context_example_id: 'ctx-1',
  media_type: 'video',
  file_name: 'clip.mp4',
  file_path: '/uploads/clip.mp4',
  mime_type: 'video/mp4',
  file_size: 1024,
  is_available: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const image: MediaDto = {
  id: 'media-2',
  context_example_id: 'ctx-1',
  media_type: 'image',
  file_name: 'screenshot.jpg',
  file_path: '/uploads/screenshot.jpg',
  mime_type: 'image/jpeg',
  file_size: 512,
  is_available: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const unavailableImage: MediaDto = {
  id: 'media-4',
  context_example_id: 'ctx-1',
  media_type: 'image',
  file_name: 'missing.jpg',
  file_path: '/uploads/missing.jpg',
  mime_type: 'image/jpeg',
  file_size: 128,
  is_available: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const audio: MediaDto = {
  id: 'media-3',
  context_example_id: 'ctx-1',
  media_type: 'audio',
  file_name: 'clip.mp3',
  file_path: '/uploads/clip.mp3',
  mime_type: 'audio/mpeg',
  file_size: 256,
  is_available: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const secondaryVideo: MediaDto = {
  id: 'media-5',
  context_example_id: 'ctx-2',
  media_type: 'video',
  file_name: 'other-context.mp4',
  file_path: '/uploads/other-context.mp4',
  mime_type: 'video/mp4',
  file_size: 2048,
  is_available: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const dueCard: DueReviewCardDto = {
  id: 'card-1',
  target_word: 'ephemeral',
  context_meaning: '短暂的',
  target_language: '英语',
  definition_language: '中文',
  status: 'reviewing',
  is_favorite: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  primary_sentence: 'The ephemeral beauty of cherry blossoms is part of their charm.',
  context_count: 2,
  tags: [],
  due_date: '2026-01-01T00:00:00Z',
  contexts: [
    {
      id: 'ctx-1',
      card_id: 'card-1',
      sentence: 'The ephemeral beauty of cherry blossoms is part of their charm.',
      note: 'S01E03 12:45',
      is_primary: 1,
      sort_order: 10,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ctx-2',
      card_id: 'card-1',
      sentence: 'Youth is ephemeral.',
      note: null,
      is_primary: 0,
      sort_order: 20,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  media: [video, image, unavailableImage, audio, secondaryVideo],
};

const dueResponse: ReviewDueResponseDto = {
  status: 'due',
  card: dueCard,
  progress,
};

const emptyResponse: ReviewDueResponseDto = {
  status: 'empty',
  message: '今天没有待复习内容',
  card: null,
  progress,
};

const submitResponse: SubmitReviewResponseDto = {
  card_id: 'card-1',
  rating: 'good',
  reviewed_at: '2026-01-01T01:00:00Z',
  due_date_before: '2026-01-01T00:00:00Z',
  due_date_after: '2026-01-05T00:00:00Z',
  fsrs: { due_date: '2026-01-05T00:00:00Z', stability: 4.0, difficulty: 5.0, elapsed_days: 0, scheduled_days: 4, learning_steps: 0, reps: 1, lapses: 0, state: 2, last_reviewed_at: '2026-01-01T01:00:00Z' },
  progress: { ...progress, reviewed_count: 4, good_count: 3 },
};

// --- Tests ---

describe('ReviewPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('due card state', () => {
    beforeEach(() => {
      mockFetchWithSettings(dueResponse);
    });

    it('renders due card from mocked /api/review/due response', async () => {
      render(<I18nProvider><ReviewPage /></I18nProvider>);

      // Initially shows loading before persisted Chinese settings load
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Card content appears, but the answer stays hidden until the user rates recall.
      expect(await screen.findByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();
      expect(screen.queryByText('短暂的')).not.toBeInTheDocument();
      // The sentence has <mark> wrapping the target word, so use a container check
      expect(screen.getByText((_, el) =>
        el?.tagName === 'P' &&
        el?.textContent?.includes('The') &&
        el?.textContent?.includes('beauty of cherry blossoms')
      )).toBeInTheDocument();

      // Progress display
      expect(screen.getByText(/3.*20|3 \/ 20/)).toBeInTheDocument();

      // Again and Good buttons
      expect(screen.getByRole('button', { name: /Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Good/ })).toBeInTheDocument();
    });

    it('highlights target word in sentence with <mark>', async () => {
      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      // The sentence should contain a <mark> element wrapping "ephemeral"
      const marks = document.querySelectorAll('mark');
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0].textContent).toMatch(/ephemeral/i);
    });

    it('highlights repeated target words without dropping identical matches', async () => {
      mockCurrentFetchWithSettings({
        ...dueResponse,
        card: {
          ...dueCard,
          target_word: 'go',
          primary_sentence: 'go now, go again',
        },
      } satisfies ReviewDueResponseDto);

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'go' });
      const marks = [...document.querySelectorAll('mark')].map((mark) => mark.textContent);
      expect(marks).toEqual(['go', 'go']);
    });

    it('toggles context panel showing media, unavailable media badge, note, other contexts', async () => {
      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      // Context panel not visible initially
      expect(screen.queryByText('S01E03 12:45')).not.toBeInTheDocument();

      // Click toggle button
      fireEvent.click(screen.getByRole('button', { name: /查看当时语境/ }));

      // Panel content should appear
      expect(screen.getByText('S01E03 12:45')).toBeInTheDocument();

      // Available media should render as playable/viewable elements, not just file names.
      expect(document.querySelector('video[src="/uploads/clip.mp4"]')).toBeInTheDocument();
      expect(document.querySelector('video[src="/uploads/other-context.mp4"]')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'screenshot.jpg' })).toHaveAttribute('src', '/uploads/screenshot.jpg');
      expect(document.querySelector('audio[src="/uploads/clip.mp3"]')).toBeInTheDocument();

      // Unavailable image should show filename and badge instead of a broken preview.
      expect(screen.getByText('missing.jpg')).toBeInTheDocument();
      expect(screen.getByText('文件不可用')).toBeInTheDocument();

      // Other context examples sorted by sort_order
      expect(screen.getByText('Youth is ephemeral.')).toBeInTheDocument();
    });

    it('hides context panel when toggled again', async () => {
      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      fireEvent.click(screen.getByRole('button', { name: /查看当时语境/ }));
      expect(screen.getByText('S01E03 12:45')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /收起/ }));
      expect(screen.queryByText('S01E03 12:45')).not.toBeInTheDocument();
    });
  });

  describe('review submission', () => {
    it('reveals context after choosing Good from a hidden context and uses next card action instead of confirmation', async () => {
      const nextCard: DueReviewCardDto = {
        ...dueCard,
        id: 'card-2',
        target_word: 'laconic',
        primary_sentence: 'His laconic reply surprised everyone.',
        contexts: [],
        media: [],
      };
      const nextResponse: ReviewDueResponseDto = { status: 'due', card: nextCard, progress: submitResponse.progress };

      let dueCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          expect(init?.body).toBe(JSON.stringify({ rating: 'good' }));
          return Promise.resolve(jsonResponse(submitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          dueCallCount++;
          if (dueCallCount === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse(nextResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));

      expect(screen.getByText('短暂的')).toBeInTheDocument();
      expect(screen.getByText('S01E03 12:45')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '记错了，Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '下一张' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '确认 Good' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'laconic' })).not.toBeInTheDocument();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByRole('button', { name: '下一张' }));

      expect(await screen.findByRole('heading', { name: 'laconic' })).toBeInTheDocument();
    });

    it('asks for Good confirmation when context was already open before rating', async () => {
      const nextCard: DueReviewCardDto = {
        ...dueCard,
        id: 'card-2',
        target_word: 'laconic',
        primary_sentence: 'His laconic reply surprised everyone.',
        contexts: [],
        media: [],
      };
      const nextResponse: ReviewDueResponseDto = { status: 'due', card: nextCard, progress: submitResponse.progress };

      let dueCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          expect(init?.body).toBe(JSON.stringify({ rating: 'good' }));
          return Promise.resolve(jsonResponse(submitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          dueCallCount++;
          if (dueCallCount === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse(nextResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: /查看当时语境/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));

      expect(screen.getByRole('button', { name: '记错了，Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '确认 Good' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '下一张' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'laconic' })).not.toBeInTheDocument();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByRole('button', { name: '确认 Good' }));

      await screen.findByText(/Good 已记录/);
      expect(screen.getByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '下一张' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '下一张' }));
      expect(await screen.findByRole('heading', { name: 'laconic' })).toBeInTheDocument();
    });

    it('shows reveal-state actions and toggles favorite without submitting review', async () => {
      const favoriteResponse = { ...dueCard, is_favorite: 1 };
      const calls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/cards/card-1') && init?.method === 'PATCH') {
          calls.push('favorite');
          expect(init.body).toBe(JSON.stringify({ is_favorite: true }));
          return Promise.resolve(jsonResponse(favoriteResponse));
        }
        if (url.startsWith('/api/review/card-1')) {
          calls.push('review');
          return Promise.resolve(jsonResponse(submitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          calls.push('due');
          return Promise.resolve(jsonResponse(dueResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      expect(screen.queryByRole('button', { name: '收藏' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '标记熟记' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Good' }));

      const favoriteButton = screen.getByRole('button', { name: '收藏' });
      const masteredButton = screen.getByRole('button', { name: '标记熟记' });
      expect(favoriteButton).toBeInTheDocument();
      expect(masteredButton).toBeInTheDocument();
      expect(favoriteButton.closest('.phase7-review-card-header-actions')).toBeInTheDocument();
      expect(masteredButton.closest('.phase7-review-card-header-actions')).toBeInTheDocument();
      expect(favoriteButton).toHaveClass('ring-1', 'ring-slate-300');
      expect(masteredButton).toHaveClass('ring-1', 'ring-slate-300');
      expect(favoriteButton.closest('.phase7-review-footer')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '下一张' }).closest('.phase7-review-rating-row')).toBeInTheDocument();

      fireEvent.click(favoriteButton);

      expect(await screen.findByRole('button', { name: '取消收藏' })).toBeInTheDocument();
      expect(calls).toEqual(['due', 'favorite']);
    });

    it('submits the pending rating before marking the revealed card mastered', async () => {
      const events: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          events.push('submit');
          expect(init.body).toBe(JSON.stringify({ rating: 'good' }));
          return Promise.resolve(jsonResponse(submitResponse));
        }
        if (url.startsWith('/api/cards/card-1') && init?.method === 'PATCH') {
          events.push('mastered');
          expect(init.body).toBe(JSON.stringify({ status: 'mastered' }));
          return Promise.resolve(jsonResponse({ ...dueCard, status: 'mastered' }));
        }
        if (url.startsWith('/api/review/due')) {
          events.push('due');
          return Promise.resolve(jsonResponse(events.length === 1 ? dueResponse : emptyResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '标记熟记' }));

      expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
      expect(events).toEqual(['due', 'submit', 'mastered', 'due']);
    });

    it('does not mark mastered when submitting the pending rating fails', async () => {
      const events: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          events.push('submit');
          return Promise.resolve(jsonResponse({ error: 'review failed' }, 500));
        }
        if (url.startsWith('/api/cards/card-1') && init?.method === 'PATCH') {
          events.push('mastered');
          return Promise.resolve(jsonResponse({ ...dueCard, status: 'mastered' }));
        }
        if (url.startsWith('/api/review/due')) {
          events.push('due');
          return Promise.resolve(jsonResponse(dueResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '标记熟记' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('review failed');
      expect(screen.getByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();
      expect(events).toEqual(['due', 'submit']);
    });

    it('allows a Good choice to be corrected to Again before next-card submission', async () => {
      const againSubmitResponse: SubmitReviewResponseDto = {
        ...submitResponse,
        rating: 'again',
        progress: { ...progress, reviewed_count: 4, again_count: 2 },
      };

      let dueCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          expect(init?.body).toBe(JSON.stringify({ rating: 'again' }));
          return Promise.resolve(jsonResponse(againSubmitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          dueCallCount++;
          if (dueCallCount === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse(emptyResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '记错了，Again' }));

      expect(screen.queryByRole('button', { name: '改为 Good' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '确认 Again' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '确认' }));

      expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
      expect(screen.queryByText(/Again 已记录/)).not.toBeInTheDocument();
    });

    it('reveals context after choosing Again, offers no Good correction, and advances only after confirmation', async () => {
      const againSubmitResponse: SubmitReviewResponseDto = {
        ...submitResponse,
        rating: 'again',
        progress: { ...progress, reviewed_count: 4, again_count: 2 },
      };

      let dueCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          return Promise.resolve(jsonResponse(againSubmitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          dueCallCount++;
          if (dueCallCount === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse(emptyResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Again' }));

      expect(screen.getByText('S01E03 12:45')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '确认 Again' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '改为 Good' })).not.toBeInTheDocument();
      expect(screen.queryByText('今天没有待复习内容')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '确认' }));

      expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
      expect(screen.queryByText(/Again 已记录/)).not.toBeInTheDocument();
    });

    it('keeps card visible and re-enables buttons on submit error', async () => {
      let callIndex = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          return Promise.resolve(jsonResponse({ error: 'server error' }, 500));
        }
        if (url.startsWith('/api/review/due')) {
          callIndex++;
          if (callIndex === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse(dueResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '下一张' }));

      // Error appears
      await screen.findByRole('alert');

      // Card still visible
      expect(screen.getByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();

      // Buttons re-enabled
      await waitFor(() => expect(screen.getByRole('button', { name: '下一张' })).not.toBeDisabled());
      await waitFor(() => expect(screen.getByRole('button', { name: '记错了，Again' })).not.toBeDisabled());
    });

    it('does not offer to resubmit when loading the next card fails after Good submit succeeds', async () => {
      let dueCallCount = 0;
      let submitCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          submitCallCount++;
          return Promise.resolve(jsonResponse(submitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          dueCallCount++;
          if (dueCallCount === 1) return Promise.resolve(jsonResponse(dueResponse));
          return Promise.resolve(jsonResponse({ error: 'next card unavailable' }, 500));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '下一张' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('next card unavailable');
      expect(screen.queryByRole('heading', { name: 'ephemeral' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '下一张' })).not.toBeInTheDocument();
      expect(submitCallCount).toBe(1);
    });
  });

  describe('empty queue state', () => {
    it('shows empty queue message when no due cards', async () => {
      mockFetchWithSettings(emptyResponse);

      await renderReviewPage();

      expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Again/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Good/ })).not.toBeInTheDocument();
      const homeLink = screen.getByRole('link', { name: '返回首页' });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '#/');
      const cardsLink = screen.getByRole('link', { name: '查看全部词义条目' });
      expect(cardsLink).toBeInTheDocument();
      expect(cardsLink).toHaveAttribute('href', '#/cards');
    });
  });

  describe('daily target reached', () => {
    it('shows soft reminder but still allows review controls when limit is reached', async () => {
      const limitResponse: ReviewDueResponseDto = {
        status: 'due',
        card: dueCard,
        progress: limitReachedProgress,
      };

      mockFetchWithSettings(limitResponse);

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      // Reminder message shown
      expect(screen.getByText(/今日目标已完成/)).toBeInTheDocument();

      // Action buttons for dismissing or continuing the reminder
      expect(screen.getByRole('button', { name: '结束复习' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '继续复习' })).toBeInTheDocument();

      // Review controls still present (not blocked)
      expect(screen.getByRole('button', { name: /Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Good/ })).toBeInTheDocument();
    });

    it('dismisses reminder when 结束复习 is clicked', async () => {
      const limitResponse: ReviewDueResponseDto = {
        status: 'due',
        card: dueCard,
        progress: limitReachedProgress,
      };

      mockFetchWithSettings(limitResponse);

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });
      expect(screen.getByText(/今日目标已完成/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '结束复习' }));

      // Reminder dismissed
      expect(screen.queryByText(/今日目标已完成/)).not.toBeInTheDocument();
    });

    it('hides reminder when 继续复习 is clicked', async () => {
      const limitResponse: ReviewDueResponseDto = {
        status: 'due',
        card: dueCard,
        progress: limitReachedProgress,
      };

      mockFetchWithSettings(limitResponse);

      await renderReviewPage();

      await screen.findByRole('heading', { name: 'ephemeral' });

      fireEvent.click(screen.getByRole('button', { name: '继续复习' }));

      expect(screen.queryByText(/今日目标已完成/)).not.toBeInTheDocument();
      // Card still visible
      expect(screen.getByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();
    });

    it('banner remains dismissed after submitting when next response is still limit-reached', async () => {
      const limitResponse: ReviewDueResponseDto = {
        status: 'due',
        card: dueCard,
        progress: limitReachedProgress,
      };
      const nextCard: DueReviewCardDto = {
        ...dueCard,
        id: 'card-2',
        target_word: 'laconic',
        primary_sentence: 'His laconic reply surprised everyone.',
        contexts: [],
        media: [],
      };
      const nextLimitResponse: ReviewDueResponseDto = {
        status: 'due',
        card: nextCard,
        progress: limitReachedProgress,
      };
      const limitSubmitResponse: SubmitReviewResponseDto = {
        ...submitResponse,
        progress: limitReachedProgress,
      };

      let callIndex = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        if (url.startsWith('/api/review/card-1') && init?.method === 'POST') {
          return Promise.resolve(jsonResponse(limitSubmitResponse));
        }
        if (url.startsWith('/api/review/due')) {
          callIndex++;
          if (callIndex === 1) return Promise.resolve(jsonResponse(limitResponse));
          return Promise.resolve(jsonResponse(nextLimitResponse));
        }
        return Promise.resolve(jsonResponse({}));
      });

      await renderReviewPage();

      // Initial load shows banner
      await screen.findByRole('heading', { name: 'ephemeral' });
      expect(screen.getByText(/今日目标已完成/)).toBeInTheDocument();

      // User dismisses the banner
      fireEvent.click(screen.getByRole('button', { name: '继续复习' }));
      expect(screen.queryByText(/今日目标已完成/)).not.toBeInTheDocument();

      // Choose Good from hidden context, then use next action to submit and advance.
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
      fireEvent.click(screen.getByRole('button', { name: '下一张' }));

      // After next card loads (still limit-reached), banner must NOT reappear
      await screen.findByRole('heading', { name: 'laconic' });
      expect(screen.queryByText(/今日目标已完成/)).not.toBeInTheDocument();
    });
  });

  describe('retryable API error', () => {
    it('shows error state with retry button on API failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        if (String(input) === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        return Promise.resolve(jsonResponse({ error: 'database unavailable' }, 500));
      });

      await renderReviewPage();

      // Error state appears
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('database unavailable');
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });

    it('retries and shows card after clicking 重试', async () => {
      let dueCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        if (String(input) === '/api/settings') return Promise.resolve(jsonResponse(zhSettings));
        dueCallCount++;
        if (dueCallCount === 1) {
          return Promise.resolve(jsonResponse({ error: 'transient error' }, 500));
        }
        return Promise.resolve(jsonResponse(dueResponse));
      });

      await renderReviewPage();

      await screen.findByRole('alert');

      fireEvent.click(screen.getByRole('button', { name: '重试' }));

      expect(await screen.findByRole('heading', { name: 'ephemeral' })).toBeInTheDocument();
    });
  });

  it('renders English UI chrome when interface language is English', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '英语' }));
      if (url === '/api/review/due') return Promise.resolve(jsonResponse({
        status: 'due',
        card: dueCard,
        progress: limitReachedProgress,
      }));
      return Promise.resolve(jsonResponse({}));
    });

    render(<I18nProvider><ReviewPage /></I18nProvider>);

    expect(await screen.findByRole('button', { name: 'End review' })).toBeInTheDocument();
  });
});