// Supported media types per require.md section 7
export const MEDIA_TYPES = ['video', 'image', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_SIZE_LIMITS_BYTES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 300 * 1024 * 1024,
};

export const MEDIA_SIZE_LIMIT_MESSAGES: Record<MediaType, string> = {
  image: '图片不能超过 10MB',
  audio: '音频不能超过 50MB',
  video: '视频不能超过 300MB',
};

export const TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

export const TRANSCRIPTION_MESSAGES = {
  sizeLimit: '转写文件不能超过 100MB',
  noConfig: 'No active AI config',
  unavailable: 'Transcription unavailable',
  ffmpegFailure: 'Audio extraction failed. Please install ffmpeg and retry.',
  empty: 'Transcript empty',
} as const;

export const ALLOWED_MIME_TYPES: Record<string, MediaType> = {
  'video/mp4': 'video',
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

export const ALLOWED_EXTENSIONS: Record<string, MediaType> = {
  '.mp4': 'video',
  '.mp3': 'audio',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
};

// Allowed pagination page sizes per require.md section 11.3
export const ALLOWED_PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 20;
export const DEFAULT_PAGE = 1;

// Card status values
export const CARD_STATUSES = ['reviewing', 'mastered'] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

// Review rating values
export const REVIEW_RATINGS = ['again', 'good'] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

// Language selector values
export const SUPPORTED_LANGUAGES = ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NATIVE_LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  中文: '中文',
  英语: 'English',
  日语: '日本語',
  韩语: '한국어',
  法语: 'Français',
  德语: 'Deutsch',
  西班牙语: 'Español',
  俄语: 'Русский',
};

export function getNativeLanguageLabel(language: SupportedLanguage): string {
  return NATIVE_LANGUAGE_LABELS[language];
}

export const LANGUAGE_ISO_639_1_CODES: Record<SupportedLanguage, string> = {
  中文: 'zh',
  英语: 'en',
  日语: 'ja',
  韩语: 'ko',
  法语: 'fr',
  德语: 'de',
  西班牙语: 'es',
  俄语: 'ru',
};

export function getLanguageIso6391Code(language: SupportedLanguage): string {
  return LANGUAGE_ISO_639_1_CODES[language];
}

export const DEFAULT_INTERFACE_LANGUAGE: SupportedLanguage = '中文';
export const DEFAULT_TARGET_LANGUAGE: SupportedLanguage = '英语';
export const DEFAULT_DEFINITION_LANGUAGE: SupportedLanguage = '中文';

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  'zh-cn': '中文',
  zh: '中文',
  chinese: '中文',
  '中文': '中文',
  'en-us': '英语',
  en: '英语',
  english: '英语',
  '英文': '英语',
  '英语': '英语',
  'ja-jp': '日语',
  ja: '日语',
  japanese: '日语',
  '日本語': '日语',
  '日语': '日语',
  'ko-kr': '韩语',
  ko: '韩语',
  '한국어': '韩语',
  '韩语': '韩语',
  'fr-fr': '法语',
  fr: '法语',
  'français': '法语',
  '法语': '法语',
  'de-de': '德语',
  de: '德语',
  deutsch: '德语',
  '德语': '德语',
  'es-es': '西班牙语',
  es: '西班牙语',
  'español': '西班牙语',
  '西班牙语': '西班牙语',
  'ru-ru': '俄语',
  ru: '俄语',
  'русский': '俄语',
  '俄语': '俄语',
};

export function normalizeSupportedLanguage(value: unknown): SupportedLanguage | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return LANGUAGE_ALIASES[normalized.toLowerCase()] ?? null;
}
