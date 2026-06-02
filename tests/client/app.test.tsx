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
      if (url === '/api/review/due') {
        return Promise.resolve(json({ status: 'empty', message: '今天没有待复习内容', card: null, progress: { reviewed_count: 0, again_count: 0, good_count: 0, daily_review_limit: 20, is_limit_reached: false } }));
      }
      if (url === '/api/statistics') {
        return Promise.resolve(json({ totals: { total_cards: 0, reviewing_cards: 0, mastered_cards: 0, favorite_cards: 0 }, daily_review_counts: [], daily_accuracy: [], monthly_review_counts: [], tag_distribution: [], rating_trend: [] }));
      }
      if (url === '/api/settings') {
        return Promise.resolve(json({ id: 1, interface_language: 'zh-CN', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }));
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
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(json([]));
      if (url.startsWith('/api/cards')) return Promise.resolve(json({ items: [], total: 0, page: 1, page_size: 20 }));
      return Promise.resolve(json({}));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders the Phase 6/7 sidebar shell with navigation', () => {
    render(<App />);

    expect(screen.getByText('语境单词本')).toBeInTheDocument();
    expect(screen.getByText('Context Review Desk')).toBeInTheDocument();
    expect(screen.queryByText('本地优先')).not.toBeInTheDocument();
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

  it('renders the home route with active navigation', () => {
    window.location.hash = '#/';
    render(<App />);

    expect(screen.getByRole('link', { name: /^首页/ })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['#/create', /^制卡/],
    ['#/cards', /^词义条目/],
    ['#/review', /^复习/],
    ['#/tags', /^标签/],
    ['#/favorites', /^收藏/],
    ['#/statistics', /^统计/],
    ['#/settings', /^设置/],
  ])('renders route %s', (hash, navName) => {
    window.location.hash = hash;
    render(<App />);

    expect(screen.getByRole('link', { name: navName })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the real card create page on create route', async () => {
    window.location.hash = '#/create';
    render(<App />);

    expect(screen.getByRole('heading', { name: '制卡' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '捕捉一个真实语境' })).not.toBeInTheDocument();
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
  });

  it('renders real Phase 6 list-like routes', () => {
    window.location.hash = '#/cards';
    render(<App />);
    expect(screen.getByRole('link', { name: /^词义条目/ })).toHaveAttribute('aria-current', 'page');

    cleanup();
    window.location.hash = '#/favorites';
    render(<App />);
    expect(screen.getByRole('link', { name: /^收藏/ })).toHaveAttribute('aria-current', 'page');
  });

  it('renders real Phase 6 detail and tags routes', () => {
    window.location.hash = '#/cards/card-1';
    render(<App />);
    expect(screen.getByRole('link', { name: /^词义条目/ })).toHaveAttribute('aria-current', 'page');

    cleanup();
    window.location.hash = '#/tags';
    render(<App />);
    expect(screen.getByRole('link', { name: /^标签/ })).toHaveAttribute('aria-current', 'page');
  });

  it('routes review to the real review page', async () => {
    window.location.hash = '#/review';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'empty', message: '今天没有待复习内容', card: null, progress: { reviewed_count: 0, again_count: 0, good_count: 0, daily_review_limit: 20, is_limit_reached: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    render(<App />);

    expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });

  it('routes statistics to the real statistics page', async () => {
    window.location.hash = '#/statistics';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ totals: { total_cards: 0, reviewing_cards: 0, mastered_cards: 0, favorite_cards: 0 }, daily_review_counts: [], daily_accuracy: [], monthly_review_counts: [], tag_distribution: [], rating_trend: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    render(<App />);

    expect(await screen.findByText('还没有统计数据')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });

  it('routes settings to the real settings page', async () => {
    window.location.hash = '#/settings';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 1, interface_language: 'zh-CN', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    render(<App />);

    expect(await screen.findByText('学习与界面设置')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });
});
