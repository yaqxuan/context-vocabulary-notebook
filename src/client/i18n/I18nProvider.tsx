import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DEFAULT_INTERFACE_LANGUAGE, normalizeSupportedLanguage } from '../../shared/constants';
import { getSettings } from '../api/settings';
import { translations } from './translations';
import type { I18nContextValue, TranslationKey, TranslationParams, UiLanguage } from './types';

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(DEFAULT_INTERFACE_LANGUAGE);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((settings) => {
        if (active) {
          const lang = normalizeSupportedLanguage(settings.interface_language);
          if (lang) {
            setLanguageState(lang);
          }
        }
      })
      .catch(() => {
        // Fallback to default
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = (langStr: string) => {
    const normalized = normalizeSupportedLanguage(langStr);
    if (normalized) {
      setLanguageState(normalized);
    }
  };

  const t = (key: TranslationKey, params?: TranslationParams): string => {
    const dict = translations[language] || translations['中文'];
    const parts = key.split('.');
    
    // Resolve from active language dictionary
    let value: any = dict;
    for (const part of parts) {
      if (value === undefined || value === null) break;
      value = value[part];
    }
    
    // Fallback to Chinese dictionary
    if (typeof value !== 'string') {
      let zhValue: any = translations['中文'];
      for (const part of parts) {
        if (zhValue === undefined || zhValue === null) {
          throw new Error(`Translation key not found in source dictionary: ${key}`);
        }
        zhValue = zhValue[part];
      }
      if (typeof zhValue !== 'string') {
        throw new Error(`Translation key not found in source dictionary: ${key}`);
      }
      value = zhValue;
    }

    if (!params) return value;
    
    return value.replace(/\{([^}]+)\}/g, (match: string, paramKey: string) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
