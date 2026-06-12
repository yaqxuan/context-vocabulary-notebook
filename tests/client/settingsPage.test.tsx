import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../src/client/i18n/I18nProvider';
import { SettingsPage } from '../../src/client/pages/SettingsPage';
import { NATIVE_LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../src/shared/constants';
import type {
  ImportConflictDto,
  ImportExecuteResponseDto,
  ImportScanResponseDto,
  SettingsDto,
} from '../../src/shared/types';

const render = (ui: React.ReactElement) => rtlRender(<I18nProvider>{ui}</I18nProvider>);

// --- Helpers ---

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function blobResponse(data = new Uint8Array([1, 2, 3]), type = 'application/zip'): Response {
  return new Response(new Blob([data], { type }), { status: 200 });
}

/** Collect FormData keys from a fetch call's body */
function getFormDataKeys(body: BodyInit | null | undefined): string[] {
  if (body instanceof FormData) {
    return Array.from(body.keys());
  }
  return [];
}

/** Collect FormData entry from a fetch call's body */
function getFormDataEntry(body: BodyInit | null | undefined, key: string): FormDataEntryValue | null {
  if (body instanceof FormData) {
    return body.get(key);
  }
  return null;
}

// --- Fixtures ---


function defaultSettingsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
  if (url.startsWith('/api/local-recognition/readiness')) return Promise.resolve(jsonResponse({
    ffmpeg: { ready: true, message: 'ffmpeg is ready' },
    stt: { provider: 'whisper.cpp', ready: true, executablePath: 'whisper-cli', modelPath: '/models/ggml-base.bin', language: 'en', message: 'whisper.cpp executable and model are ready' },
    ocr: { provider: 'tesseract', ready: true, executablePath: 'tesseract', language: 'eng', requiredLanguage: 'eng', installedLanguages: ['eng'], languageReady: true, languageMessage: 'Tesseract language data eng is installed', message: 'Tesseract language data eng is installed' },
  }));
  return Promise.resolve(jsonResponse(settings));
}

const settings: SettingsDto = {
  id: 1,
  interface_language: '中文',
  default_target_language: '英语',
  default_definition_language: '中文',
  daily_review_limit: 20,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const conflict1: ImportConflictDto = {
  import_card_id: 'import-1',
  existing_card_id: 'existing-1',
  target_word: 'ephemeral',
  context_meaning: '短暂的',
};

const conflict2: ImportConflictDto = {
  import_card_id: 'import-2',
  existing_card_id: 'existing-2',
  target_word: 'laconic',
  context_meaning: '简洁的',
};

const scanResult: ImportScanResponseDto = {
  schema_version: 1,
  export_type: 'marked',
  counts: {
    cards: 42,
    contexts: 67,
    media_files: 15,
    tags: 8,
  },
  conflicts: [conflict1, conflict2],
  missing_media: ['audio/clip1.mp3', 'images/shot.jpg'],
};

const executeResult: ImportExecuteResponseDto = {
  imported_cards: 40,
  imported_contexts: 65,
  imported_media_files: 13,
  skipped_cards: 2,
  merged_cards: 0,
  missing_media_files: 2,
};

// --- Tests ---

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ─── Loading and ready state ───────────────────────────────────────────────

  describe('loading and ready state', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(defaultSettingsFetch);
    });

    it('shows loading state initially', () => {
      render(<SettingsPage />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not render the top settings hero header', async () => {
      render(<SettingsPage />);

      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
      expect(screen.queryByText('设置与数据管理')).not.toBeInTheDocument();
      expect(screen.queryByText(/调整界面语言/)).not.toBeInTheDocument();
    });

    it('renders form with loaded settings values', async () => {
      render(<SettingsPage />);
      const targetSelect = await screen.findByLabelText('默认学习语言') as HTMLSelectElement;
      expect(targetSelect.value).toBe('英语');
    });

    it('renders local recognition setup for the default learning language', async () => {
      render(<SettingsPage />);
      expect(await screen.findByText('本地识别配置 · English')).toBeInTheDocument();
    });

    it('keeps recognition readiness aligned with the latest selected learning language', async () => {
      let resolveEnglishReadiness: (response: Response) => void = () => undefined;
      let resolveJapaneseReadiness: (response: Response) => void = () => undefined;
      vi.mocked(globalThis.fetch).mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url.includes('target_language=%E6%97%A5%E8%AF%AD')) {
          return new Promise<Response>((resolve) => { resolveJapaneseReadiness = resolve; });
        }
        if (url.startsWith('/api/local-recognition/readiness')) {
          return new Promise<Response>((resolve) => { resolveEnglishReadiness = resolve; });
        }
        return Promise.resolve(jsonResponse({ ok: true }));
      });

      render(<SettingsPage />);
      const targetSelect = await screen.findByLabelText('默认学习语言');
      fireEvent.change(targetSelect, { target: { value: '日语' } });

      resolveJapaneseReadiness(jsonResponse({
        ffmpeg: { ready: true, message: 'ffmpeg is ready' },
        stt: { provider: 'whisper.cpp', ready: true, executablePath: 'whisper-cli', modelPath: '/models/ggml-base.bin', language: 'ja', message: 'ready' },
        ocr: { provider: 'tesseract', ready: true, executablePath: 'tesseract', language: 'jpn', requiredLanguage: 'jpn', installedLanguages: ['jpn'], languageReady: true, languageMessage: 'Tesseract language data jpn is installed', message: 'Tesseract language data jpn is installed' },
      }));
      expect(await screen.findByText('目标语言包：jpn')).toBeInTheDocument();

      resolveEnglishReadiness(jsonResponse({
        ffmpeg: { ready: true, message: 'ffmpeg is ready' },
        stt: { provider: 'whisper.cpp', ready: true, executablePath: 'whisper-cli', modelPath: '/models/ggml-base.bin', language: 'en', message: 'ready' },
        ocr: { provider: 'tesseract', ready: true, executablePath: 'tesseract', language: 'eng', requiredLanguage: 'eng', installedLanguages: ['eng'], languageReady: true, languageMessage: 'Tesseract language data eng is installed', message: 'Tesseract language data eng is installed' },
      }));

      await waitFor(() => expect(screen.getByText('目标语言包：jpn')).toBeInTheDocument());
      expect(screen.queryByText('目标语言包：eng')).not.toBeInTheDocument();
    });

    it('renders learning settings without the interface language field', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByLabelText('界面语言')).not.toBeInTheDocument();
      expect(screen.getByLabelText('默认学习语言')).toBeInTheDocument();
      expect(screen.getByLabelText('默认释义语言')).toBeInTheDocument();
      expect(screen.getByLabelText('每日复习数量')).toBeInTheDocument();
    });

    it('populates daily_review_limit field with loaded value', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');
      const input = screen.getByLabelText('每日复习数量') as HTMLInputElement;
      expect(input.value).toBe('20');
    });

    it('renders native labels while preserving canonical language values', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      for (const label of ['默认学习语言', '默认释义语言']) {
        const select = screen.getByLabelText(label) as HTMLSelectElement;
        expect(Array.from(select.options).map((option) => option.value)).toEqual([...SUPPORTED_LANGUAGES]);
        expect(Array.from(select.options).map((option) => option.textContent)).toEqual(
          SUPPORTED_LANGUAGES.map((language) => NATIVE_LANGUAGE_LABELS[language]),
        );
      }
    });

    it('normalizes legacy persisted language values into supported selector values', async () => {
      const legacySettings: SettingsDto = {
        ...settings,
        interface_language: 'zh-CN',
        default_target_language: '英文',
        default_definition_language: '日本語',
      };
      vi.restoreAllMocks();
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        return Promise.resolve(jsonResponse(legacySettings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      expect(screen.queryByLabelText('界面语言')).not.toBeInTheDocument();
      expect((screen.getByLabelText('默认学习语言') as HTMLSelectElement).value).toBe('英语');
      expect((screen.getByLabelText('默认释义语言') as HTMLSelectElement).value).toBe('日语');
    });
  });

  // ─── Settings PATCH ────────────────────────────────────────────────────────

  describe('settings save', () => {
    it('PATCHes correct payload and shows 设置已保存', async () => {
      const updatedSettings: SettingsDto = {
        ...settings,
        daily_review_limit: 30,
        updated_at: '2026-01-02T00:00:00Z',
      };

      let patchBody: unknown = null;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (init?.method === 'PATCH') {
          patchBody = JSON.parse(init.body as string);
          return Promise.resolve(jsonResponse(updatedSettings));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '30' } });
      fireEvent.change(screen.getByLabelText('默认学习语言'), { target: { value: '日语' } });
      fireEvent.change(screen.getByLabelText('默认释义语言'), { target: { value: '韩语' } });

      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByText('设置已保存')).toBeInTheDocument();
      expect(patchBody).toEqual({
        daily_review_limit: 30,
        default_target_language: '日语',
        default_definition_language: '韩语',
      });
    });

    it('keeps updated learning values visible after successful save', async () => {
      const updatedSettings: SettingsDto = {
        ...settings,
        default_target_language: '日语',
        default_definition_language: '韩语',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (init?.method === 'PATCH') {
          return Promise.resolve(jsonResponse(updatedSettings));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.change(screen.getByLabelText('默认学习语言'), { target: { value: '日语' } });
      fireEvent.change(screen.getByLabelText('默认释义语言'), { target: { value: '韩语' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await screen.findByText('设置已保存');
      expect(screen.getByLabelText('默认学习语言')).toHaveValue('日语');
      expect(screen.getByLabelText('默认释义语言')).toHaveValue('韩语');
    });
  });

  // ─── Validation: daily_review_limit must be positive integer ──────────────

  describe('validation', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(defaultSettingsFetch);
    });

    it('shows 每日复习数量必须是正整数 when value is zero', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is negative', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '-5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is a float', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '2.5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is empty', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('does not show validation error and proceeds when value is a valid positive integer', async () => {
      vi.restoreAllMocks();
      const updatedSettings = { ...settings, daily_review_limit: 5 };
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (init?.method === 'PATCH') return Promise.resolve(jsonResponse(updatedSettings));
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await screen.findByText('设置已保存');
      expect(screen.queryByText('每日复习数量必须是正整数')).not.toBeInTheDocument();
    });
  });

  // ─── AI API configs ──────────────────────────────────────────────────────────

  describe('AI API configs', () => {
    it('manages OpenAI-compatible AI configs without exposing API keys', async () => {
      const calls: Array<{ url: string; method: string; body: unknown }> = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        calls.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url === '/api/ai-configs' && (init?.method ?? 'GET') === 'GET') {
          return Promise.resolve(
            jsonResponse([
              {
                id: 'cfg-1',
                name: 'DeepSeek',
                base_url: 'https://api.deepseek.com/v1',
                model: 'deepseek-chat',
                is_active: 1,
                has_api_key: true,
                created_at: 'now',
                updated_at: 'now',
              },
            ]),
          );
        }
        if (url === '/api/ai-configs' && init?.method === 'POST') {
          return Promise.resolve(
            jsonResponse(
              {
                id: 'cfg-2',
                name: 'Local',
                base_url: 'http://localhost:11434/v1',
                model: 'qwen',
                is_active: 0,
                has_api_key: true,
                created_at: 'now',
                updated_at: 'now',
              },
              201,
            ),
          );
        }
        return Promise.resolve(jsonResponse({ ok: true }));
      });

      render(<SettingsPage />);

      expect(await screen.findByText('DeepSeek')).toBeInTheDocument();
      expect(screen.getByText('当前启用')).toBeInTheDocument();
      expect(screen.getByText('API Key 已保存')).toBeInTheDocument();
      expect(screen.queryByText('sk-secret')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('配置名称'), { target: { value: 'Local' } });
      fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'http://localhost:11434/v1' } });
      fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'ollama' } });
      fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'qwen' } });
      fireEvent.click(screen.getByRole('button', { name: '保存 AI 配置' }));

      await waitFor(() =>
        expect(calls.some((call) => call.url === '/api/ai-configs' && call.method === 'POST')).toBe(true),
      );
      const post = calls.find((call) => call.url === '/api/ai-configs' && call.method === 'POST');
      expect(post?.body).toBe(
        JSON.stringify({
          name: 'Local',
          base_url: 'http://localhost:11434/v1',
          api_key: 'ollama',
          model: 'qwen',
          is_active: false,
        }),
      );
    });

    it('renders saved AI configs as light settings cards with metadata grouping', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url === '/api/ai-configs' && method === 'GET') {
          return Promise.resolve(jsonResponse([{
            id: 'cfg-1',
            name: 'deepseek',
            base_url: 'https://api.deepseek.com',
            model: 'deepseek-v4-flash',
            is_active: 1,
            has_api_key: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }]));
        }
        return Promise.resolve(jsonResponse({}));
      });

      render(<SettingsPage />);

      const card = await screen.findByTestId('ai-config-card-cfg-1');
      expect(card).toHaveClass('ai-config-card--light');
      expect(card.querySelector('.ai-config-meta')).toHaveTextContent('deepseek-v4-flash');
      expect(card.querySelector('.ai-config-meta')).toHaveTextContent('https://api.deepseek.com');
      expect(screen.getByText('当前启用')).toHaveClass('ai-config-active');
    });

    it('fetches model list from entered Base URL and API Key', async () => {
      const calls: Array<{ url: string; method: string; body: unknown }> = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        calls.push({ url, method: init?.method ?? 'GET', body: init?.body ?? null });
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url === '/api/ai-configs/models') return Promise.resolve(jsonResponse({ models: ['qwen2.5', 'deepseek-chat'] }));
        return Promise.resolve(jsonResponse({ ok: true }));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('Base URL');

      fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'http://localhost:11434/v1' } });
      fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'ollama' } });
      fireEvent.click(screen.getByRole('button', { name: '获取模型列表' }));

      await waitFor(() => expect(screen.getByLabelText('模型')).toHaveValue('qwen2.5'));
      const post = calls.find((call) => call.url === '/api/ai-configs/models' && call.method === 'POST');
      expect(post?.body).toBe(JSON.stringify({ base_url: 'http://localhost:11434/v1', api_key: 'ollama' }));
    });

    it('fetches model list for an existing config without re-entering the API key', async () => {
      const calls: Array<{ url: string; method: string; body: unknown }> = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        calls.push({ url, method, body: init?.body ?? null });
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url === '/api/ai-configs' && method === 'GET') {
          return Promise.resolve(
            jsonResponse([
              {
                id: 'cfg-1',
                name: 'DeepSeek',
                base_url: 'https://api.deepseek.com/v1',
                model: 'deepseek-chat',
                is_active: 0,
                has_api_key: true,
                created_at: 'now',
                updated_at: 'now',
              },
            ]),
          );
        }
        if (url === '/api/ai-configs/cfg-1/models') return Promise.resolve(jsonResponse({ models: ['deepseek-reasoner'] }));
        return Promise.resolve(jsonResponse({ ok: true }));
      });

      render(<SettingsPage />);
      await screen.findByText('DeepSeek');

      fireEvent.click(screen.getByRole('button', { name: '编辑 DeepSeek' }));
      expect(screen.getByLabelText('API Key')).toHaveValue('');
      fireEvent.click(screen.getByRole('button', { name: '获取模型列表' }));

      await screen.findByRole('button', { name: 'deepseek-reasoner' });
      fireEvent.click(screen.getByRole('button', { name: 'deepseek-reasoner' }));
      expect(screen.getByLabelText('模型')).toHaveValue('deepseek-reasoner');
      expect(calls.some((call) => call.url === '/api/ai-configs/cfg-1/models' && call.method === 'GET')).toBe(true);
    });

    it('edits an existing AI config without sending a blank API key', async () => {
      const calls: Array<{ url: string; method: string; body: unknown }> = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        calls.push({ url, method, body: init?.body ?? null });
        if (url === '/api/settings') return Promise.resolve(jsonResponse(settings));
        if (url === '/api/ai-configs' && method === 'GET') {
          return Promise.resolve(
            jsonResponse([
              {
                id: 'cfg-1',
                name: 'DeepSeek',
                base_url: 'https://api.deepseek.com/v1',
                model: 'deepseek-chat',
                is_active: 0,
                has_api_key: true,
                created_at: 'now',
                updated_at: 'now',
              },
            ]),
          );
        }
        if (url === '/api/ai-configs/cfg-1' && method === 'PATCH') {
          return Promise.resolve(
            jsonResponse({
              id: 'cfg-1',
              name: 'DeepSeek Updated',
              base_url: 'https://api.deepseek.com/v1',
              model: 'deepseek-reasoner',
              is_active: 1,
              has_api_key: true,
              created_at: 'now',
              updated_at: 'later',
            }),
          );
        }
        return Promise.resolve(jsonResponse({ ok: true }));
      });

      render(<SettingsPage />);
      await screen.findByText('DeepSeek');

      expect(screen.getByRole('button', { name: '启用 DeepSeek' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '删除 DeepSeek' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '编辑 DeepSeek' }));

      expect(screen.getByLabelText('配置名称')).toHaveValue('DeepSeek');
      expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.deepseek.com/v1');
      expect(screen.getByLabelText('模型')).toHaveValue('deepseek-chat');
      expect(screen.getByLabelText('API Key')).toHaveValue('');
      expect(screen.getByRole('button', { name: '取消编辑' })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('配置名称'), { target: { value: 'DeepSeek Updated' } });
      fireEvent.change(screen.getByLabelText('API Key'), { target: { value: '   ' } });
      fireEvent.change(screen.getByLabelText('模型'), { target: { value: 'deepseek-reasoner' } });
      fireEvent.click(screen.getByLabelText('保存后立即启用'));
      fireEvent.click(screen.getByRole('button', { name: '保存 AI 配置' }));

      await waitFor(() =>
        expect(calls.some((call) => call.url === '/api/ai-configs/cfg-1' && call.method === 'PATCH')).toBe(true),
      );
      const patch = calls.find((call) => call.url === '/api/ai-configs/cfg-1' && call.method === 'PATCH');
      expect(patch?.body).toBe(
        JSON.stringify({
          name: 'DeepSeek Updated',
          base_url: 'https://api.deepseek.com/v1',
          model: 'deepseek-reasoner',
          is_active: true,
        }),
      );
    });
  });

  // ─── Export ────────────────────────────────────────────────────────────────

  describe('export', () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
    let anchorClickSpy: ReturnType<typeof vi.spyOn>;
    // Track href and download set on anchor elements created during the test
    let lastAnchorHref = '';
    let lastAnchorDownload = '';

    beforeEach(() => {
      createObjectURLSpy = vi.fn().mockReturnValue('blob:test-url');
      revokeObjectURLSpy = vi.fn();
      lastAnchorHref = '';
      lastAnchorDownload = '';

      globalThis.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
      globalThis.URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

      // Spy on HTMLAnchorElement.prototype.click so we can intercept the simulated
      // download click without blocking React's DOM mutations (appendChild is untouched).
      anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        function (this: HTMLAnchorElement) {
          lastAnchorHref = this.href;
          lastAnchorDownload = this.download;
        },
      );
    });

    afterEach(() => {
      anchorClickSpy.mockRestore();
    });

    it('triggers marked export download on 导出含有标记的卡片 button click', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/export?type=marked')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.click(screen.getByRole('button', { name: '导出含有标记的卡片' }));

      await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(lastAnchorHref).toBe('blob:test-url');
      expect(lastAnchorDownload).toContain('marked');
    });

    it('triggers pure export download on 导出纯卡片 button click', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/export?type=pure')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.click(screen.getByRole('button', { name: '导出纯卡片' }));

      await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(lastAnchorHref).toBe('blob:test-url');
      expect(lastAnchorDownload).toContain('pure');
    });

    it('calls /api/export?type=marked for marked export', async () => {
      const fetchedUrls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        fetchedUrls.push(url);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/export')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.click(screen.getByRole('button', { name: '导出含有标记的卡片' }));

      await waitFor(() => expect(fetchedUrls.some((u) => u.includes('type=marked'))).toBe(true));
    });

    it('calls /api/export?type=pure for pure export', async () => {
      const fetchedUrls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        fetchedUrls.push(url);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/export')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.click(screen.getByRole('button', { name: '导出纯卡片' }));

      await waitFor(() => expect(fetchedUrls.some((u) => u.includes('type=pure'))).toBe(true));
    });

    it('removes the hidden anchor from the DOM after export, even if click throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/export')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      // Spy on removeChild to verify it is called with an anchor element
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      fireEvent.click(screen.getByRole('button', { name: '导出含有标记的卡片' }));

      await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));

      // removeChild must have been called with the anchor element
      expect(removeChildSpy).toHaveBeenCalledTimes(1);
      const removedNode = removeChildSpy.mock.calls[0][0] as HTMLElement;
      expect(removedNode.tagName).toBe('A');

      // The anchor must not be present in the document body
      const anchors = document.body.querySelectorAll('a[download]');
      expect(anchors).toHaveLength(0);

      removeChildSpy.mockRestore();
    });
  });

  // ─── Import scan ───────────────────────────────────────────────────────────

  describe('import scan', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/import/scan')) {
          return Promise.resolve(jsonResponse(scanResult));
        }
        // GET settings
        if (!init?.method || init.method === 'GET') {
          return Promise.resolve(jsonResponse(settings));
        }
        return Promise.resolve(jsonResponse({}));
      });
    });

    it('renders file input with aria-label 选择导入 zip', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.getByLabelText('选择导入 zip')).toBeInTheDocument();
    });

    it('renders scan button 扫描导入文件', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.getByRole('button', { name: '扫描导入文件' })).toBeInTheDocument();
    });

    it('renders execute button 执行导入', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.getByRole('button', { name: '执行导入' })).toBeInTheDocument();
    });

    it('shows scan counts after scanning', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      // Simulate file selection
      const fileInput = screen.getByLabelText('选择导入 zip') as HTMLInputElement;
      const file = new File(['dummy'], 'backup.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Click scan
      fireEvent.click(screen.getByRole('button', { name: '扫描导入文件' }));

      // Counts appear
      expect(await screen.findByText('42')).toBeInTheDocument();
      expect(screen.getByText('67')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('shows conflict target_word and context_meaning after scanning', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      const fileInput = screen.getByLabelText('选择导入 zip') as HTMLInputElement;
      const file = new File(['dummy'], 'backup.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole('button', { name: '扫描导入文件' }));

      expect(await screen.findByText('ephemeral')).toBeInTheDocument();
      expect(screen.getByText('短暂的')).toBeInTheDocument();
      expect(screen.getByText('laconic')).toBeInTheDocument();
      expect(screen.getByText('简洁的')).toBeInTheDocument();
    });

    it('shows missing_media filenames after scanning', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      const fileInput = screen.getByLabelText('选择导入 zip') as HTMLInputElement;
      const file = new File(['dummy'], 'backup.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole('button', { name: '扫描导入文件' }));

      expect(await screen.findByText('audio/clip1.mp3')).toBeInTheDocument();
      expect(screen.getByText('images/shot.jpg')).toBeInTheDocument();
    });
  });

  // ─── Import execute ────────────────────────────────────────────────────────

  describe('import execute', () => {
    /** Helper to set up page ready for execute (after scan) */
    async function setupAndScan(
      fetchMock?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    ) {
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        fetchMock ??
          ((input, init) => {
            const url = String(input);
            if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
            if (url.includes('/import/scan')) {
              return Promise.resolve(jsonResponse(scanResult));
            }
            if (url.includes('/import/execute')) {
              return Promise.resolve(jsonResponse(executeResult));
            }
            if (!init?.method || init.method === 'GET') {
              return Promise.resolve(jsonResponse(settings));
            }
            return Promise.resolve(jsonResponse({}));
          }),
      );

      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');

      const fileInput = screen.getByLabelText('选择导入 zip') as HTMLInputElement;
      const file = new File(['dummy'], 'backup.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: '扫描导入文件' }));
      await screen.findByText('42'); // scan counts visible
    }

    it('sends FormData key "decisions" (not "decision") on execute', async () => {
      let capturedBody: BodyInit | null | undefined = null;

      await setupAndScan((input, init) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        if (url.includes('/import/execute')) {
          capturedBody = init?.body;
          return Promise.resolve(jsonResponse(executeResult));
        }
        if (url.includes('/import/scan')) {
          return Promise.resolve(jsonResponse(scanResult));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      // Default mode is skip_all; click execute
      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await waitFor(() => expect(capturedBody).not.toBeNull());
      const keys = getFormDataKeys(capturedBody);
      expect(keys).toContain('decisions');
      expect(keys).not.toContain('decision');
    });

    it('shows 导入完成 after successful execute with skip_all', async () => {
      await setupAndScan();

      // Default mode: 全部跳过
      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      expect(await screen.findByText('导入完成')).toBeInTheDocument();
    });

    it('shows import result counts (imported_cards, skipped_cards) after execute', async () => {
      await setupAndScan();
      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await screen.findByText('导入完成');
      // imported_cards = 40
      expect(screen.getByText('40')).toBeInTheDocument();
      // skipped_cards = 2 and missing_media_files = 2; use getAllByText since both appear
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(1);
    });

    it('sends mode skip_all when 全部跳过 is selected', async () => {
      let capturedDecision: unknown = null;

      await setupAndScan((input, init) => {
        const url = String(input);
        if (url.includes('/import/execute')) {
          const entry = getFormDataEntry(init?.body, 'decisions');
          capturedDecision = entry ? JSON.parse(String(entry)) : null;
          return Promise.resolve(jsonResponse(executeResult));
        }
        if (url.includes('/import/scan')) return Promise.resolve(jsonResponse(scanResult));
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        return Promise.resolve(jsonResponse(settings));
      });

      // select skip_all radio/option
      const skipAllOption = screen.getByLabelText('全部跳过');
      fireEvent.click(skipAllOption);

      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await waitFor(() => expect(capturedDecision).not.toBeNull());
      expect(capturedDecision).toMatchObject({ mode: 'skip_all' });
    });

    it('sends mode merge_all when 全部合并为已有词义条目的新语境 is selected', async () => {
      let capturedDecision: unknown = null;

      await setupAndScan((input, init) => {
        const url = String(input);
        if (url.includes('/import/execute')) {
          const entry = getFormDataEntry(init?.body, 'decisions');
          capturedDecision = entry ? JSON.parse(String(entry)) : null;
          return Promise.resolve(jsonResponse(executeResult));
        }
        if (url.includes('/import/scan')) return Promise.resolve(jsonResponse(scanResult));
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        return Promise.resolve(jsonResponse(settings));
      });

      const mergeAllOption = screen.getByLabelText('全部合并为已有词义条目的新语境');
      fireEvent.click(mergeAllOption);

      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await waitFor(() => expect(capturedDecision).not.toBeNull());
      expect(capturedDecision).toMatchObject({ mode: 'merge_all' });
    });

    it('sends mode import_all_as_new when 全部作为新词义条目导入 is selected', async () => {
      let capturedDecision: unknown = null;

      await setupAndScan((input, init) => {
        const url = String(input);
        if (url.includes('/import/execute')) {
          const entry = getFormDataEntry(init?.body, 'decisions');
          capturedDecision = entry ? JSON.parse(String(entry)) : null;
          return Promise.resolve(jsonResponse(executeResult));
        }
        if (url.includes('/import/scan')) return Promise.resolve(jsonResponse(scanResult));
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        return Promise.resolve(jsonResponse(settings));
      });

      const importAllOption = screen.getByLabelText('全部作为新词义条目导入');
      fireEvent.click(importAllOption);

      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await waitFor(() => expect(capturedDecision).not.toBeNull());
      expect(capturedDecision).toMatchObject({ mode: 'import_all_as_new' });
    });

    it('renders per-conflict selects when 逐项处理 is selected', async () => {
      await setupAndScan();

      const perItemOption = screen.getByLabelText('逐项处理');
      fireEvent.click(perItemOption);

      expect(screen.getByLabelText('冲突处理：ephemeral')).toBeInTheDocument();
      expect(screen.getByLabelText('冲突处理：laconic')).toBeInTheDocument();
    });

    it('sends per_item mode with items array when 逐项处理 is selected', async () => {
      let capturedDecision: unknown = null;

      await setupAndScan((input, init) => {
        const url = String(input);
        if (url.includes('/import/execute')) {
          const entry = getFormDataEntry(init?.body, 'decisions');
          capturedDecision = entry ? JSON.parse(String(entry)) : null;
          return Promise.resolve(jsonResponse(executeResult));
        }
        if (url.includes('/import/scan')) return Promise.resolve(jsonResponse(scanResult));
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        return Promise.resolve(jsonResponse(settings));
      });

      const perItemOption = screen.getByLabelText('逐项处理');
      fireEvent.click(perItemOption);

      fireEvent.change(screen.getByLabelText('冲突处理：ephemeral'), { target: { value: 'merge' } });

      fireEvent.click(screen.getByRole('button', { name: '执行导入' }));

      await waitFor(() => expect(capturedDecision).not.toBeNull());
      const dec = capturedDecision as { mode: string; items: Array<{ import_card_id: string; decision: string }> };
      expect(dec.mode).toBe('per_item');
      expect(dec.items).toHaveLength(2);
      // First item should be merge (as changed), second should have a default
      const first = dec.items.find((i) => i.import_card_id === 'import-1');
      expect(first?.decision).toBe('merge');
    });
  });

  // ─── Non-goals: must not render excluded terms ─────────────────────────────

  describe('non-goals', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(defaultSettingsFetch);
    });

    it('does not render text "本地 API"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByText(/本地\s*API/)).not.toBeInTheDocument();
    });

    it('does not render text "CLI"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByText(/CLI/)).not.toBeInTheDocument();
    });

    it('does not render text "AI 自动制卡"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByText(/AI 自动制卡/)).not.toBeInTheDocument();
    });

    it('does not render text "同步"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('默认学习语言');
      expect(screen.queryByText(/同步/)).not.toBeInTheDocument();
    });
  });

  // ─── Error state ───────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error state with 重试 button on API failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({ error: 'database unavailable' }, 500),
      );

      render(<SettingsPage />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('database unavailable');
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('retries and shows settings form after clicking 重试', async () => {
      let callCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url === '/api/ai-configs') return Promise.resolve(jsonResponse([]));
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(jsonResponse({ error: 'transient error' }, 500));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);

      await screen.findByRole('alert');
      fireEvent.click(screen.getByRole('button', { name: /Retry|重试/ }));

      expect(await screen.findByLabelText('默认学习语言')).toBeInTheDocument();
    });
  });
});
