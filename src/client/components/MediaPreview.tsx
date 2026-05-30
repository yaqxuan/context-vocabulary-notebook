import type { MediaType } from '../../shared/constants';

interface MediaPreviewProps {
  mediaType: MediaType;
  src: string;
  fileName: string;
  isAvailable: boolean;
}

export function MediaPreview({ mediaType, src, fileName, isAvailable }: MediaPreviewProps) {
  if (!isAvailable) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{fileName}</p>
        <p>文件不可用</p>
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
