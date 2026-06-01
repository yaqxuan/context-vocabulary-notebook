import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../src/client/pages/HomePage';

vi.mock('../../src/client/lib/homeGreetings', () => ({
  getHomeGreeting: vi.fn().mockReturnValue({
    date: '2026-06-01',
    bucket: '07:00-11:00',
    audience: 'weekday',
    text: '早上好，今天刚刚开始。',
  }),
}));

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows loading then welcome, greeting, actions, and home statistics', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
    expect(screen.getByText('早上好，今天刚刚开始。')).toBeInTheDocument();
    expect(screen.getAllByText('5/20').length).toBeGreaterThan(0);
    expect(screen.getByText('今日待复习')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '开始复习' })).toHaveAttribute('href', '#/review');
    expect(screen.getByRole('link', { name: '快速制卡' })).toHaveAttribute('href', '#/create');
  });

  it('shows daily target reached message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        due_count: 0,
        reviewed_today_count: 20,
        again_today_count: 2,
        good_today_count: 18,
        daily_review_limit: 20,
        is_daily_target_reached: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(await screen.findByText('今日复习目标已完成')).toBeInTheDocument();
  });

  it('shows API errors without greeting or fake counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('database unavailable');
    await waitFor(() => expect(screen.queryByText('今日待复习')).not.toBeInTheDocument());
    expect(screen.queryByText('欢迎回来')).not.toBeInTheDocument();
    expect(screen.queryByText('早上好，今天刚刚开始。')).not.toBeInTheDocument();
    expect(screen.queryByText('5/20')).not.toBeInTheDocument();
  });
});
