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
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{fileName}</p>
        <p>{t('common.fileUnavailable')}</p>
      </div>
    );
  }

  if (mediaType === 'video') {
    return <video className="max-h-80 w-full rounded-xl bg-black" src={src} controls aria-label={fileName} />;
  }

  if (mediaType === 'audio') {
    return <audio className="w-full" src={src} controls aria-label={fileName} />;
  }

  return <img className="max-h-80 rounded-xl border border-slate-200 object-contain" src={src} alt={fileName} />;
}
