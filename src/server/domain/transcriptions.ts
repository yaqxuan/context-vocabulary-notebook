import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

import { TRANSCRIPTION_MESSAGES } from '../../shared/constants.js';
import type { TranscriptSegmentDto, TranscribeMediaResponseDto } from '../../shared/types.js';
import type { AiConfigRow } from './aiConfigs.js';
import { AI_FETCH_TIMEOUT_MS, closeUnreadSafeAiResponse, fetchSafeAiProvider, isSafeAiBaseUrl } from './aiProviderHttp.js';
import { resolveLocalRecognitionConfig } from './localRecognitionConfig.js';

const execFileAsync = promisify(execFile);

export interface ExtractAudioOptions {
  inputPath: string;
  outputPath: string;
}

export type AudioExtractor = (inputPath: string, outputPath: string) => Promise<string>;

export interface SpeechToTextOptions {
  config: AiConfigRow;
  audioPath: string;
  language?: string;
  responseFormat?: 'json' | 'text' | 'verbose_json';
}

export type SpeechToTextProvider = (options: SpeechToTextOptions) => Promise<TranscribeMediaResponseDto>;

interface VerboseTranscriptionResponse {
  text?: unknown;
  language?: unknown;
  segments?: unknown;
}

interface RawSegment {
  start?: unknown;
  end?: unknown;
  text?: unknown;
}

function none(message: string): TranscribeMediaResponseDto {
  return { status: 'none', text: '', segments: [], message };
}

export async function extractAudioWithFfmpeg(inputPath: string, outputPath: string): Promise<string> {
  const localConfig = resolveLocalRecognitionConfig();
  await execFileAsync(localConfig.ffmpeg.executablePath, [
    '-y',
    '-i', inputPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-ar', '16000',
    '-ac', '1',
    outputPath,
  ], { timeout: 60_000 });
  return outputPath;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSegments(value: unknown): TranscriptSegmentDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as RawSegment)
    .map((item) => ({
      start: typeof item.start === 'number' && Number.isFinite(item.start) ? item.start : 0,
      end: typeof item.end === 'number' && Number.isFinite(item.end) ? item.end : 0,
      text: cleanText(item.text),
    }))
    .filter((item) => item.text.length > 0);
}

async function fileToBlob(audioPath: string): Promise<Blob> {
  const buffer = await fs.readFile(audioPath);
  return new Blob([buffer], { type: 'audio/mpeg' });
}

export async function requestOpenAiTranscription(options: SpeechToTextOptions): Promise<TranscribeMediaResponseDto> {
  try {
    const form = new FormData();
    form.set('model', options.config.model);
    form.set('file', await fileToBlob(options.audioPath), 'audio.mp3');
    if (options.language) form.set('language', options.language);
    if (options.responseFormat) form.set('response_format', options.responseFormat);

    const upstream = await fetchSafeAiProvider(options.config.base_url, '/audio/transcriptions', {
      method: 'POST',
      headers: {
        Accept: 'application/json,text/plain',
        Authorization: `Bearer ${options.config.api_key}`,
      },
      body: form,
      redirect: 'manual',
      signal: AbortSignal.timeout(AI_FETCH_TIMEOUT_MS),
    });

    if (!upstream?.response.ok) {
      if (upstream) await closeUnreadSafeAiResponse(upstream);
      return none(TRANSCRIPTION_MESSAGES.unavailable);
    }

    try {
      const contentType = upstream.response.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await upstream.response.json() as VerboseTranscriptionResponse;
        const text = cleanText(data.text);
        if (!text) return none(TRANSCRIPTION_MESSAGES.empty);
        const result: TranscribeMediaResponseDto = {
          status: 'success',
          text,
          segments: parseSegments(data.segments),
        };
        const language = cleanText(data.language);
        if (language) result.language = language;
        return result;
      }

      const text = (await upstream.response.text()).trim();
      if (!text) return none(TRANSCRIPTION_MESSAGES.empty);
      return { status: 'success', text, segments: [] };
    } finally {
      await upstream.close();
    }
  } catch {
    return none(TRANSCRIPTION_MESSAGES.unavailable);
  }
}

export async function transcribeMedia(options: {
  config: AiConfigRow | undefined;
  inputPath: string;
  audioPath: string;
  language?: string;
  responseFormat?: 'json' | 'text' | 'verbose_json';
  extractor?: AudioExtractor;
  stt?: SpeechToTextProvider;
}): Promise<TranscribeMediaResponseDto> {
  if (!options.config) return none(TRANSCRIPTION_MESSAGES.noConfig);
  if (!(await isSafeAiBaseUrl(options.config.base_url))) return none(TRANSCRIPTION_MESSAGES.unavailable);

  const extractor = options.extractor ?? extractAudioWithFfmpeg;
  const stt = options.stt ?? requestOpenAiTranscription;

  try {
    await extractor(options.inputPath, options.audioPath);
  } catch {
    return none(TRANSCRIPTION_MESSAGES.ffmpegFailure);
  }

  const result = await stt({
    config: options.config,
    audioPath: options.audioPath,
    language: options.language,
    responseFormat: options.responseFormat,
  });

  if (result.status === 'success' && result.text.trim().length === 0) return none(TRANSCRIPTION_MESSAGES.empty);
  return result;
}
