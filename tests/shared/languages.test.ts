import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DEFINITION_LANGUAGE,
  DEFAULT_INTERFACE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeSupportedLanguage,
} from '../../src/shared/constants.js';
import { isSupportedLanguage } from '../../src/shared/validators.js';

describe('shared language helpers', () => {
  it('defines the exact supported language list and defaults', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语']);
    expect(DEFAULT_INTERFACE_LANGUAGE).toBe('中文');
    expect(DEFAULT_TARGET_LANGUAGE).toBe('英语');
    expect(DEFAULT_DEFINITION_LANGUAGE).toBe('中文');
  });

  it('normalizes legacy aliases to supported display values', () => {
    expect(normalizeSupportedLanguage('zh-CN')).toBe('中文');
    expect(normalizeSupportedLanguage('zh')).toBe('中文');
    expect(normalizeSupportedLanguage('Chinese')).toBe('中文');
    expect(normalizeSupportedLanguage('英文')).toBe('英语');
    expect(normalizeSupportedLanguage('ja-JP')).toBe('日语');
    expect(normalizeSupportedLanguage('日本語')).toBe('日语');
    expect(normalizeSupportedLanguage('한국어')).toBe('韩语');
    expect(normalizeSupportedLanguage('Français')).toBe('法语');
    expect(normalizeSupportedLanguage('Deutsch')).toBe('德语');
    expect(normalizeSupportedLanguage('Español')).toBe('西班牙语');
    expect(normalizeSupportedLanguage('Русский')).toBe('俄语');
  });

  it('rejects unsupported or blank values', () => {
    expect(normalizeSupportedLanguage('Italian')).toBeNull();
    expect(normalizeSupportedLanguage('')).toBeNull();
    expect(isSupportedLanguage('英语')).toBe(true);
    expect(isSupportedLanguage('英文')).toBe(false);
  });
});
