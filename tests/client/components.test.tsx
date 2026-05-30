import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../src/client/components/Button';
import { ConfirmDialog } from '../../src/client/components/ConfirmDialog';
import { FormField } from '../../src/client/components/FormField';
import { MediaPreview } from '../../src/client/components/MediaPreview';
import { Pagination } from '../../src/client/components/Pagination';
import { StatusBadge } from '../../src/client/components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../src/client/components/UiStates';

describe('shared components', () => {
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

  it('calls pagination callbacks', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={75} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);

    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    fireEvent.change(screen.getByLabelText('每页数量'), { target: { value: '50' } });

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders status and favorite badges', () => {
    render(<><StatusBadge status="reviewing" /><StatusBadge favorite /></>);
    expect(screen.getByText('复习中')).toBeInTheDocument();
    expect(screen.getByText('已收藏')).toBeInTheDocument();
  });

  it('renders unavailable media state', () => {
    render(<MediaPreview mediaType="image" src="/uploads/missing.png" fileName="missing.png" isAvailable={false} />);
    expect(screen.getByText('文件不可用')).toBeInTheDocument();
  });

  it('runs confirm and cancel callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="删除词义条目" message="确认删除？" onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders loading empty and error states', () => {
    const retry = vi.fn();
    render(<><LoadingState /><EmptyState message="暂无内容" /><ErrorState message="加载失败" onRetry={retry} /></>);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
