import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../src/client/i18n/I18nProvider';
import { BatchClipImportPage } from '../../src/client/pages/BatchClipImportPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function file(name: string, type: string, size = 6): File {
  const sample = new File(['sample'], name, { type });
  Object.defineProperty(sample, 'size', { value: size });
  return sample;
}

function readyReadiness() {
  return {
    ffmpeg: { ready: true, message: 'ffmpeg is ready' },
    stt: { provider: 'whisper.cpp', ready: true, executablePath: '/bin/whisper-cli', modelPath: '/models/ggml.bin', message: 'whisper.cpp executable and model are ready' },
    ocr: { provider: 'tesseract', ready: true, executablePath: '/bin/tesseract', language: 'eng', message: 'Tesseract OCR is ready' },
  };
}

function renderPage() {
  return render(<I18nProvider><BatchClipImportPage /></I18nProvider>);
}

describe('BatchClipImportPage', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '美剧', created_at: 'now', updated_at: 'now' }]));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ ok: true }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders local recognition readiness and missing messages', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse({
        ffmpeg: { ready: true, message: 'ffmpeg is ready' },
        stt: { provider: 'whisper.cpp', ready: false, executablePath: '/bin/whisper-cli', modelPath: '/missing/model.bin', message: 'whisper.cpp model is not readable at /missing/model.bin' },
        ocr: { provider: 'disabled', ready: false, executablePath: '/bin/tesseract', language: 'eng', message: 'Local OCR is disabled' },
      }));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    renderPage();

    const panel = await screen.findByLabelText('本地识别状态');
    expect(within(panel).getByText('FFmpeg · 可用')).toBeInTheDocument();
    expect(within(panel).getByText('本地 STT whisper.cpp · 缺失')).toBeInTheDocument();
    expect(within(panel).getByText('whisper.cpp model is not readable at /missing/model.bin')).toBeInTheDocument();
    expect(within(panel).getByText('本地 OCR Tesseract · 已关闭')).toBeInTheDocument();
    expect(within(panel).getByText(/OCR\/STT 在本机运行/)).toBeInTheDocument();
  });

  it('queues only MP4 files and reports non-MP4 files', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), {
      target: { files: [file('one.mp4', 'video/mp4'), file('bad.mov', 'video/quicktime')] },
    });

    expect(await screen.findByText('one.mp4')).toBeInTheDocument();
    expect(screen.getByText('仅支持 MP4 视频：bad.mov')).toBeInTheDocument();
    expect(screen.queryByText('bad.mov')).not.toBeInTheDocument();
    expect(screen.getAllByText(/OCR\/STT 在本机运行/).length).toBeGreaterThan(0);
  });

  it('processes queued clips sequentially without auto-selecting or auto-suggesting meaning', async () => {
    const analysisBodies: FormData[] = [];
    const suggestionBodies: unknown[] = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url === '/api/clip-analysis') {
        analysisBodies.push(init?.body as FormData);
        const uploaded = (init?.body as FormData).get('file') as File;
        if (uploaded.name === 'bad.mp4') return Promise.reject(new Error('provider down'));
        return Promise.resolve(jsonResponse({
          status: 'success',
          sentence: { source: 'audio_stt', status: 'success', text: 'They charge extra for breakfast.', confidence: 'high' },
          candidates: [{ target_word: 'charge', reason: 'verb in context', difficulty_hint: 'B1' }],
          note: 'audio clearer than subtitles',
        }));
      }
      if (url === '/api/ai/suggestions') {
        suggestionBodies.push(JSON.parse(String(init?.body)));
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '这里表示收取额外费用。', sentence_translation: '他们早餐额外收费。' }));
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), {
      target: { files: [file('ok.mp4', 'video/mp4'), file('bad.mp4', 'video/mp4')] },
    });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));

    await waitFor(() => expect(analysisBodies).toHaveLength(2));
    expect((analysisBodies[0].get('file') as File).name).toBe('ok.mp4');
    expect((analysisBodies[1].get('file') as File).name).toBe('bad.mp4');
    expect(analysisBodies[0].get('target_language')).toBe('英语');
    expect(await screen.findByDisplayValue('They charge extra for breakfast.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'charge · B1' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标单词 ok.mp4')).toHaveValue('');
    expect(screen.getByLabelText('当前语境释义 ok.mp4')).toHaveValue('');
    expect(screen.getByLabelText('AI 建议 ok.mp4')).toHaveValue('');
    expect(suggestionBodies).toEqual([]);
    expect(screen.getByText('来源：audio_stt · 置信度：high')).toBeInTheDocument();
    expect(screen.getByText('audio clearer than subtitles')).toBeInTheDocument();
    expect(screen.getByText('provider down')).toBeInTheDocument();
  });

  it('auto-suggests after candidate selection but ignores stale suggestion responses', async () => {
    const suggestionResolvers: Array<(response: Response) => void> = [];
    const suggestionBodies: unknown[] = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url === '/api/clip-analysis') return Promise.resolve(jsonResponse({
        status: 'success',
        sentence: { source: 'audio_stt', status: 'success', text: 'They charge extra.', confidence: 'medium' },
        candidates: [
          { target_word: 'charge', reason: 'candidate', difficulty_hint: 'B1' },
          { target_word: 'extra', reason: 'candidate', difficulty_hint: 'A2' },
        ],
      }));
      if (url === '/api/ai/suggestions') {
        suggestionBodies.push(JSON.parse(String(init?.body)));
        return new Promise<Response>((resolve) => { suggestionResolvers.push(resolve); });
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));

    fireEvent.click(await screen.findByRole('button', { name: 'charge · B1' }));
    fireEvent.click(screen.getByRole('button', { name: 'extra · A2' }));
    await waitFor(() => expect(suggestionBodies).toHaveLength(2));

    suggestionResolvers[1](jsonResponse({ status: 'success', meaning_suggestion: '额外的', usage_note: '这里表示附加的。', sentence_translation: '他们额外收费。' }));
    expect(await screen.findByDisplayValue('额外的')).toBeInTheDocument();
    expect(screen.getByDisplayValue('这里表示附加的。')).toBeInTheDocument();
    expect(screen.getByText('他们额外收费。')).toBeInTheDocument();

    suggestionResolvers[0](jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '这里表示收取额外费用。', sentence_translation: '他们早餐额外收费。' }));
    await waitFor(() => expect(screen.getByLabelText('目标单词 clip.mp4')).toHaveValue('extra'));
    expect(screen.queryByDisplayValue('收费')).not.toBeInTheDocument();
  });

  it('continues analyzing later clips without starting AI suggestions during analysis', async () => {
    const analysisBodies: FormData[] = [];
    const suggestionBodies: unknown[] = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url === '/api/clip-analysis') {
        analysisBodies.push(init?.body as FormData);
        const uploaded = (init?.body as FormData).get('file') as File;
        return Promise.resolve(jsonResponse({
          status: 'success',
          sentence: { source: 'audio_stt', status: 'success', text: `${uploaded.name} sentence.`, confidence: 'medium' },
          candidates: [{ target_word: 'sentence', reason: 'candidate', difficulty_hint: 'B1' }],
        }));
      }
      if (url === '/api/ai/suggestions') {
        suggestionBodies.push(JSON.parse(String(init?.body)));
        return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '句子', usage_note: '用法。', sentence_translation: '句子。' }));
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), { target: { files: [file('one.mp4', 'video/mp4'), file('two.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));

    await waitFor(() => expect(analysisBodies).toHaveLength(2));
    expect(await screen.findByDisplayValue('one.mp4 sentence.')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('two.mp4 sentence.')).toBeInTheDocument();
    expect(suggestionBodies).toEqual([]);
  });

  it('keeps analyzed clips editable when candidate-triggered meaning suggestion fails', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url === '/api/clip-analysis') return Promise.resolve(jsonResponse({
        status: 'success',
        sentence: { source: 'audio_stt', status: 'success', text: 'They charge extra.', confidence: 'medium' },
        candidates: [{ target_word: 'charge', reason: 'candidate', difficulty_hint: 'B1' }],
      }));
      if (url === '/api/ai/suggestions') return Promise.reject(new Error('AI timeout'));
      return Promise.resolve(jsonResponse([]));
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));

    expect(await screen.findByDisplayValue('They charge extra.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'charge · B1' }));

    expect(await screen.findByDisplayValue('charge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存 clip.mp4' })).toBeInTheDocument();
    expect(await screen.findByText('AI 建议失败：AI timeout')).toBeInTheDocument();
  });

  it('selects candidates, edits sentence, suggests meaning, then creates a card and uploads media', async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '日语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([{ id: 'tag-1', name: '电影', created_at: 'now', updated_at: 'now' }]));
      if (url === '/api/clip-analysis') return Promise.resolve(jsonResponse({
        status: 'success',
        sentence: { source: 'subtitle_ocr', status: 'success', text: 'Old sentence.', confidence: 'medium' },
        candidates: [
          { target_word: 'old', reason: 'first', difficulty_hint: 'A2' },
          { target_word: 'charge', reason: 'target candidate', difficulty_hint: 'B1' },
        ],
      }));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '这里表示收取费用。', sentence_translation: '他们早餐额外收费。' }));
      if (url.startsWith('/api/cards/suggestions')) return Promise.resolve(jsonResponse([]));
      if (url === '/api/cards') return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-1' } }, 201));
      if (url === '/api/media') return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    renderPage();
    await screen.findByLabelText('本地识别状态');
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));
    expect(await screen.findByRole('button', { name: /charge/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /AI 建议释义/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('原句 clip.mp4'), { target: { value: 'They charge extra for breakfast.' } });
    fireEvent.click(screen.getByRole('button', { name: /charge/ }));
    fireEvent.click(await screen.findByRole('button', { name: '电影' }));

    expect(await screen.findByDisplayValue('收费')).toBeInTheDocument();
    expect(screen.getByDisplayValue('这里表示收取费用。')).toBeInTheDocument();
    expect(screen.getByText('他们早餐额外收费。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存 clip.mp4' }));

    await waitFor(() => expect(screen.getAllByText('已保存').length).toBeGreaterThan(0));
    const cardRequest = requests.find((r) => r.url === '/api/cards' && r.method === 'POST');
    expect(cardRequest?.body).toBe(JSON.stringify({
      target_word: 'charge',
      context_meaning: '收费',
      target_language: '日语',
      definition_language: '中文',
      sentence: 'They charge extra for breakfast.',
      note: '这里表示收取费用。',
      tag_ids: ['tag-1'],
    }));
    expect(requests.filter((r) => r.url === '/api/media' && r.method === 'POST')).toHaveLength(1);
  });

  it('appends to an exact matched card and retries failed media upload without creating another card', async () => {
    const cardRequests: unknown[] = [];
    const suggestionRequests: string[] = [];
    const uploadedContextIds: string[] = [];
    let mediaAttempts = 0;
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/settings') return Promise.resolve(jsonResponse({ default_target_language: '英语', default_definition_language: '中文', interface_language: '中文' }));
      if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse(readyReadiness()));
      if (url === '/api/tags') return Promise.resolve(jsonResponse([]));
      if (url === '/api/clip-analysis') return Promise.resolve(jsonResponse({
        status: 'success',
        sentence: { source: 'audio_stt', status: 'success', text: 'They charge extra.', confidence: 'high' },
        candidates: [{ target_word: 'charge', reason: 'candidate', difficulty_hint: 'B1' }],
      }));
      if (url === '/api/ai/suggestions') return Promise.resolve(jsonResponse({ status: 'success', meaning_suggestion: '收费', usage_note: '这里表示收取费用。', sentence_translation: '他们早餐额外收费。' }));
      if (url.startsWith('/api/cards/suggestions')) {
        suggestionRequests.push(url);
        return Promise.resolve(jsonResponse([{ id: 'card-1', target_word: 'charge', context_meaning: '收费' }]));
      }
      if (url === '/api/cards' && init?.method === 'POST') {
        cardRequests.push(init.body);
        return Promise.resolve(jsonResponse({ card: { id: 'card-1' }, context: { id: 'ctx-2' } }, 201));
      }
      if (url === '/api/media') {
        uploadedContextIds.push((init?.body as FormData).get('context_example_id') as string);
        mediaAttempts += 1;
        if (mediaAttempts === 1) return Promise.reject(new Error('disk full'));
        return Promise.resolve(jsonResponse({ id: 'media-1' }, 201));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('批量选择 MP4 视频'), { target: { files: [file('clip.mp4', 'video/mp4')] } });
    fireEvent.click(screen.getByRole('button', { name: '全部分析' }));
    fireEvent.click(await screen.findByRole('button', { name: 'charge · B1' }));
    await screen.findByDisplayValue('charge');
    fireEvent.change(screen.getByLabelText('当前语境释义 clip.mp4'), { target: { value: '收费' } });
    fireEvent.click(screen.getByRole('button', { name: '保存 clip.mp4' }));

    expect(await screen.findByText('卡片已保存，但媒体上传失败：disk full')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存 clip.mp4' }));

    await waitFor(() => expect(screen.getAllByText('已保存').length).toBeGreaterThan(0));
    expect(cardRequests).toHaveLength(1);
    expect(suggestionRequests).toHaveLength(1);
    expect(uploadedContextIds).toEqual(['ctx-2', 'ctx-2']);
  });
});
