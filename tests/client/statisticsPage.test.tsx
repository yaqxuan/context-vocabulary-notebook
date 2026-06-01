import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatisticsPage } from '../../src/client/pages/StatisticsPage';
import type { StatisticsPageDto } from '../../src/shared/types';

// --- Helpers ---

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// --- Fixtures ---

const fullStats: StatisticsPageDto = {
  totals: {
    total_cards: 248,
    reviewing_cards: 183,
    mastered_cards: 41,
    favorite_cards: 24,
  },
  daily_review_counts: [
    // 15 entries so we can verify only latest 14 are used
    { date: '2026-05-01', count: 5 },
    { date: '2026-05-02', count: 10 },
    { date: '2026-05-03', count: 8 },
    { date: '2026-05-04', count: 12 },
    { date: '2026-05-05', count: 7 },
    { date: '2026-05-06', count: 9 },
    { date: '2026-05-07', count: 11 },
    { date: '2026-05-08', count: 6 },
    { date: '2026-05-09', count: 14 },
    { date: '2026-05-10', count: 3 },
    { date: '2026-05-11', count: 15 },
    { date: '2026-05-12', count: 4 },
    { date: '2026-05-13', count: 8 },
    { date: '2026-05-14', count: 20 },
    { date: '2026-05-15', count: 18 },
  ],
  daily_accuracy: [
    { date: '2026-05-14', reviewed_count: 20, good_count: 16, accuracy: 0.8 },
    { date: '2026-05-15', reviewed_count: 18, good_count: 15, accuracy: 0.833 },
  ],
  monthly_review_counts: [
    { month: '2026-04', count: 310 },
    { month: '2026-05', count: 531 },
  ],
  tag_distribution: [
    { tag_id: 'tag-1', name: '美剧', card_count: 120 },
    { tag_id: 'tag-2', name: '读书', card_count: 85 },
  ],
  rating_trend: [
    { date: '2026-05-14', again_count: 4, good_count: 16 },
    { date: '2026-05-15', again_count: 3, good_count: 15 },
  ],
};

const emptyStats: StatisticsPageDto = {
  totals: {
    total_cards: 0,
    reviewing_cards: 0,
    mastered_cards: 0,
    favorite_cards: 0,
  },
  daily_review_counts: [],
  daily_accuracy: [],
  monthly_review_counts: [],
  tag_distribution: [],
  rating_trend: [],
};

// --- Tests ---

describe('StatisticsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('loading and ready state', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('shows loading state initially', () => {
      render(<StatisticsPage />);
      expect(screen.getByText('加载中…')).toBeInTheDocument();
    });

    it('does not render the top statistics hero header', async () => {
      render(<StatisticsPage />);

      await screen.findByText('248');
      expect(screen.queryByText('REVIEW ANALYTICS')).not.toBeInTheDocument();
      expect(screen.queryByText('看到复习节奏，而不是表格噪音。')).not.toBeInTheDocument();
      expect(screen.queryByText(/统计页聚焦词义总量/)).not.toBeInTheDocument();
    });

    it('renders 总词义条目数量 248', async () => {
      render(<StatisticsPage />);
      expect(await screen.findByText('248')).toBeInTheDocument();
      expect(screen.getByText(/总词义条目数量/)).toBeInTheDocument();
    });

    it('renders 复习中数量 183', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('183')).toBeInTheDocument();
      expect(screen.getByText(/复习中数量/)).toBeInTheDocument();
    });

    it('renders 已熟记数量 41', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('41')).toBeInTheDocument();
      expect(screen.getByText(/已熟记数量/)).toBeInTheDocument();
    });

    it('renders 收藏数量 24', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText(/收藏数量/)).toBeInTheDocument();
    });
  });

  describe('recent 14-day chart', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('renders 最近 14 天数量图 section heading', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText(/最近 14 天数量图/)).toBeInTheDocument();
    });

    it('uses only the latest 14 records from daily_review_counts (15 entries fixture)', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // Scope bar labels to the recent 14-day chart section only
      const chartSection = screen.getByTestId('recent-14-chart');
      const barLabels = chartSection.querySelectorAll('.phase7-statistics-bar-label');
      const labelTexts = Array.from(barLabels).map((el) => el.textContent);
      expect(labelTexts).toContain('05-15');
      // The first entry (05-01, the excluded one) should not appear as a bar label
      expect(labelTexts).not.toContain('05-01');
      // 05-02 should be the first bar label
      expect(labelTexts[0]).toBe('05-02');
    });

    it('renders accessible summary for recent 14-day chart', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // The sr-only summary paragraph should contain the data for the chart
      const summary = document.getElementById('recent-14-summary');
      expect(summary).toBeInTheDocument();
      expect(summary?.textContent).toContain('05-02: 10');
      expect(summary?.textContent).toContain('05-15: 18');
    });
  });

  describe('monthly chart', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('renders 历史月份数量图 section heading', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText(/历史月份数量图/)).toBeInTheDocument();
    });

    it('renders month entry 2026-05 with count 531', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('531')).toBeInTheDocument();
      expect(screen.getByText('2026-05')).toBeInTheDocument();
    });

    it('renders month entry 2026-04 with count 310', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('310')).toBeInTheDocument();
      expect(screen.getByText('2026-04')).toBeInTheDocument();
    });
  });

  describe('accuracy chart', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('renders 每日正确率折线图 section heading', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText(/每日正确率折线图/)).toBeInTheDocument();
    });

    it('renders 80% accuracy from daily_accuracy fixture', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // 0.8 should render as 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('tag distribution', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('renders 标签分布 section heading', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // The section h2 has exactly "标签分布"; the hero copy also contains it, so target the heading
      expect(screen.getByRole('heading', { name: '标签分布' })).toBeInTheDocument();
    });

    it('renders tag name 美剧 from tag_distribution', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('美剧')).toBeInTheDocument();
    });

    it('renders tag name 读书 from tag_distribution', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      expect(screen.getByText('读书')).toBeInTheDocument();
    });
  });

  describe('Again / Good trend', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(fullStats));
    });

    it('renders Again section in trend area', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // The trend box label is a <p> with exactly "Again"
      const trendLabels = document.querySelectorAll('.phase7-statistics-trend-label');
      const texts = Array.from(trendLabels).map((el) => el.textContent);
      expect(texts).toContain('Again');
    });

    it('renders Good section in trend area', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      // The trend box label is a <p> with exactly "Good"
      const trendLabels = document.querySelectorAll('.phase7-statistics-trend-label');
      const texts = Array.from(trendLabels).map((el) => el.textContent);
      expect(texts).toContain('Good');
    });

    it('renders accessible summary for Again trend spark chart', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      const summary = screen.getByTestId('again-trend-summary');
      expect(summary).toBeInTheDocument();
      expect(summary.textContent).toContain('2026-05-14: 4');
      expect(summary.textContent).toContain('2026-05-15: 3');
    });

    it('renders accessible summary for Good trend spark chart', async () => {
      render(<StatisticsPage />);
      await screen.findByText('248');
      const summary = screen.getByTestId('good-trend-summary');
      expect(summary).toBeInTheDocument();
      expect(summary.textContent).toContain('2026-05-14: 16');
      expect(summary.textContent).toContain('2026-05-15: 15');
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(emptyStats));
    });

    it('renders 还没有统计数据 when all arrays are empty', async () => {
      render(<StatisticsPage />);
      // totals should still show 0 values; empty message for charts
      expect(await screen.findByText(/还没有统计数据/)).toBeInTheDocument();
    });
  });

  describe('retryable error state', () => {
    it('shows error state with 重试 button on API failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({ error: 'database unavailable' }, 500),
      );

      render(<StatisticsPage />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('database unavailable');
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });

    it('retries and shows data after clicking 重试', async () => {
      let callCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(jsonResponse({ error: 'transient error' }, 500));
        }
        return Promise.resolve(jsonResponse(fullStats));
      });

      render(<StatisticsPage />);

      await screen.findByRole('alert');

      fireEvent.click(screen.getByRole('button', { name: '重试' }));

      expect(await screen.findByText('248')).toBeInTheDocument();
    });
  });
});
