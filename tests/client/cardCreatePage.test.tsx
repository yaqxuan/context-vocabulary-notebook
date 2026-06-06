import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../src/client/i18n/I18nProvider';
import { CardCreatePage } from '../../src/client/pages/CardCreatePage';
import { MEDIA_SIZE_LIMITS_BYTES, NATIVE_LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../src/shared/constants';

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
      if (url === '/api/ai/suggestions') {
        return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.location.hash = '';
  });


  it('renders English chrome when settings API returns English interface language', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') {
        return Promise.resolve(jsonResponse({ interface_language: '英语', default_target_language: '英语', default_definition_language: '中文' }));
      }
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    expect(screen.getByRole('button', { name: 'Create card' })).toBeInTheDocument();
    expect(screen.getByLabelText('Target word')).toHaveAttribute('placeholder', 'e.g.: charge');
    expect(screen.getByText('Sentence')).toBeInTheDocument();
  });

  // Test 1: render
  it('renders create workspace without removed hero and idle suggestions copy', async () => {
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    expect(screen.getByRole('button', { name: '保存词义条目' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '捕捉一个真实语境' })).not.toBeInTheDocument();
    expect(screen.queryByText('Context capture')).not.toBeInTheDocument();
    expect(screen.queryByText(/把视频里遇到的词/)).not.toBeInTheDocument();
    expect(screen.queryByText('输入目标单词后，我会查找已有词义，帮你避免重复建卡。')).not.toBeInTheDocument();
    expect(screen.getByLabelText('目标单词')).toHaveAttribute('placeholder', '例如：charge');
    expect(screen.getByLabelText('学习语言')).toHaveValue('英语');
    expect(screen.getByLabelText('释义语言')).toHaveValue('中文');
    for (const label of ['学习语言', '释义语言']) {
      const select = screen.getByLabelText(label) as HTMLSelectElement;
      expect(Array.from(select.options).map((option) => option.textContent)).toEqual(
        SUPPORTED_LANGUAGES.map((language) => NATIVE_LANGUAGE_LABELS[language]),
      );
    }
    expect(screen.getByText('本地视频 mp4')).toBeInTheDocument();
    expect(screen.getByText('推荐')).toBeInTheDocument();
    expect(screen.queryByLabelText(/视频网址/)).not.toBeInTheDocument();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object)));
  });

  it('orders create fields as sentence, target word, then meaning', async () => {
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    const labels = screen.getAllByLabelText(/原句|目标单词|当前语境释义/);
    expect(labels.map((el) => el.getAttribute('aria-label'))).toEqual(['原句', '目标单词', '当前语境释义']);
  });

  it('shows ghost AI meaning suggestion and accepts it with Enter', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '在句中表示收取费用。' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('当前语境释义'), { key: 'Enter' });
    expect(screen.getByLabelText('当前语境释义')).toHaveValue('收费');
    expect(screen.getByLabelText('AI 建议')).toHaveValue('在句中表示收取费用。');
  });

  it('sends selected languages when requesting AI suggestions', async () => {
    let aiBody: Record<string, unknown> | null = null;
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        aiBody = JSON.parse(String(init?.body ?? '{}'));
        return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.any(Object)));
    await flushPromises();

    fireEvent.change(screen.getByLabelText('学习语言'), { target: { value: '日语' } });
    fireEvent.change(screen.getByLabelText('释义语言'), { target: { value: '英语' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: '彼は駅まで走った。' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: '走った' } });

    await waitFor(() => expect(aiBody).not.toBeNull());
    expect(aiBody).toMatchObject({
      target_language: '日语',
      definition_language: '英语',
    });
  });

  it('fills meaning when clicking the ghost AI meaning suggestion', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    fireEvent.click(await screen.findByRole('button', { name: 'AI 建议：收费' }));

    expect(screen.getByLabelText('当前语境释义')).toHaveValue('收费');
    expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();
  });

  it('clears ghost AI meaning suggestion with Backspace and shows none when there is no usage note', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('当前语境释义'), { key: 'Backspace' });
    expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();
  });

  it('does not show ghost AI meaning suggestion again after user types then clears meaning', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '租赁' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '' } });

    expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();
    expect(screen.getByLabelText('当前语境释义')).toHaveAttribute('placeholder', '例如：收费');
  });

  it('shows a new ghost AI meaning suggestion after rejecting one and changing sentence', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { sentence?: string };
        const second = body.sentence?.includes('extra') ?? false;
        return Promise.resolve(jsonResponse({
          status: 'success',
          meaning_suggestion: second ? '额外收费' : '收费',
          usage_note: '',
        }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('当前语境释义'), { key: 'Backspace' });
    expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });

    expect(await screen.findByText('AI 建议：额外收费')).toBeInTheDocument();
  });

  it('replaces an untouched AI-filled usage note when sentence changes', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { sentence?: string };
        const second = body.sentence?.includes('extra') ?? false;
        return Promise.resolve(jsonResponse({
          status: 'success',
          meaning_suggestion: second ? '额外收费' : '收费',
          usage_note: second ? '在新句中表示加收费用。' : '在原句中表示按晚收费。',
        }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByDisplayValue('在原句中表示按晚收费。')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });

    expect(screen.getByLabelText('AI 建议')).toHaveValue('');
    expect(await screen.findByDisplayValue('在新句中表示加收费用。')).toBeInTheDocument();
  });

  it('clears an old AI meaning ghost while a new request is pending after sentence changes', async () => {
    let aiCallCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') {
        aiCallCount += 1;
        if (aiCallCount === 1) {
          return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '' }));
        }
        return new Promise<Response>(() => undefined);
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });

    expect(await screen.findByText('AI 建议：收费')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });

    expect(screen.queryByText('AI 建议：收费')).not.toBeInTheDocument();
    expect(screen.getByLabelText('AI 建议')).toHaveAttribute('placeholder', 'AI 建议生成中…');
  });

  // Test 2: required field validation
  it('requires target word, meaning, and sentence for new card mode while video stays optional', async () => {
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.click(screen.getByRole('button', { name: '保存词义条目' }));

    expect(await screen.findByText('目标单词必填')).toBeInTheDocument();
    expect(screen.getByText('当前语境释义必填')).toBeInTheDocument();
    expect(screen.getByText('原句必填')).toBeInTheDocument();
    expect(screen.queryByText('请上传本地 mp4 视频')).not.toBeInTheDocument();
  });

  // Test 3: media file type validation
  it('rejects unsupported media file types before saving', async () => {
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'Charge ' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: ' 收费 ' } });

    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    expect(screen.getByText('查找已有词义，避免重复建卡')).toBeInTheDocument();
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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/settings', expect.any(Object)));
    await flushPromises();

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('学习语言'), { target: { value: '日语' } });
    fireEvent.change(screen.getByLabelText('释义语言'), { target: { value: '英语' } });
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
      target_language: '日语',
      definition_language: '英语',
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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    await waitFor(() => expect(screen.getByLabelText('学习语言')).toHaveValue('日语'));
    expect(screen.getByLabelText('释义语言')).toHaveValue('英语');
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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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
      fsrs: { due_date: 'now', stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    await screen.findByDisplayValue('charge');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/cards/card-1', expect.any(Object)));
    await flushPromises();
    // Expectation removed because I18nProvider fetches settings on mount
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
      fsrs: { due_date: 'now', stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0, last_reviewed_at: null },
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

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

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
    fireEvent.change(screen.getByLabelText('AI 建议'), { target: { value: 'S01E02' } });
    fireEvent.click(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => expect(window.location.hash).toBe('#/cards/card-1'));
    const cardRequest = requests.find((r) => r.url === '/api/cards' && r.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      card_id: 'card-1',
      sentence: 'They charge extra for breakfast.',
      note: 'S01E02',
    }));
  });


  it('creates an inline tag and submits it when creating a new card', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/tags' && init?.method === 'POST') return Promise.resolve(jsonResponse({ id: 'tag-1', name: '电影', created_at: 'now', updated_at: 'now' }, 201));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards' && init?.method === 'POST') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    // Fill form
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'test sentence' } });

    // Create inline tag
    fireEvent.change(await screen.findByLabelText('新增标签名称'), { target: { value: '电影' } });
    fireEvent.click(screen.getByRole('button', { name: '新增并选中标签' }));

    // Wait for the tag to appear as a selected button
    expect(await screen.findByRole('button', { name: '电影' })).toHaveClass('selected');

    // Submit the form
    fireEvent.submit(screen.getByRole('button', { name: '保存词义条目' }));

    // Verify tag POST
    await waitFor(() => expect(requests.some((req) => req.url === '/api/tags' && req.method === 'POST' && req.body === JSON.stringify({ name: '电影' }))).toBe(true));

    // Verify cards POST includes tag_ids
    await waitFor(() => {
      const cardReq = requests.find((req) => req.url === '/api/cards' && req.method === 'POST');
      expect(cardReq).toBeTruthy();
      expect(JSON.parse(cardReq!.body as string)).toMatchObject({
        target_word: 'charge',
        context_meaning: '收费',
        sentence: 'test sentence',
        tag_ids: ['tag-1'],
      });
    });
  });

  it('explicit append mode preselects tags and sends PATCH only when changed', async () => {
    window.location.hash = '#/create?card_id=card-1';
    const detail = {
      id: 'card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      tags: [{ id: 'tag-1', name: '美剧' }],
    };
    
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/cards/card-1' && (!init?.method || init.method === 'GET')) return Promise.resolve(jsonResponse(detail));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧' }, { id: 'tag-2', name: '电影' }]));
      if (url === '/api/cards' && init?.method === 'POST') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ok: true }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    expect(await screen.findByDisplayValue('charge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('收费')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '美剧' })).toHaveClass('selected');

    // Add tag-2
    fireEvent.click(await screen.findByRole('button', { name: '电影' }));

    // Add sentence
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'another sentence' } });

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: '添加为新语境' }));

    // Wait for the append POST and tag PATCH
    await waitFor(() => {
      const cardReq = requests.find((req) => req.url === '/api/cards' && req.method === 'POST');
      expect(cardReq).toBeTruthy();
      expect(JSON.parse(cardReq!.body as string)).toEqual({
        card_id: 'card-1',
        sentence: 'another sentence',
      });
      
      const patchReq = requests.find((req) => req.url === '/api/cards/card-1' && req.method === 'PATCH');
      expect(patchReq).toBeTruthy();
      expect(JSON.parse(patchReq!.body as string)).toEqual({
        tag_ids: ['tag-1', 'tag-2'],
      });
    });
  });

  it('explicit append mode with unchanged tags does not PATCH', async () => {
    window.location.hash = '#/create?card_id=card-1';
    const detail = {
      id: 'card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      tags: [{ id: 'tag-1', name: '美剧' }],
    };

    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/cards/card-1' && (!init?.method || init.method === 'GET')) return Promise.resolve(jsonResponse(detail));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧' }, { id: 'tag-2', name: '电影' }]));
      if (url === '/api/cards' && init?.method === 'POST') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ok: true }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    expect(await screen.findByDisplayValue('charge')).toBeInTheDocument();

    // Add sentence only (tags unchanged)
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'another sentence' } });

    // Submit
    fireEvent.submit(screen.getByRole('button', { name: '添加为新语境' }));

    // Wait for the append POST and ensure NO tag PATCH
    await waitFor(() => {
      const cardReq = requests.find((req) => req.url === '/api/cards' && req.method === 'POST');
      expect(cardReq).toBeTruthy();
    });

    // Check no patch occurred
    const patchReq = requests.find((req) => req.url === '/api/cards/card-1' && req.method === 'PATCH');
    expect(patchReq).toBeUndefined();
  });

  it('exact match mode fetches existing card details and preselects its tags', async () => {
    const detail = {
      id: 'card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      tags: [{ id: 'tag-1', name: '美剧' }],
    };
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/cards/suggestions?target_word=charge')) return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      if (url === '/api/cards/card-1') return Promise.resolve(jsonResponse(detail));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧' }, { id: 'tag-2', name: '电影' }]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });

    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    await waitFor(() => expect(requests.some((request) => request.url === '/api/cards/card-1' && request.method === 'GET')).toBe(true));
    expect(await screen.findByRole('button', { name: '美剧' })).toHaveClass('selected');
    expect(screen.getByRole('button', { name: '电影' })).not.toHaveClass('selected');
  });

  it('exact match mode patches tags when changed during append submit', async () => {
    const detail = {
      id: 'card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      tags: [{ id: 'tag-1', name: '美剧' }],
    };
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/cards/suggestions?target_word=charge')) return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      if (url === '/api/cards/card-1' && (!init?.method || init.method === 'GET')) return Promise.resolve(jsonResponse(detail));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ok: true }));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧' }, { id: 'tag-2', name: '电影' }]));
      if (url === '/api/cards' && init?.method === 'POST') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '电影' }));
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.submit(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => {
      const cardReq = requests.find((req) => req.url === '/api/cards' && req.method === 'POST');
      expect(cardReq).toBeTruthy();
      expect(JSON.parse(cardReq!.body as string)).toEqual({
        card_id: 'card-1',
        sentence: 'They charge extra for breakfast.',
      });
      const patchReq = requests.find((req) => req.url === '/api/cards/card-1' && req.method === 'PATCH');
      expect(patchReq).toBeTruthy();
      expect(JSON.parse(patchReq!.body as string)).toEqual({ tag_ids: ['tag-1', 'tag-2'] });
    });
  });

  it('exact match mode with unchanged tags does not PATCH', async () => {
    const detail = {
      id: 'card-1',
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '英语',
      definition_language: '中文',
      tags: [{ id: 'tag-1', name: '美剧' }],
    };
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url.startsWith('/api/cards/suggestions?target_word=charge')) return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      if (url === '/api/cards/card-1' && (!init?.method || init.method === 'GET')) return Promise.resolve(jsonResponse(detail));
      if (url === '/api/cards/card-1' && init?.method === 'PATCH') return Promise.resolve(jsonResponse({ ok: true }));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧' }, { id: 'tag-2', name: '电影' }]));
      if (url === '/api/cards' && init?.method === 'POST') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: 'No active AI config' }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    expect(await screen.findByText('已找到相同词义：charge = 收费')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.submit(screen.getByRole('button', { name: '添加为新语境' }));

    await waitFor(() => expect(requests.some((req) => req.url === '/api/cards' && req.method === 'POST')).toBe(true));
    expect(requests.find((req) => req.url === '/api/cards/card-1' && req.method === 'PATCH')).toBeUndefined();
  });


  it('keeps transcribe disabled when no video is selected', async () => {
    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    expect(screen.getByRole('button', { name: '转文字' })).toBeDisabled();
  });

  it('shows transcript panel after successful video transcription', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') return Promise.resolve(jsonResponse({ status: 'success', text: 'They charge extra for breakfast.', segments: [], language: 'en' }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));

    expect(await screen.findByLabelText('转写文本')).toHaveValue('They charge extra for breakfast.');
    expect(screen.getByText('音频可能会发送到已配置的转写服务商处理，并可能产生费用。')).toBeInTheDocument();
  });

  it('sends ISO language code in transcription FormData', async () => {
    const transcriptionBodies: FormData[] = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') {
        transcriptionBodies.push(init?.body as FormData);
        return Promise.resolve(jsonResponse({ status: 'success', text: '彼は駅まで走った。', segments: [], language: 'ja' }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    fireEvent.change(screen.getByLabelText('学习语言'), { target: { value: '日语' } });
    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));

    await waitFor(() => expect(transcriptionBodies).toHaveLength(1));
    expect(transcriptionBodies[0].get('target_language')).toBe('ja');
    expect(transcriptionBodies[0].get('file')).toBeInstanceOf(File);
  });

  it('ignores stale transcription result after clearing selected video', async () => {
    let resolveTranscription: ((response: Response) => void) | null = null;
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') {
        return new Promise<Response>((resolve) => {
          resolveTranscription = resolve;
        });
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    const input = screen.getByLabelText('上传本地视频');
    fireEvent.change(input, { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));
    expect(await screen.findByRole('button', { name: '转写中…' })).toBeDisabled();

    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByLabelText('转写文本')).not.toBeInTheDocument();

    act(() => {
      resolveTranscription?.(jsonResponse({ status: 'success', text: 'Stale transcript.', segments: [], language: 'en' }));
    });
    await flushPromises();

    expect(screen.queryByLabelText('转写文本')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '转文字' })).toBeDisabled();
  });

  it('ignores stale transcription result after changing selected video', async () => {
    const resolvers: Array<(response: Response) => void> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') {
        return new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        });
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    const input = screen.getByLabelText('上传本地视频');
    fireEvent.change(input, { target: { files: [file('old.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));
    await waitFor(() => expect(resolvers).toHaveLength(1));

    fireEvent.change(input, { target: { files: [file('new.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));
    await waitFor(() => expect(resolvers).toHaveLength(2));

    act(() => {
      resolvers[0](jsonResponse({ status: 'success', text: 'Old transcript.', segments: [], language: 'en' }));
    });
    await flushPromises();
    expect(screen.queryByLabelText('转写文本')).not.toBeInTheDocument();

    act(() => {
      resolvers[1](jsonResponse({ status: 'success', text: 'New transcript.', segments: [], language: 'en' }));
    });

    expect(await screen.findByLabelText('转写文本')).toHaveValue('New transcript.');
  });

  it('copies transcript into sentence through use-as-sentence action', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') return Promise.resolve(jsonResponse({ status: 'success', text: 'They charge extra for breakfast.', segments: [] }));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'Old sentence.' } });
    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));
    await screen.findByLabelText('转写文本');

    fireEvent.click(screen.getByRole('button', { name: '使用为例句' }));

    expect(screen.getByLabelText('原句')).toHaveValue('They charge extra for breakfast.');
  });

  it('shows transcription failure and preserves current form values', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/transcriptions') return Promise.reject(new Error('provider unavailable'));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);

    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'charge' } });
    fireEvent.change(screen.getByLabelText('当前语境释义'), { target: { value: '收费' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'Existing sentence.' } });
    fireEvent.change(screen.getByLabelText('上传本地视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '转文字' }));

    expect(await screen.findByText('provider unavailable')).toBeInTheDocument();
    expect(screen.getByLabelText('目标单词')).toHaveValue('charge');
    expect(screen.getByLabelText('当前语境释义')).toHaveValue('收费');
    expect(screen.getByLabelText('原句')).toHaveValue('Existing sentence.');
  });

  it('calls spelling check only when the user clicks the spelling button', async () => {
    let spellingBody: Record<string, unknown> | null = null;
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/ai/spelling-check') {
        spellingBody = JSON.parse(String(init?.body ?? '{}'));
        return Promise.resolve(jsonResponse({ status: 'success', issues: [{ original: 'Hte', suggestion: 'The' }] }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    fireEvent.change(screen.getByLabelText('学习语言'), { target: { value: '英语' } });
    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'Hte hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'hotel' } });

    expect(spellingBody).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'AI 检查拼写' }));

    await waitFor(() => expect(spellingBody).toEqual({
      target_word: 'hotel',
      sentence: 'Hte hotel charges $100 per night.',
      target_language: '英语',
    }));
    await screen.findByText('The');
    expect(screen.getAllByText('Hte').some((element) => element.classList.contains('card-create-spelling-highlight'))).toBe(true);
    expect(screen.getByText('The')).toBeInTheDocument();
  });

  it('accepts one spelling suggestion and replaces only that word', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/ai/spelling-check') {
        return Promise.resolve(jsonResponse({ status: 'success', issues: [{ original: 'Hte', suggestion: 'The' }] }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'Hte hotel charges hte fee.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'hotel' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 检查拼写' }));

    await screen.findByText('The');
    fireEvent.click(screen.getByRole('button', { name: '接受 Hte → The' }));

    expect(screen.getByLabelText('原句')).toHaveValue('The hotel charges hte fee.');
    expect(screen.queryByText('The')).not.toBeInTheDocument();
  });

  it('does not display spelling suggestions for the target word', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/ai/spelling-check') {
        return Promise.resolve(jsonResponse({ status: 'success', issues: [{ original: 'hotel', suggestion: 'hostel' }] }));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'The hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'hotel' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 检查拼写' }));

    expect(await screen.findByText('未发现拼写错误')).toBeInTheDocument();
    expect(screen.queryByText('hostel')).not.toBeInTheDocument();
  });

  it('shows retryable spelling check error', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith('/api/tags')) return Promise.resolve(jsonResponse([]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'none', meaning_suggestion: '', usage_note: '', message: '' }));
      if (url === '/api/ai/spelling-check') return Promise.reject(new Error('network down'));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(<I18nProvider><CardCreatePage /></I18nProvider>);
    await flushPromises();

    fireEvent.change(screen.getByLabelText('原句'), { target: { value: 'Hte hotel charges $100 per night.' } });
    fireEvent.change(screen.getByLabelText('目标单词'), { target: { value: 'hotel' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 检查拼写' }));

    expect(await screen.findByText('拼写检查失败，请重试')).toBeInTheDocument();
  });

});
