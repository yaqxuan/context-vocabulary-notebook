import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/client/App';

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown) => new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      if (url.startsWith('/api/statistics/home')) {
        return Promise.resolve(json({
          due_count: 0,
          reviewed_today_count: 0,
          again_today_count: 0,
          good_today_count: 0,
          daily_review_limit: 20,
          is_daily_target_reached: false,
        }));
      }
      if (url.startsWith('/api/tags')) return Promise.resolve(json([]));
      if (url === '/api/cards/card-1') {
        return Promise.resolve(json({
          id: 'card-1',
          target_word: 'charge',
          context_meaning: '收费',
          target_language: '英语',
          definition_language: '中文',
          status: 'reviewing',
          is_favorite: 0,
          created_at: 'now',
          updated_at: 'now',
          primary_sentence: null,
          context_count: 0,
          tags: [],
          contexts: [],
          media: [],
          fsrs: { due_date: 'now', stability: null, difficulty: null, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
        }));
      }
      if (url.startsWith('/api/cards')) return Promise.resolve(json({ items: [], total: 0, page: 1, page_size: 20 }));
      return Promise.resolve(json({}));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders the sidebar shell with navigation', () => {
    render(<App />);

    expect(screen.getByText('语境单词本')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('首页');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('制卡');
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveTextContent('设置');
  });

  it('navigates with hash links and highlights current page', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: /^复习/ }));
    window.location.hash = '#/review';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(window.location.hash).toBe('#/review');
    expect(screen.getByRole('heading', { name: '复习' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^复习/ })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['#/', '首页'],
    ['#/create', '制卡'],
    ['#/cards', '词义条目'],
    ['#/cards/card-1', '词义详情'],
    ['#/review', '复习'],
    ['#/tags', '标签管理'],
    ['#/favorites', '收藏'],
    ['#/statistics', '统计'],
    ['#/settings', '设置'],
  ])('renders route %s', (hash, heading) => {
    window.location.hash = hash;
    render(<App />);

    expect(screen.getAllByRole('heading', { name: heading }).length).toBeGreaterThan(0);
  });

  it('renders real Phase 6 list-like routes', async () => {
    window.location.hash = '#/cards';
    render(<App />);
    expect((await screen.findAllByText('搜索、筛选和管理所有词义卡。')).length).toBeGreaterThan(0);

    cleanup();
    window.location.hash = '#/favorites';
    render(<App />);
    expect(await screen.findByText('集中查看你标记过的重点词义。')).toBeInTheDocument();
  });

  it('renders real Phase 6 detail and tags routes', async () => {
    window.location.hash = '#/cards/card-1';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'charge' })).toBeInTheDocument();

    cleanup();
    window.location.hash = '#/tags';
    render(<App />);
    expect(await screen.findByText('标签承担自由分类和来源标记，不影响复习算法。')).toBeInTheDocument();
  });
});
