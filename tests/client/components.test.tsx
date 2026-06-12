import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../../src/client/components/Button';
import { ConfirmDialog } from '../../src/client/components/ConfirmDialog';
import { FormField } from '../../src/client/components/FormField';
import { MediaPreview } from '../../src/client/components/MediaPreview';
import { Pagination } from '../../src/client/components/Pagination';
import { StatusBadge } from '../../src/client/components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../src/client/components/UiStates';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';

function mockEnglishSettings() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/settings') {
      return Promise.resolve(new Response(JSON.stringify({ id: 1, interface_language: '英语', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });
}

function mockChineseSettings() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/settings') {
      return Promise.resolve(new Response(JSON.stringify({ id: 1, interface_language: '中文', default_target_language: '英语', default_definition_language: '中文', daily_review_limit: 20, created_at: 'now', updated_at: 'now' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });
}

describe('shared components', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders button variants and disabled state', () => {
    render(<Button variant="primary" disabled>保存</Button>);
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('renders form field help and error text', () => {
    render(
      <FormField label="目标单词" help="输入视频里看到的词" error="必填">
        <input aria-label="目标单词" />
      </FormField>,
    );
    expect(screen.getByText('输入视频里看到的词')).toBeInTheDocument();
    expect(screen.getByText('必填')).toBeInTheDocument();
  });

  it('calls pagination callbacks and renders in English', async () => {
    mockEnglishSettings();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <I18nProvider>
        <Pagination page={2} pageSize={20} total={75} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      </I18nProvider>
    );

    expect(await screen.findByText('Page 2 of 4 (Total 75)')).toBeInTheDocument();
    expect(screen.getByText('Page size')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.change(screen.getByLabelText('Page size'), { target: { value: '50' } });

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders status and favorite badges in English', async () => {
    mockEnglishSettings();
    render(
      <I18nProvider>
        <StatusBadge status="reviewing" />
        <StatusBadge favorite />
      </I18nProvider>
    );
    expect(await screen.findByText('Reviewing')).toBeInTheDocument();
    expect(screen.getByText('Favorited')).toBeInTheDocument();
  });

  it('renders unavailable media state in English', async () => {
    mockEnglishSettings();
    render(
      <I18nProvider>
        <MediaPreview mediaType="image" src="/uploads/missing.png" fileName="missing.png" isAvailable={false} />
      </I18nProvider>
    );
    expect(await screen.findByText('File unavailable')).toBeInTheDocument();
  });

  it('renders confirm dialog as a fixed modal overlay and runs callbacks', async () => {
    mockEnglishSettings();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <I18nProvider>
        <ConfirmDialog title="Delete Card" message="Are you sure?" onConfirm={onConfirm} onCancel={onCancel} />
      </I18nProvider>
    );

    const dialog = await screen.findByRole('dialog', { name: 'Delete Card' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveClass('fixed', 'inset-0', 'z-50');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders loading empty and error states in English', async () => {
    mockEnglishSettings();
    const retry = vi.fn();

    render(
      <I18nProvider>
        <LoadingState />
        <EmptyState message="No content" />
        <ErrorState message="Reason" onRetry={retry} />
      </I18nProvider>
    );

    expect(await screen.findByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('No content')).toBeInTheDocument();
    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(retry).toHaveBeenCalledOnce();
  });
});
