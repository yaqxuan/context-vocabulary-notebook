import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/client/App';

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        due_count: 0,
        reviewed_today_count: 0,
        again_today_count: 0,
        good_today_count: 0,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
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

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
