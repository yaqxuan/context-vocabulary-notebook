import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../src/shared/constants';
import { getTranslationKeys, translations } from '../../src/client/i18n/translations';

function flattenStrings(value: unknown, prefix = ''): Array<{ key: string; value: string }> {
  if (typeof value === 'string') return [{ key: prefix, value }];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => (
    flattenStrings(nested, prefix ? `${prefix}.${key}` : key)
  ));
}

function hanOffenders(language: SupportedLanguage) {
  return flattenStrings(translations[language]).filter(({ value }) => /[一-鿿]/u.test(value));
}

describe('i18n translations', () => {
  it('defines dictionaries for all supported languages', () => {
    expect(Object.keys(translations).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('keeps every language on the same key set as Chinese', () => {
    const sourceKeys = getTranslationKeys(translations['中文']);
    for (const language of SUPPORTED_LANGUAGES) {
      expect(getTranslationKeys(translations[language])).toEqual(sourceKeys);
    }
  });

  it.each(['韩语', '英语', '法语', '德语', '西班牙语', '俄语'] as const)(
    'does not leave Chinese UI chrome in the %s dictionary',
    (language) => {
      expect(hanOffenders(language)).toEqual([]);
    },
  );

  it('localizes reported Korean settings, catalogue, favorites, and sidebar strings', () => {
    expect(translations['韩语'].settings.ai.title).not.toMatch(/[一-鿿]/u);
    expect(translations['韩语'].settings.export.title).not.toMatch(/[一-鿿]/u);
    expect(translations['韩语'].catalogue.search).not.toMatch(/[一-鿿]/u);
    expect(translations['韩语'].catalogue.clearFilters).not.toMatch(/[一-鿿]/u);
    expect(translations['韩语'].favorites.title).not.toMatch(/[一-鿿]/u);
    expect(translations['韩语'].nav.settings.label).not.toMatch(/[一-鿿]/u);
  });
});
