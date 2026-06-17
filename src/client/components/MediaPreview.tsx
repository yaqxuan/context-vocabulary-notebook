import type { MediaType } from '../../shared/constants';
import { useI18n } from '../i18n/I18nProvider';

interface MediaPreviewProps {
  mediaType: MediaType;
  src: string;
  fileName: string;
  isAvailable: boolean;
}

export function MediaPreview({ mediaType, src, fileName, isAvailable }: MediaPreviewProps) {
  const { t } = useI18n();

  if (!isAvailable) {
    return (
      <div className="vn-media-preview vn-media-preview--missing rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="vn-media-preview__title font-medium text-slate-800">{fileName}</p>
        <p className="vn-media-preview__message">{t('common.fileUnavailable')}</p>
      </div>
    );
  }

  if (mediaType === 'video') {
    return <video className="vn-media-preview vn-media-preview--video vn-media-preview__video max-h-80 w-full rounded-xl bg-black" src={src} controls aria-label={fileName} />;
  }

  if (mediaType === 'audio') {
    return <audio className="vn-media-preview vn-media-preview--audio vn-media-preview__audio w-full" src={src} controls aria-label={fileName} />;
  }

  return <img className="vn-media-preview vn-media-preview--image vn-media-preview__image max-h-80 rounded-xl border border-slate-200 object-contain" src={src} alt={fileName} />;
}
