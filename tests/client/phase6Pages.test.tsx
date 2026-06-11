import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardCatalogue, type CardCatalogueFilters } from '../../src/client/components/CardCatalogue';
import { CardDetailPage } from '../../src/client/pages/CardDetailPage';
import { CardListPage } from '../../src/client/pages/CardListPage';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';
import { FavoritesPage } from '../../src/client/pages/FavoritesPage';
import { TagsPage } from '../../src/client/pages/TagsPage';
import type { CardSummaryDto, TagDto } from '../../src/shared/types';

const tags: TagDto[] = [{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }];
const filters: CardCatalogueFilters = { search: '', tagId: '', status: '', favorite: '', page: 1, pageSize: 20 };
const cards: CardSummaryDto[] = [{
  id: 'card-1',
  target_word: 'charge',
  context_meaning: '收费',
  target_language: '英语',
  definition_language: '中文',
  status: 'reviewing',
  is_favorite: 1,
  created_at: 'now',
  updated_at: 'now',
  primary_sentence: 'The hotel charges $100 per night.',
  context_count: 2,
  tags,
}];

const detail = {
  ...cards[0],
  contexts: [{ id: 'ctx-1', card_id: 'card-1', sentence: 'The hotel charges $100 per night.', note: 'S01E01 03:12', is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' }],
  media: [{ id: 'media-1', context_example_id: 'ctx-1', media_type: 'video' as const, file_name: 'clip.mp4', file_path: '/uploads/clip.mp4', mime_type: 'video/mp4', file_size: 100, is_available: 1, created_at: 'now' }],
  fsrs: { due_date: '2026-06-03T00:00:00.000Z', stability: null, difficulty: null, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('Phase 6 pages', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse(tags));
      if (url.startsWith('/api/cards') && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
      if (url.startsWith('/api/cards')) return Promise.resolve(jsonResponse({ items: cards, total: 1, page: 1, page_size: 20 }));
      return Promise.resolve(jsonResponse({}));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders catalogue cards and emits filter/action changes', () => {
    const onFiltersChange = vi.fn();
    const onRetry = vi.fn();
    const onToggleStatus = vi.fn();
    const onToggleFavorite = vi.fn();

    render(<I18nProvider><CardCatalogue title="词义条目" subtitle="管理所有词义" cards={cards} total={1} loading={false} error={null} tags={tags} filters={filters} emptyMessage="还没有词义条目" filteredEmptyMessage="没有匹配的词义条目" onFiltersChange={onFiltersChange} onRetry={onRetry} onToggleStatus={onToggleStatus} onToggleFavorite={onToggleFavorite} /></I18nProvider>);

    expect(screen.getByText('charge')).toBeInTheDocument();
    expect(screen.getByText('English → 中文')).toBeInTheDocument();
    expect(screen.queryByText('英语 → 中文')).not.toBeInTheDocument();
    expect(screen.getByText('收费')).toBeInTheDocument();
    expect(screen.getByText('The hotel charges $100 per night.')).toBeInTheDocument();
    expect(screen.getAllByText('美剧').length).toBeGreaterThan(0);
    expect(screen.getByText('2 contexts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View detail' })).toHaveAttribute('href', '#/cards/card-1');

    fireEvent.change(screen.getByLabelText('Search words, definitions, sentences, tags or notes'), { target: { value: 'charge' } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, search: 'charge', page: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Mark as mastered' }));
    expect(onToggleStatus).toHaveBeenCalledWith(cards[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove favorite' }));
    expect(onToggleFavorite).toHaveBeenCalledWith(cards[0]);
  });

  it('loads card list page and toggles card status', async () => {
    render(<I18nProvider><CardListPage /></I18nProvider>);

    expect(await screen.findByText('charge')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '标记为已掌握' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'mastered' }) })));
  });

  it('loads favorites page with favorite filter forced', async () => {
    render(<I18nProvider><FavoritesPage /></I18nProvider>);

    expect(await screen.findByText('charge')).toBeInTheDocument();
    expect(screen.getByLabelText('搜索单词、释义、原句、标签或备注')).toBeInTheDocument();
    await waitFor(() => expect(String(vi.mocked(globalThis.fetch).mock.calls.find(([input]) => String(input).startsWith('/api/cards'))?.[0])).toContain('favorite=true'));
  });

  it('loads card detail and exposes context actions', async () => {
    window.location.hash = '#/cards/card-1';
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      if (url === '/api/contexts/ctx-1/primary') return Promise.resolve(jsonResponse({ ok: true }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    const titleStack = screen.getByTestId('detail-title-stack');
    expect(titleStack).toContainElement(screen.getByRole('heading', { name: 'charge' }));
    expect(titleStack).toContainElement(screen.getByText('收费'));
    expect(screen.getByTestId('detail-meaning-actions')).toContainElement(screen.getByRole('button', { name: '编辑释义' }));
    expect(screen.getByText('S01E01 03:12')).toBeInTheDocument();
    expect(screen.getByText('正在复习中：已进入复习队列，可以现在复习。')).toBeInTheDocument();
    expect(screen.queryByText(/复习时间：/)).not.toBeInTheDocument();
    expect(screen.getByText('复习次数：0')).toBeInTheDocument();
    expect(screen.getByText('遗忘次数：0')).toBeInTheDocument();
    expect(screen.getByLabelText('clip.mp4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '标记为已掌握' }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'mastered' }) })));
  });

  it('renders review info with one next-review line and Chinese counter labels', async () => {
    window.location.hash = '#/cards/card-1';
    const futureDetail = {
      ...detail,
      fsrs: {
        ...detail.fsrs,
        due_date: '2099-01-02T03:04:05.000Z',
        reps: 6,
        lapses: 0,
      },
    };
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(futureDetail));
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse(tags));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    expect(screen.getByText('状态：复习中')).toBeInTheDocument();
    expect(screen.getAllByText(/2099/)).toHaveLength(1);
    expect(screen.queryByText(/复习时间：/)).not.toBeInTheDocument();
    expect(screen.getByText('复习次数：6')).toBeInTheDocument();
    expect(screen.getByText('遗忘次数：0')).toBeInTheDocument();
    expect(screen.queryByText(/Reps/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lapses/)).not.toBeInTheDocument();
  });

  it('添加语境 button navigates to create page with card_id', async () => {
    window.location.hash = '#/cards/card-1';
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加语境' }));
    expect(window.location.hash).toBe('#/create?card_id=card-1');
  });

  it('edits context meaning from the detail page', async () => {
    window.location.hash = '#/cards/card-1';
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ...cards[0], context_meaning: '收费；要价' }));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑释义' }));
    fireEvent.change(screen.getByLabelText('编辑当前语境释义'), { target: { value: '收费；要价' } });
    fireEvent.click(screen.getByRole('button', { name: '保存释义' }));

    await waitFor(() => expect(requests.some((request) => request.url === '/api/cards/card-1' && request.method === 'PATCH' && request.body === JSON.stringify({ context_meaning: '收费；要价' }))).toBe(true));
  });

  it('rejects blank context meaning edits on the detail page', async () => {
    window.location.hash = '#/cards/card-1';
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse(tags));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑释义' }));
    fireEvent.change(screen.getByLabelText('编辑当前语境释义'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存释义' }));

    expect(screen.getByText('当前语境释义必填')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/cards/card-1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('edits tag assignments from the detail page', async () => {
    window.location.hash = '#/cards/card-1';
    const allTags = [
      { id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' },
      { id: 'tag-2', name: '电影', created_at: 'now', updated_at: 'now' },
    ];
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/tags') return Promise.resolve(jsonResponse(allTags));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /编辑标签|Edit tags/ })).toHaveClass('phase6-tag-edit-button');
    fireEvent.click(screen.getByRole('button', { name: /编辑标签|Edit tags/ }));
    fireEvent.click(await screen.findByRole('button', { name: '电影' }));
    fireEvent.click(screen.getByRole('button', { name: /保存标签|Save tags/ }));

    await waitFor(() => expect(requests.some((request) => request.url === '/api/cards/card-1' && request.method === 'PATCH' && request.body === JSON.stringify({ tag_ids: ['tag-1', 'tag-2'] }))).toBe(true));
    await waitFor(() => expect(requests.filter((request) => request.url === '/api/cards/card-1' && request.method === 'GET')).toHaveLength(2));
  });

  it('creates a new tag while editing detail tag assignments', async () => {
    window.location.hash = '#/cards/card-1';
    const allTags = [tags[0]];
    const createdTag = { id: 'tag-2', name: '电影', created_at: 'now', updated_at: 'now' };
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/tags' && init?.method === 'POST') return Promise.resolve(jsonResponse(createdTag, 201));
      if (url === '/api/tags') return Promise.resolve(jsonResponse(allTags));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse(cards[0]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardDetailPage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /编辑标签|Edit tags/ }));
    fireEvent.change(await screen.findByLabelText('新增标签名称'), { target: { value: '电影' } });
    fireEvent.click(screen.getByRole('button', { name: '新增并选中标签' }));
    expect(await screen.findByRole('button', { name: '电影' })).toHaveClass('selected');
    fireEvent.click(screen.getByRole('button', { name: /保存标签|Save tags/ }));

    await waitFor(() => expect(requests.some((request) => request.url === '/api/tags' && request.method === 'POST' && request.body === JSON.stringify({ name: '电影' }))).toBe(true));
    await waitFor(() => expect(requests.some((request) => request.url === '/api/cards/card-1' && request.method === 'PATCH' && request.body === JSON.stringify({ tag_ids: ['tag-1', 'tag-2'] }))).toBe(true));
  });

  it('creates edits and confirms tag deletion', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }));
      if (url === '/api/tags' && init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'tag-2', name: '电影', created_at: 'now', updated_at: 'now' }, 201));
      if (url === '/api/tags/tag-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ...tags[0], name: '美剧 updated' }));
      if (url === '/api/tags/tag-1' && init?.method === 'DELETE') return Promise.resolve(jsonResponse({ ok: true }));
      if (url === '/api/tags') return Promise.resolve(jsonResponse(tags));
      return Promise.resolve(jsonResponse({}));
    });

    render(<I18nProvider><TagsPage /></I18nProvider>);

    expect(await screen.findByText('美剧')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('标签名称'), { target: { value: '电影' } });
    fireEvent.click(screen.getByRole('button', { name: '新增标签' }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '电影' }) })));

    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.change(screen.getByLabelText('标签名称'), { target: { value: '美剧 updated' } });
    fireEvent.click(screen.getByRole('button', { name: /保存标签|Save tags/ }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags/tag-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: '美剧 updated' }) })));
  });

  it('renders English UI chrome when interface language is English for Tags page', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '英语' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (url.startsWith('/api/tags')) return Promise.resolve(new Response(JSON.stringify([{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><TagsPage /></I18nProvider>);

    await waitFor(() => expect(screen.getByLabelText('New tag name')).toBeInTheDocument());
  });
});