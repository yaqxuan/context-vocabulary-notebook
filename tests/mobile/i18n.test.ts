import { describe, expect, it } from 'vitest';

import { SUPPORTED_LANGUAGES } from '../../src/shared/constants.js';
import { MobileError } from '../../src/mobile/errors.js';
import { formatMobileError, formatMobileText, mobileLocale, mobileTranslations } from '../../src/mobile/i18n.js';

describe('Android eight-language interface', () => {
  it('provides every top-level string and every known error in all eight languages', () => {
    const englishKeys = Object.keys(mobileTranslations.英语).sort();
    const errorKeys = Object.keys(mobileTranslations.英语.errors).sort();
    expect(SUPPORTED_LANGUAGES).toHaveLength(8);
    for (const language of SUPPORTED_LANGUAGES) {
      const translation = mobileTranslations[language];
      expect(Object.keys(translation).sort()).toEqual(englishKeys);
      expect(Object.keys(translation.errors).sort()).toEqual(errorKeys);
      for (const value of Object.values(translation)) {
        if (typeof value === 'string') expect(value.trim()).not.toBe('');
      }
      for (const value of Object.values(translation.errors)) expect(value.trim()).not.toBe('');
      expect(mobileLocale(language)).toMatch(/^[a-z]{2}-[A-Z]{2}$/u);
    }
  });

  it('formats localized status values and preserves unknown technical details', () => {
    expect(formatMobileText(mobileTranslations.中文.followPc, { language: '日本語' })).toBe('跟随电脑（日本語）');
    const text = formatMobileError(new MobileError('unknown', 'socket closed'), mobileTranslations.中文);
    expect(text).toContain('发生了未知错误');
    expect(text).toContain('socket closed');
  });

  it('uses localized known errors instead of English fallbacks', () => {
    for (const language of SUPPORTED_LANGUAGES.filter((value) => value !== '英语')) {
      expect(mobileTranslations[language].errors.not_paired).not.toBe(mobileTranslations.英语.errors.not_paired);
      expect(mobileTranslations[language].downloadingLibrary).not.toBe(mobileTranslations.英语.downloadingLibrary);
    }
  });
});
