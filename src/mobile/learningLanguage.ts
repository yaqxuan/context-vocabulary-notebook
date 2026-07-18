import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../shared/constants.js';

export interface LearningLanguageState {
  pcTargetLanguage: SupportedLanguage | null;
  effectiveTargetLanguage: SupportedLanguage | null;
  targetLanguageOverride: SupportedLanguage | null;
  availableTargetLanguages: SupportedLanguage[];
  followsPc: boolean;
}

export function asSupportedLanguage(value: unknown): SupportedLanguage | null {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? value as SupportedLanguage
    : null;
}

export function orderedAvailableLanguages(values: Iterable<unknown>): SupportedLanguage[] {
  const available = new Set(Array.from(values, asSupportedLanguage).filter((value): value is SupportedLanguage => value !== null));
  return SUPPORTED_LANGUAGES.filter((language) => available.has(language));
}

export function resolveLearningLanguage(input: {
  pcTargetLanguage: unknown;
  targetLanguageOverride: unknown;
  overrideBasePcTargetLanguage: unknown;
  availableTargetLanguages: Iterable<unknown>;
}): LearningLanguageState {
  const pcTargetLanguage = asSupportedLanguage(input.pcTargetLanguage);
  const targetLanguageOverride = asSupportedLanguage(input.targetLanguageOverride);
  const overrideBasePcTargetLanguage = asSupportedLanguage(input.overrideBasePcTargetLanguage);
  const availableTargetLanguages = orderedAvailableLanguages(input.availableTargetLanguages);
  const preserveOverride = targetLanguageOverride !== null
    && overrideBasePcTargetLanguage === pcTargetLanguage
    && availableTargetLanguages.includes(targetLanguageOverride);
  const effectiveTargetLanguage = preserveOverride
    ? targetLanguageOverride
    : pcTargetLanguage ?? availableTargetLanguages[0] ?? null;
  return {
    pcTargetLanguage,
    effectiveTargetLanguage,
    targetLanguageOverride: preserveOverride ? targetLanguageOverride : null,
    availableTargetLanguages,
    followsPc: !preserveOverride,
  };
}
