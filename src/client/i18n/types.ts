import type { SupportedLanguage } from '../../shared/constants';
import type { zh } from './translations';

type Join<Prefix extends string, Key extends string> = Prefix extends '' ? Key : `${Prefix}.${Key}`;

type LeafKeys<T, Prefix extends string = ''> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Join<Prefix, Key>
    : T[Key] extends Record<string, unknown>
      ? LeafKeys<T[Key], Join<Prefix, Key>>
      : never;
}[keyof T & string];

export type UiLanguage = SupportedLanguage;
export type TranslationKey = LeafKeys<typeof zh>;
export type TranslationParams = Record<string, string | number>;
export type Translator = (key: TranslationKey, params?: TranslationParams) => string;

export interface I18nContextValue {
  language: UiLanguage;
  setLanguage: (language: string) => void;
  t: Translator;
}
