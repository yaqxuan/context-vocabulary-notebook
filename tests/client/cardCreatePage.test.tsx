import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardCreatePage } from '../../src/client/pages/CardCreatePage';
import { MEDIA_SIZE_LIMITS_BYTES } from '../../src/shared/constants';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function file(name: string, type: string, size = 6): File {
  const sample = new File(['sample'], name, { type });
  Object.defineProperty(sample, 'size', { value: size });
  return sample;
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('CardCreatePage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  // Test 1: render
  it('renders a polished create workspace with default languages and recommended optional video', async () => {
    render(<CardCreatePage />);

    expect(screen.getByRole('heading', { name: '捕捉一个真实语境' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标单词')).toHaveAttribute('placeholder', '例如：charge');
    expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
    expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
    expect(screen.getByText('推荐')).toBeInTheDocument();
    expect(screen.queryByLabelText(/视频网址/)).not.toBeInTheDocument();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object)));
  });

  // Test 2: required field validation
  it('requires target word, meaning, and sentence for new card mode while video stays optional', async () => {
    render(<CardCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    expect(await screen.findByText('目标单词必填')).toBeInTheDocument();
    expect(screen.getByText('当前语境释义必填')).toBeInTheDocument();
    expect(screen.getByText('原句必填')).toBeInTheDocument();
    expect(screen.queryByText('请上传本地 mp4 视频')).not.toBeInTheDocument();
  });

  // Test 3: media file type validation
  it('rejects unsupported media file types before saving', async () => {
    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('上传本地视频'), {
      target: { files: [file('clip.mov', 'video/quicktime')] },
    });
    fireEvent.change(screen.getByLabelText('上传截图'), {
      target: { files: [file('poster.gif', 'image/gif')] },
    });
    fireEvent.change(screen.getByLabelText('上传音频'), {
      target: { files: [file('line.wav', 'audio/wav')] },
    });

    expect(await screen.findByText('仅支持 mp4 本地视频文件')).toBeInTheDocument();
    expect(screen.getByText('仅支持 jpg、png 或 webp 截图')).toBeInTheDocument();
    expect(screen.getByText('仅支持 mp3 音频文件')).toBeInTheDocument();
  });

  // Test 3b: media file size validation
  it('rejects media files that exceed size limits', async () => {
    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('上传本地视频'), {
      target: { files: [file('huge.mp4', 'video/mp4', MEDIA_SIZE_LIMITS_BYTES.video + 1)] },
    });
    fireEvent.change(screen.getByLabelText('上传截图'), {
      target: { files: [file('huge.png', 'image/png', MEDIA_SIZE_LIMITS_BYTES.image + 1)] },
    });
    fireEvent.change(screen.getByLabelText('上传音频'), {
      target: { files: [file('huge.mp3', 'audio/mpeg', MEDIA_SIZE_LIMITS_BYTES.audio + 1)] },
    });

    expect(await screen.findByText('视频不能超过 300MB')).toBeInTheDocument();
    expect(screen.getByText('图片不能超过 10MB')).toBeInTheDocument();
    expect(screen.getByText('音频不能超过 50MB')).toBeInTheDocument();
  });

  // Test 4: exact match forces append-to-existing mode
  it('uses exact target and meaning match to force append-to-existing mode', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) {
        return Promise.resolve(jsonResponse([
          { id: 'card-1', target_word: 'charge', context_meaning: '收费' },
          { id: 'card-2', target_word: 'charge', context_meaning: '指控' },
        ]));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'Charge ' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: ' 收费 ' } });

    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加为新语境' })).toBeInTheDocument();
    expect(screen.queryByText('创建新的词义条目')).not.toBeInTheDocument();
    expect(screen.getByText('不同语义，仅供参考')).toBeInTheDocument();
  });

  // Test 5: no exact match – create-new remains available
  it('keeps create-new available when same word exists but meaning does not match', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) {
        return Promise.resolve(jsonResponse([
          { id: 'card-1', target_word: 'charge', context_meaning: '收费' },
          { id: 'card-2', target_word: 'charge', context_meaning: '指控' },
        ]));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '租赁' } });

    expect(await screen.findByText('未找到相同词义')).toBeInTheDocument();
    expect(screen.getByText('创建新的词义条目')).toBeInTheDocument();
    expect(screen.getAllByText('不同语义，仅供参考')).toHaveLength(2);
  });

  // Test 6: suggestion error still allows new card creation
  it('shows suggestion error while still allowing new card creation', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.reject(new Error('network'));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('已有词义加载失败，可以继续创建新条目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存词义条目' })).toBeInTheDocument();
  });

  // Test 7: new card save with media
  it('creates a new card then uploads selected optional media', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-1', card_id: 'card-1', sentence: 'The hotel charges $100 per night.', note: null, is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' },
        }, 201));
      }
      if (url === '/api/media') return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.change(screen.getByLabelText('上传截图'), { target: { files: [file('shot.png', 'image/png')] } });
    fireEvent.change(screen.getByLabelText('上传音频'), { target: { files: [file('line.mp3', 'audio/mpeg')] } });
    fireEvent.click(await screen.findByRole('button', { name: '美剧' }));
    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((r) => r.url === '/api/cards' && r.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      sentence: 'The hotel charges $100 per night.',
      tag_ids: ['tag-1'],
    }));
    expect(requests.filter((r) => r.url === '/api/media' && r.method === 'POST')).toHaveLength(3);
  });

  // Test 8: new card save without media
  it('creates a new card without requiring any media files', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-2', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-2', card_id: 'card-2', sentence: 'The hotel charges $100 per night.', note: null, is_primary: 1, sort_order: 10, created_at: 'now', updated_at: 'now' },
        }, 201));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-2'));
    expect(requests.filter((r) => r.url === '/api/media')).toHaveLength(0);
  });

  // Test 9: append-to-existing card save
  it('adds a new context to an existing card without requiring video', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-2', card_id: 'card-1', sentence: 'They charge extra for breakfast.', note: null, is_primary: 0, sort_order: 20, created_at: 'now', updated_at: 'now' },
        }, 201));
      }
      if (url === '/api/media') return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.click(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((r) => r.url === '/api/cards' && r.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      card_id: 'card-1',
      sentence: 'They charge extra for breakfast.',
    }));
    expect(requests.filter((r) => r.url === '/api/media' && r.method === 'POST')).toHaveLength(0);
  });

  // Test 10: settings default languages applied in new-card mode
  it('applies settings default languages for new-card mode', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/settings') return Promise.resolve(jsonResponse({
        id: 1, interface_language: '中文', created_at: 'now', updated_at: 'now',
        default_target_language: '日语',
        default_definition_language: '英文',
        daily_review_limit: 20,
      }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    await waitFor(() => expect(screen.getByLabelText('学习语言')).toHaveValue('日语'));
    expect(screen.getByLabelText('释义语言')).toHaveValue('英文');
  });

  // Test 11: settings fetch failure falls back to defaults
  it('falls back to default languages when settings fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ error: 'fail' }, 500));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.any(Object)));
    await flushPromises();
    expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
    expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
  });

  // Test 12: explicit append mode keeps card languages, ignores settings
  it('explicit append mode keeps card languages not settings defaults', async () => {
    window.location.hash = '#/create?card_id=card-1';

    const cardDetail = {
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
      context_count: 1,
      tags: [],
      contexts: [],
      media: [],
      fsrs: { due_date: 'now', stability: 1, difficulty: 5, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
    };

    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/settings') return Promise.resolve(jsonResponse({
        id: 1, interface_language: '中文', created_at: 'now', updated_at: 'now',
        default_target_language: '日语',
        default_definition_language: '英文',
        daily_review_limit: 20,
      }));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(cardDetail));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    await screen.findByDisplayValue('charge');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.any(Object)));
    await flushPromises();
    expect(vi.mocked(globalThis.fetch).mock.calls.some(([input]) => String(input) === '/api/settings')).toBe(false);
    expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
    expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
  });

  // Test 13: explicit append mode via hash query card_id
  it('loads existing card from hash card_id, disables word/meaning, skips suggestions, posts append body', async () => {
    window.location.hash = '#/create?card_id=card-1';

    const cardDetail = {
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
      context_count: 1,
      tags: [],
      contexts: [],
      media: [],
      fsrs: { due_date: 'now', stability: 1, difficulty: 5, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
    };

    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(cardDetail));
      if (url === '/api/cards') {
        return Promise.resolve(jsonResponse({
          card: { id: 'card-1', target_word: 'charge', context_meaning: '收费', target_language: '英语', definition_language: '中文', status: 'reviewing', is_favorite: 0, created_at: 'now', updated_at: 'now' },
          context: { id: 'ctx-3', card_id: 'card-1', sentence: 'They charge extra for breakfast.', note: 'S01E02', is_primary: 0, sort_order: 30, created_at: 'now', updated_at: 'now' },
        }, 201));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<CardCreatePage />);

    // Word and meaning loaded and disabled
    await screen.findByDisplayValue('charge');
    expect(screen.getByLabelText('目标单词')).toBeDisabled();
    expect(screen.getByLabelText('当前语境释义')).toBeDisabled();

    // Explicit append notice shown in sidebar
    expect(screen.getByText('正在为已有词义添加语境：charge = 收费')).toBeInTheDocument();

    // No suggestions calls
    expect(requests.some((r) => r.url.includes('/api/cards/suggestions'))).toBe(false);

    // Fill sentence and note, submit
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: 'S01E02' } });
    fireEvent.click(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((r) => r.url === '/api/cards' && r.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      card_id: 'card-1',
      sentence: 'They charge extra for breakfast.',
      note: 'S01E02',
    }));
  });
});
