import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../../src/shared/constants';
import { getTranslationKeys, translations } from '../../src/client/i18n/translations';

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
});
