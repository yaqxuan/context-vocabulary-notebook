import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../src/client/pages/HomePage';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';

vi.mock('../../src/client/lib/homeGreetings', () => ({
  getHomeGreeting: vi.fn().mockReturnValue({
    date: '2026-06-01',
    bucket: '07:00-11:00',
    audience: 'shared',
    text: '阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。',
    translation: 'Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.',
  }),
  getHomeGreetingText: vi.fn((greeting, language) => {
    if (language === '中文') return greeting.text;
    if (language === '英语') return greeting.translation;
    if (language === '韩语') return '아침에 단어장을 열면 새로운 말들이 하루를 밝게 합니다.';
    if (language === '日语') return '朝の時間に単語帳を開けば、新しい言葉が一日を明るくします。';
    return greeting.translation;
  }),
}));

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows bilingual greeting, selected languages, actions, and metric values without removed helper modules', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
    expect(screen.getByText('学习语言')).toBeInTheDocument();
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getByText('释义语言')).toBeInTheDocument();
    expect(screen.getAllByText('中文').length).toBeGreaterThan(0);
    expect(screen.getByText('阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。')).toBeInTheDocument();
    expect(screen.getByText('Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.')).toBeInTheDocument();
    expect(document.querySelector('.home-content-stack')).toContainElement(screen.getByLabelText('首页统计'));
    expect(screen.getAllByText('5/20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('今日待复习').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '开始复习' })).toHaveAttribute('href', '#/review');
    expect(screen.getByRole('link', { name: '快速制卡' })).toHaveAttribute('href', '#/create');
    expect(screen.queryByText('LOCAL GREETING')).not.toBeInTheDocument();
    expect(screen.queryByText('today progress')).not.toBeInTheDocument();
    expect(screen.queryByText(/问候语来自本地时间段/)).not.toBeInTheDocument();
    expect(screen.queryByText('按 FSRS 到期排序')).not.toBeInTheDocument();
    expect(screen.queryByText('每日目标是提醒，不是硬限制')).not.toBeInTheDocument();
    expect(screen.queryByText('今天不熟或答错')).not.toBeInTheDocument();
    expect(screen.queryByText('今天顺利想起')).not.toBeInTheDocument();
    expect(screen.queryByText('soft goal')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '先处理到期，再继续积累。' })).not.toBeInTheDocument();
    expect(screen.queryByText('先看待复习数量，再用 Good / Again 判断今天的复习节奏。')).not.toBeInTheDocument();
  });

  it('renders greeting body in target and definition languages', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '中文', default_target_language: '韩语', default_definition_language: '日语' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    expect((await screen.findAllByText('한국어')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('日本語').length).toBeGreaterThan(0);
    expect(screen.getByText('아침에 단어장을 열면 새로운 말들이 하루를 밝게 합니다.')).toBeInTheDocument();
    expect(screen.getByText('朝の時間に単語帳を開けば、新しい言葉が一日を明るくします。')).toBeInTheDocument();
    expect(screen.queryByText('阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。')).not.toBeInTheDocument();
    expect(screen.queryByText('Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.')).not.toBeInTheDocument();
  });

  it('does not show the removed soft-goal card when daily target is reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '中文' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({
        due_count: 0,
        reviewed_today_count: 20,
        again_today_count: 2,
        good_today_count: 18,
        daily_review_limit: 20,
        is_daily_target_reached: true,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
    expect(screen.queryByText('今日复习目标已完成')).not.toBeInTheDocument();
    expect(screen.queryByText('soft goal')).not.toBeInTheDocument();
  });

  it('shows API errors without greeting or fake counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '中文' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({ error: 'database unavailable' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    expect(await screen.findByRole('alert')).toHaveTextContent('database unavailable');
    await waitFor(() => expect(screen.queryByText('今日待复习')).not.toBeInTheDocument());
    expect(screen.queryByText('欢迎回来')).not.toBeInTheDocument();
    expect(screen.queryByText('阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。')).not.toBeInTheDocument();
    expect(screen.queryByText('Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.')).not.toBeInTheDocument();
    expect(screen.queryByText('5/20')).not.toBeInTheDocument();
  });

  it('renders interface language switcher at the top right and saves selection', async () => {
    let patchBody: unknown = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings' && init?.method === 'PATCH') {
        patchBody = JSON.parse(init.body as string);
        return Promise.resolve(new Response(JSON.stringify({ interface_language: '英语', default_target_language: '英语', default_definition_language: '中文' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '中文', default_target_language: '英语', default_definition_language: '中文' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    const selector = await screen.findByLabelText('界面语言') as HTMLSelectElement;
    expect(selector.closest('.home-interface-language')).toHaveClass('home-interface-language--top-right');
    expect(selector.value).toBe('中文');

    fireEvent.change(selector, { target: { value: '英语' } });

    await waitFor(() => expect(patchBody).toMatchObject({ interface_language: '英语' }));
    expect(await screen.findByRole('link', { name: 'Start review' })).toBeInTheDocument();
  });

  it('renders English UI chrome when interface language is English', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) === '/api/settings') return Promise.resolve(new Response(JSON.stringify({ interface_language: '英语' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({
        due_count: 3,
        reviewed_today_count: 5,
        again_today_count: 1,
        good_today_count: 4,
        daily_review_limit: 20,
        is_daily_target_reached: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    render(<I18nProvider><HomePage /></I18nProvider>);

    expect(await screen.findByRole('link', { name: 'Start review' })).toBeInTheDocument();
    expect(screen.getAllByText('Due today').length).toBeGreaterThan(0);
  });
});