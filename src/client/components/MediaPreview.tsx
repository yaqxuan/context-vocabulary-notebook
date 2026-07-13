import { useEffect, useState } from 'react';

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
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  if (!isAvailable || loadFailed) {
    return (
      <div className="vn-media-preview vn-media-preview--missing rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="vn-media-preview__title font-medium text-slate-800">{fileName}</p>
        <p className="vn-media-preview__message">{t('common.fileUnavailable')}</p>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <figure className="vn-media-preview vn-media-preview--video">
        <video className="vn-media-preview__video" src={src} controls preload="metadata" playsInline aria-label={fileName} onError={() => setLoadFailed(true)} />
        <figcaption className="vn-media-preview__caption">{fileName}</figcaption>
      </figure>
    );
  }

  if (mediaType === 'audio') {
    return (
      <figure className="vn-media-preview vn-media-preview--audio">
        <audio className="vn-media-preview__audio" src={src} controls preload="metadata" aria-label={fileName} onError={() => setLoadFailed(true)} />
        <figcaption className="vn-media-preview__caption">{fileName}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="vn-media-preview vn-media-preview--image">
      <img className="vn-media-preview__image" src={src} alt={fileName} onError={() => setLoadFailed(true)} />
      <figcaption className="vn-media-preview__caption">{fileName}</figcaption>
    </figure>
  );
}
