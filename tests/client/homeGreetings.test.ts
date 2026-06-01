import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGreetingContext,
  getHomeGreeting,
  StorageLike,
} from '../../src/client/lib/homeGreetings';

class MockStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  clear() {
    this.data.clear();
  }
}

class ThrowingStorage implements StorageLike {
  getItem(key: string): string | null {
    throw new Error('Storage disabled');
  }
  setItem(key: string, value: string): void {
    throw new Error('Storage disabled');
  }
}

describe('homeGreetings', () => {
  describe('getGreetingContext', () => {
    it('returns weekday and correct bucket for 04:00 Monday', () => {
      // 2026-06-01 is a Monday
      const d = new Date('2026-06-01T04:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '04:00-07:00',
        audience: 'weekday',
      });
    });

    it('returns weekday and correct bucket for 06:59 Monday', () => {
      const d = new Date('2026-06-01T06:59:59');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '04:00-07:00',
        audience: 'weekday',
      });
    });

    it('returns weekday and correct bucket for 07:00 Monday', () => {
      const d = new Date('2026-06-01T07:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'weekday',
      });
    });

    it('returns shared and correct bucket for 23:00 Monday', () => {
      const d = new Date('2026-06-01T23:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '23:00-04:00',
        audience: 'shared',
      });
    });

    it('returns shared and correct bucket for 03:59 Tuesday', () => {
      // 2026-06-02 is Tuesday
      const d = new Date('2026-06-02T03:59:59');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-02',
        bucket: '23:00-04:00',
        audience: 'shared',
      });
    });

    it('returns weekend and correct bucket for 04:00 Saturday', () => {
      // 2026-06-06 is Saturday
      const d = new Date('2026-06-06T04:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-06',
        bucket: '04:00-07:00',
        audience: 'weekend',
      });
    });

    it('returns weekend and correct bucket for 18:00 Sunday', () => {
      // 2026-06-07 is Sunday
      const d = new Date('2026-06-07T18:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-07',
        bucket: '18:00-21:00',
        audience: 'weekend',
      });
    });
  });

  describe('getHomeGreeting', () => {
    let storage: MockStorage;

    beforeEach(() => {
      storage = new MockStorage();
    });

    it('returns a stable selection if nothing in storage', () => {
      const now = new Date('2026-06-01T05:00:00');
      const selection1 = getHomeGreeting({ now, storage });
      expect(selection1.date).toBe('2026-06-01');
      expect(selection1.bucket).toBe('04:00-07:00');
      expect(selection1.audience).toBe('weekday');
      expect(selection1.text).toBeTruthy();

      const selection2 = getHomeGreeting({ now, storage });
      expect(selection2.text).toBe(selection1.text);
    });

    it('uses stored selection if valid', () => {
      const now = new Date('2026-06-01T08:00:00'); // 07:00-11:00 weekday

      const storedSelection = {
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'weekday',
        text: '早上好，今天刚刚开始。',
      };

      storage.setItem(
        'homeGreetingSelection:07:00-11:00:weekday',
        JSON.stringify(storedSelection)
      );

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).toBe('早上好，今天刚刚开始。');
    });

    it('ignores invalid stored selection and chooses a new one', () => {
      const now = new Date('2026-06-01T08:00:00');

      const storedSelection = {
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'weekday',
        text: 'This is not in the phrase bank.',
      };

      storage.setItem(
        'homeGreetingSelection:07:00-11:00:weekday',
        JSON.stringify(storedSelection)
      );

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).not.toBe('This is not in the phrase bank.');
      expect(selection.text).toBeTruthy();
    });

    it('avoids repeat from last selection when choosing new', () => {
      const now = new Date('2026-06-02T05:00:00'); // 04:00-07:00 weekday

      // Determine what the hash would normally pick for this date, bucket, audience
      // To reliably test this, let's inject a last text that is EXACTLY what it would have picked.
      const firstSelection = getHomeGreeting({ now, storage: new MockStorage() });
      const defaultText = firstSelection.text;

      storage.setItem('homeGreetingLast:04:00-07:00:weekday', defaultText);

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).not.toBe(defaultText);
      expect(selection.text).toBeTruthy();
    });

    it('falls back gracefully when storage throws', () => {
      const throwingStorage = new ThrowingStorage();
      const now = new Date('2026-06-01T05:00:00');

      // Should not throw
      const selection = getHomeGreeting({ now, storage: throwingStorage });
      expect(selection.text).toBeTruthy();
      expect(selection.bucket).toBe('04:00-07:00');
    });

    it('uses different strings for different days with no storage', () => {
      // Just test that the hash distributes a bit.
      const s = new MockStorage();
      const texts = new Set<string>();
      for (let day = 1; day <= 10; day++) {
        const d = new Date(`2026-06-${day.toString().padStart(2, '0')}T08:00:00`);
        texts.add(getHomeGreeting({ now: d, storage: s }).text);
      }
      expect(texts.size).toBeGreaterThan(1);
    });
  });
});
