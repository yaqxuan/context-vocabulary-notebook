import { describe, expect, it } from 'vitest';

import { orderedAvailableLanguages, resolveLearningLanguage } from '../../src/mobile/learningLanguage.js';

describe('Android learning-language selection', () => {
  it('uses the PC language for the first snapshot and orders languages consistently', () => {
    expect(resolveLearningLanguage({
      pcTargetLanguage: '英语',
      targetLanguageOverride: null,
      overrideBasePcTargetLanguage: null,
      availableTargetLanguages: ['日语', '英语', '日语'],
    })).toMatchObject({
      pcTargetLanguage: '英语',
      effectiveTargetLanguage: '英语',
      targetLanguageOverride: null,
      followsPc: true,
      availableTargetLanguages: ['英语', '日语'],
    });
  });

  it('keeps an offline override while the PC default remains unchanged', () => {
    expect(resolveLearningLanguage({
      pcTargetLanguage: '英语',
      targetLanguageOverride: '日语',
      overrideBasePcTargetLanguage: '英语',
      availableTargetLanguages: ['英语', '日语', '韩语'],
    })).toMatchObject({ effectiveTargetLanguage: '日语', targetLanguageOverride: '日语', followsPc: false });
  });

  it('clears the override after the PC default changes', () => {
    expect(resolveLearningLanguage({
      pcTargetLanguage: '韩语',
      targetLanguageOverride: '日语',
      overrideBasePcTargetLanguage: '英语',
      availableTargetLanguages: ['英语', '日语', '韩语'],
    })).toMatchObject({ effectiveTargetLanguage: '韩语', targetLanguageOverride: null, followsPc: true });
  });

  it('clears an override whose language disappeared without changing other languages', () => {
    const result = resolveLearningLanguage({
      pcTargetLanguage: '英语',
      targetLanguageOverride: '日语',
      overrideBasePcTargetLanguage: '英语',
      availableTargetLanguages: ['英语', '法语'],
    });
    expect(result).toMatchObject({ effectiveTargetLanguage: '英语', targetLanguageOverride: null });
    expect(orderedAvailableLanguages(['not-a-language', '法语', null, '英语'])).toEqual(['英语', '法语']);
  });
});
