import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider, useI18n } from '../../src/client/i18n/I18nProvider';
import * as settingsApi from '../../src/client/api/settings';

vi.mock('../../src/client/api/settings', () => ({
  getSettings: vi.fn(),
  patchSettings: vi.fn(),
}));

function TestComponent() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="settings-label">{t('nav.settings.label')}</div>
      <div data-testid="pagination-summary">
        {t('pagination.summary', { page: 1, totalPages: 3, total: 42 })}
      </div>
      <button onClick={() => setLanguage('日语')}>Switch to Japanese</button>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads initial language from /api/settings', async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValueOnce({
      interface_language: '法语',
      default_target_language: '英语',
      default_definition_language: '中文',
      daily_review_limit: 50,
      id: 1,
      updated_at: '2026-01-01',
      created_at: '2026-01-01',
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('法语');
    });

    expect(screen.getByTestId('settings-label')).toHaveTextContent('Paramètres');
  });

  it('falls back to Chinese when settings fetch fails', async () => {
    vi.mocked(settingsApi.getSettings).mockRejectedValueOnce(new Error('Network error'));

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('中文');
    });

    expect(screen.getByTestId('settings-label')).toHaveTextContent('设置');
  });

  it('switches language at runtime', async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValueOnce({
      interface_language: '中文',
      default_target_language: '英语',
      default_definition_language: '中文',
      daily_review_limit: 50,
      id: 1,
      updated_at: '2026-01-01',
      created_at: '2026-01-01',
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('中文');
    });

    expect(screen.getByTestId('settings-label')).toHaveTextContent('设置');

    fireEvent.click(screen.getByText('Switch to Japanese'));

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('日语');
    });

    expect(screen.getByTestId('settings-label')).toHaveTextContent('設定');
  });

  it('interpolates parameters', async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValueOnce({
      interface_language: '中文',
      default_target_language: '英语',
      default_definition_language: '中文',
      daily_review_limit: 50,
      id: 1,
      updated_at: '2026-01-01',
      created_at: '2026-01-01',
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent('第 1 页，共 3 页（总计 42 项）');
    });
  });
});
