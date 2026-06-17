import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/client/App';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';

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
      if (url === '/api/review/due-bubbles') {
        return Promise.resolve(json({ items: [], total_due_count: 0, limit: 20 }));
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
      if (url.startsWith('/api/local-recognition/readiness')) {
        return Promise.resolve(json({
          ffmpeg: { ready: true, message: 'ffmpeg is ready' },
          stt: { provider: 'whisper.cpp', ready: true, executablePath: '/bin/whisper-cli', modelPath: '/models/ggml.bin', message: 'whisper.cpp executable and model are ready' },
          ocr: { provider: 'tesseract', ready: true, executablePath: '/bin/tesseract', language: 'eng', message: 'Tesseract OCR is ready' },
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
          fsrs: { due_date: 'now', stability: null, difficulty: null, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
        }));
      }
      if (url === '/api/ai-configs') return Promise.resolve(json([]));
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

  it('renders the Phase 6/7 sidebar shell with navigation', async () => {
    render(<App />);

    expect(await screen.findByText('语境单词本')).toBeInTheDocument();
    expect(screen.getByText('在语境中学习单词')).toBeInTheDocument();
    expect(screen.queryByText('本地优先')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '导航' })).toHaveTextContent('主页');
    expect(screen.getByRole('navigation', { name: '导航' })).toHaveTextContent('新建');
    expect(screen.getByRole('navigation', { name: '导航' })).toHaveTextContent('设置');
    expect(screen.queryByRole('link', { name: /^批量导入/ })).not.toBeInTheDocument();
  });

  it('navigates with hash links and highlights current page', async () => {
    render(<App />);

    expect(await screen.findByRole('link', { name: /^复习/ })).toBeInTheDocument();
    window.location.hash = '#/review';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(window.location.hash).toBe('#/review');
    expect(screen.getByRole('heading', { name: '开始复习' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^复习/ })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the home route with active navigation', async () => {
    window.location.hash = '#/';
    render(<App />);

    expect(await screen.findByRole('link', { name: /^主页/ })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['#/create', /^新建/],
    ['#/cards', /^卡片/],
    ['#/review', /^复习/],
    ['#/tags', /^标签/],
    ['#/favorites', /^收藏/],
    ['#/statistics', /^统计/],
    ['#/settings', /^设置/],
  ])('renders route %s', async (hash, navName) => {
    window.location.hash = hash;
    render(<App />);

    expect(await screen.findByRole('link', { name: navName })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps batch import route reachable outside the sidebar', async () => {
    window.location.hash = '#/batch-import';
    render(<App />);

    expect(await screen.findByRole('heading', { name: '批量导入' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '批量视频导入' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^批量导入/ })).not.toBeInTheDocument();
  });

  it('renders the real card create page on create route', async () => {
    window.location.hash = '#/create';
    render(<App />);

    expect(await screen.findByRole('heading', { name: '新建卡片' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '捕捉一个真实语境' })).not.toBeInTheDocument();
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
  });

  it('renders real Phase 6 list-like routes', async () => {
    window.location.hash = '#/cards';
    render(<App />);
    expect(await screen.findByRole('link', { name: /^卡片/ })).toHaveAttribute('aria-current', 'page');

    cleanup();
    window.location.hash = '#/favorites';
    render(<App />);
    expect(await screen.findByRole('link', { name: /^收藏/ })).toHaveAttribute('aria-current', 'page');
  });

  it('renders real Phase 6 detail and tags routes', async () => {
    window.location.hash = '#/cards/card-1';
    render(<App />);
    expect(await screen.findByRole('link', { name: /^卡片/ })).toHaveAttribute('aria-current', 'page');

    cleanup();
    window.location.hash = '#/tags';
    render(<App />);
    expect(await screen.findByRole('link', { name: /^标签/ })).toHaveAttribute('aria-current', 'page');
  });

  it('routes review to the real review page', async () => {
    window.location.hash = '#/review';

    render(<App />);

    expect(await screen.findByText('今天没有待复习内容')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });

  it('routes statistics to the real statistics page', async () => {
    window.location.hash = '#/statistics';

    render(<App />);

    expect(await screen.findByText('还没有统计数据')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });

  it('routes settings to the real settings page', async () => {
    window.location.hash = '#/settings';

    render(<App />);

    expect(await screen.findByText('学习与界面设置')).toBeInTheDocument();
    expect(screen.queryByText('Phase 7')).not.toBeInTheDocument();
  });

  it('renders shell copy in the persisted interface language', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown) => new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      if (url === '/api/settings') {
        return Promise.resolve(json({ id: 1, interface_language: '法语', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }));
      }
      if (url.startsWith('/api/statistics/home')) {
        return Promise.resolve(json({ due_count: 0, reviewed_today_count: 0, again_today_count: 0, good_today_count: 0, daily_review_limit: 20, is_daily_target_reached: false }));
      }
      if (url.startsWith('/api/local-recognition/readiness')) {
        return Promise.resolve(json({
          ffmpeg: { ready: true, message: 'ffmpeg is ready' },
          stt: { provider: 'whisper.cpp', ready: true, executablePath: '/bin/whisper-cli', modelPath: '/models/ggml.bin', message: 'whisper.cpp executable and model are ready' },
          ocr: { provider: 'tesseract', ready: true, executablePath: '/bin/tesseract', language: 'eng', message: 'Tesseract OCR is ready' },
        }));
      }
      return Promise.resolve(json({ items: [], total: 0, page: 1, page_size: 20 }));
    });

    render(<App />);

    expect(await screen.findByText('Carnet de vocabulaire contextuel')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toHaveTextContent('Paramètres');
  });
});
