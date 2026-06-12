import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecognitionSetupCard } from '../../src/client/components/RecognitionSetupCard';

function readiness() {
  return {
    ffmpeg: { ready: true, message: 'ffmpeg is ready' },
    stt: {
      provider: 'whisper.cpp' as const,
      ready: true,
      executablePath: 'whisper-cli',
      modelPath: '/models/ggml-base.en.bin',
      language: 'ja',
      message: 'ready',
      modelWarning: 'English-only Whisper model is not recommended for 日语.',
    },
    ocr: {
      provider: 'tesseract' as const,
      ready: false,
      executablePath: 'tesseract',
      language: 'jpn',
      requiredLanguage: 'jpn',
      installedLanguages: ['eng'],
      languageReady: false,
      languageMessage: 'Tesseract language data jpn is missing.',
      message: 'Tesseract language data jpn is missing.',
    },
  };
}

describe('RecognitionSetupCard', () => {
  afterEach(() => cleanup());

  it('shows readiness warnings and copyable commands for the selected language', () => {
    render(<RecognitionSetupCard targetLanguage="日语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />);

    expect(screen.getByText('本地识别配置 · 日本語')).toBeInTheDocument();
    expect(screen.getByText(/English-only Whisper model/)).toBeInTheDocument();
    expect(screen.getAllByText(/jpn is missing/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '查看安装命令' }));

    expect(screen.getByText(/sudo apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-jpn/)).toBeInTheDocument();
    expect(screen.getByText(/CVN_WHISPER_CPP_MODEL=\/absolute\/path\/to\/ggml-small.bin/)).toBeInTheDocument();
  });

  it('calls refresh when the user asks to rerun checks', () => {
    const onRefresh = vi.fn();
    render(<RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button', { name: '我已安装，重新检测' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
