import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGreetingContext,
  getHomeGreeting,
  GREETING_PHRASES,
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
    it('returns shared and correct bucket for 04:00 Monday', () => {
      const d = new Date('2026-06-01T04:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '04:00-07:00',
        audience: 'shared',
      });
    });

    it('returns shared and correct bucket for 06:59 Monday', () => {
      const d = new Date('2026-06-01T06:59:59');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '04:00-07:00',
        audience: 'shared',
      });
    });

    it('returns shared and correct bucket for 07:00 Monday', () => {
      const d = new Date('2026-06-01T07:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'shared',
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
      const d = new Date('2026-06-02T03:59:59');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-02',
        bucket: '23:00-04:00',
        audience: 'shared',
      });
    });

    it('returns shared and correct bucket for 04:00 Saturday', () => {
      const d = new Date('2026-06-06T04:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-06',
        bucket: '04:00-07:00',
        audience: 'shared',
      });
    });

    it('returns shared and correct bucket for 18:00 Sunday', () => {
      const d = new Date('2026-06-07T18:00:00');
      expect(getGreetingContext(d)).toEqual({
        date: '2026-06-07',
        bucket: '18:00-21:00',
        audience: 'shared',
      });
    });
  });

  describe('GREETING_PHRASES', () => {
    it('uses 20 bilingual entries per shared time bucket', () => {
      const allPhrases = Object.values(GREETING_PHRASES).flat();
      expect(allPhrases).toHaveLength(140);
      expect(new Set(allPhrases.map((phrase) => phrase.text)).size).toBe(140);
      expect(new Set(allPhrases.map((phrase) => phrase.translation)).size).toBe(140);

      for (const phrases of Object.values(GREETING_PHRASES)) {
        expect(phrases).toHaveLength(20);
        for (const phrase of phrases) {
          expect(phrase.text).toEqual(expect.any(String));
          expect(phrase.translation).toEqual(expect.any(String));
          expect(phrase.text.length).toBeGreaterThan(20);
          expect(phrase.translation.length).toBeGreaterThan(20);
        }
      }
    });

    it('keeps weekday and weekend out of the phrase bank shape', () => {
      expect(Array.isArray(GREETING_PHRASES['07:00-11:00'])).toBe(true);
      expect(GREETING_PHRASES['07:00-11:00']).not.toHaveProperty('weekday');
      expect(GREETING_PHRASES['07:00-11:00']).not.toHaveProperty('weekend');
    });

    it('includes the supplied dawn and morning source copy with English translations', () => {
      expect(GREETING_PHRASES['04:00-07:00'][0]).toEqual({
        text: '天光未亮，世界还在沉睡，你已经翻开单词本——你是今天第一个醒来的灵魂，也是第一个拥抱词语的人。',
        translation: 'Before daylight, while the world still sleeps, you have already opened your vocabulary notebook—the first soul awake today, and the first to embrace words.',
      });
      expect(GREETING_PHRASES['07:00-11:00'][0]).toEqual({
        text: '阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。',
        translation: 'Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.',
      });
    });
  });

  describe('getHomeGreeting', () => {
    let storage: MockStorage;

    beforeEach(() => {
      storage = new MockStorage();
    });

    it('returns a stable bilingual selection if nothing in storage', () => {
      const now = new Date('2026-06-01T05:00:00');
      const selection1 = getHomeGreeting({ now, storage });
      expect(selection1.date).toBe('2026-06-01');
      expect(selection1.bucket).toBe('04:00-07:00');
      expect(selection1.audience).toBe('shared');
      expect(selection1.text).toBeTruthy();
      expect(selection1.translation).toBeTruthy();

      const selection2 = getHomeGreeting({ now, storage });
      expect(selection2.text).toBe(selection1.text);
      expect(selection2.translation).toBe(selection1.translation);
    });

    it('uses stored bilingual selection if valid', () => {
      const now = new Date('2026-06-01T08:00:00');

      const storedSelection = {
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'shared',
        text: '阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。',
        translation: 'Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.',
      };

      storage.setItem(
        'homeGreetingSelection:07:00-11:00:shared',
        JSON.stringify(storedSelection)
      );

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).toBe(storedSelection.text);
      expect(selection.translation).toBe(storedSelection.translation);
    });

    it('ignores invalid stored selection and chooses a new one', () => {
      const now = new Date('2026-06-01T08:00:00');

      const storedSelection = {
        date: '2026-06-01',
        bucket: '07:00-11:00',
        audience: 'shared',
        text: 'This is not in the phrase bank.',
        translation: 'This is not in the phrase bank.',
      };

      storage.setItem(
        'homeGreetingSelection:07:00-11:00:shared',
        JSON.stringify(storedSelection)
      );

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).not.toBe('This is not in the phrase bank.');
      expect(selection.translation).not.toBe('This is not in the phrase bank.');
    });

    it('avoids repeat from last selection when choosing new', () => {
      const now = new Date('2026-06-02T05:00:00');
      const firstSelection = getHomeGreeting({ now, storage: new MockStorage() });

      storage.setItem('homeGreetingLast:04:00-07:00:shared', firstSelection.text);

      const selection = getHomeGreeting({ now, storage });
      expect(selection.text).not.toBe(firstSelection.text);
      expect(selection.translation).toBeTruthy();
    });

    it('falls back gracefully when storage throws', () => {
      const throwingStorage = new ThrowingStorage();
      const now = new Date('2026-06-01T05:00:00');

      const selection = getHomeGreeting({ now, storage: throwingStorage });
      expect(selection.text).toBeTruthy();
      expect(selection.translation).toBeTruthy();
      expect(selection.bucket).toBe('04:00-07:00');
      expect(selection.audience).toBe('shared');
    });

    it('uses different strings for different days with no storage', () => {
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
