// Supported media types per require.md section 7
export const MEDIA_TYPES = ['video', 'image', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

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
