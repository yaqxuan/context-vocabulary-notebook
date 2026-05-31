import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from '../../src/client/pages/SettingsPage';
import type {
  ImportConflictDto,
  ImportExecuteResponseDto,
  ImportScanResponseDto,
  SettingsDto,
} from '../../src/shared/types';

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
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(settings));
    });

    it('shows loading state initially', () => {
      render(<SettingsPage />);
      expect(screen.getByText('加载中…')).toBeInTheDocument();
    });

    it('renders form with loaded settings values', async () => {
      render(<SettingsPage />);
      // Wait for settings to load by checking for a form field label
      expect(await screen.findByLabelText('界面语言')).toBeInTheDocument();
      // interface_language and default_definition_language are both '中文' in fixture;
      // check the interface_language field specifically by label association
      const interfaceInput = screen.getByLabelText('界面语言') as HTMLInputElement;
      expect(interfaceInput.value).toBe('中文');
    });

    it('renders all four settings form fields', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      expect(screen.getByLabelText('界面语言')).toBeInTheDocument();
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
        if (init?.method === 'PATCH') {
          patchBody = JSON.parse(init.body as string);
          return Promise.resolve(jsonResponse(updatedSettings));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      // Change daily limit
      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '30' } });

      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      expect(await screen.findByText('设置已保存')).toBeInTheDocument();
      expect(patchBody).toMatchObject({
        daily_review_limit: 30,
        interface_language: '中文',
        default_target_language: '英语',
        default_definition_language: '中文',
      });
    });

    it('keeps updated values visible after successful save', async () => {
      const updatedSettings: SettingsDto = {
        ...settings,
        interface_language: '日本語',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
        if (init?.method === 'PATCH') {
          return Promise.resolve(jsonResponse(updatedSettings));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

      fireEvent.change(screen.getByLabelText('界面语言'), { target: { value: '日本語' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      await screen.findByText('设置已保存');
      const input = screen.getByLabelText('界面语言') as HTMLInputElement;
      expect(input.value).toBe('日本語');
    });
  });

  // ─── Validation: daily_review_limit must be positive integer ──────────────

  describe('validation', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(settings));
    });

    it('shows 每日复习数量必须是正整数 when value is zero', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is negative', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '-5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is a float', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '2.5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('shows 每日复习数量必须是正整数 when value is empty', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      expect(await screen.findByText('每日复习数量必须是正整数')).toBeInTheDocument();
    });

    it('does not show validation error and proceeds when value is a valid positive integer', async () => {
      vi.restoreAllMocks();
      const updatedSettings = { ...settings, daily_review_limit: 5 };
      vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
        if (init?.method === 'PATCH') return Promise.resolve(jsonResponse(updatedSettings));
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('每日复习数量');

      fireEvent.change(screen.getByLabelText('每日复习数量'), { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

      await screen.findByText('设置已保存');
      expect(screen.queryByText('每日复习数量必须是正整数')).not.toBeInTheDocument();
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

    it('triggers marked export download on 导出 marked 备份 button click', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url.includes('/export?type=marked')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

      fireEvent.click(screen.getByRole('button', { name: '导出 marked 备份' }));

      await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(lastAnchorHref).toBe('blob:test-url');
      expect(lastAnchorDownload).toContain('marked');
    });

    it('triggers pure export download on 导出 pure 卡片 button click', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        if (url.includes('/export?type=pure')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

      fireEvent.click(screen.getByRole('button', { name: '导出 pure 卡片' }));

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
        if (url.includes('/export')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

      fireEvent.click(screen.getByRole('button', { name: '导出 marked 备份' }));

      await waitFor(() => expect(fetchedUrls.some((u) => u.includes('type=marked'))).toBe(true));
    });

    it('calls /api/export?type=pure for pure export', async () => {
      const fetchedUrls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input);
        fetchedUrls.push(url);
        if (url.includes('/export')) {
          return Promise.resolve(blobResponse());
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

      fireEvent.click(screen.getByRole('button', { name: '导出 pure 卡片' }));

      await waitFor(() => expect(fetchedUrls.some((u) => u.includes('type=pure'))).toBe(true));
    });
  });

  // ─── Import scan ───────────────────────────────────────────────────────────

  describe('import scan', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = String(input);
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
      await screen.findByLabelText('界面语言');
      expect(screen.getByLabelText('选择导入 zip')).toBeInTheDocument();
    });

    it('renders scan button 扫描导入文件', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      expect(screen.getByRole('button', { name: '扫描导入文件' })).toBeInTheDocument();
    });

    it('renders execute button 执行导入', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      expect(screen.getByRole('button', { name: '执行导入' })).toBeInTheDocument();
    });

    it('shows scan counts after scanning', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');

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
      await screen.findByLabelText('界面语言');

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
      await screen.findByLabelText('界面语言');

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
      await screen.findByLabelText('界面语言');

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

      // Each conflict should have a select for per-item decision
      // Two conflicts: ephemeral and laconic
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
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
        return Promise.resolve(jsonResponse(settings));
      });

      const perItemOption = screen.getByLabelText('逐项处理');
      fireEvent.click(perItemOption);

      // Change first conflict decision to 'merge'
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'merge' } });

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
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(settings));
    });

    it('does not render text "本地 API"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      expect(screen.queryByText(/本地\s*API/)).not.toBeInTheDocument();
    });

    it('does not render text "CLI"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      expect(screen.queryByText(/CLI/)).not.toBeInTheDocument();
    });

    it('does not render text "AI"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
      // Note: "AI" could appear in other text — check for standalone
      expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument();
    });

    it('does not render text "同步"', async () => {
      render(<SettingsPage />);
      await screen.findByLabelText('界面语言');
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
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });

    it('retries and shows settings form after clicking 重试', async () => {
      let callCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(jsonResponse({ error: 'transient error' }, 500));
        }
        return Promise.resolve(jsonResponse(settings));
      });

      render(<SettingsPage />);

      await screen.findByRole('alert');
      fireEvent.click(screen.getByRole('button', { name: '重试' }));

      expect(await screen.findByLabelText('界面语言')).toBeInTheDocument();
    });
  });
});
