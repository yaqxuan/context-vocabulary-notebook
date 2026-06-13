import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { TranscribeMediaResponseDto } from '../../shared/types.js';

const execFileAsync = promisify(execFile);

export type ExecFileRunner = (
  file: string,
  args: readonly string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

const defaultRunner: ExecFileRunner = async (file, args, options) => {
  const result = await execFileAsync(file, [...args], options);
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

function none(message: string): TranscribeMediaResponseDto {
  return { status: 'none', text: '', segments: [], message };
}

export async function extractWavAudioWithFfmpeg(
  inputPath: string,
  outputPath: string,
  executablePath = 'ffmpeg',
  runner: ExecFileRunner = defaultRunner,
): Promise<string> {
  await runner(executablePath, [
    '-y',
    '-i', inputPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-c:a', 'pcm_s16le',
    outputPath,
  ], { timeout: 60_000 });
  return outputPath;
}

export interface WhisperCppTranscriptionOptions {
  executablePath: string;
  modelPath: string;
  audioPath: string;
  language?: string;
  timeoutMs: number;
  runner?: ExecFileRunner;
}

function parseWhisperText(stdout: string): string {
  return stdout
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*\[[^\]]+\]\s*/u, '')
      .replace(/^\s*\([^)]*\)\s*/u, '')
      .replace(/^\s*whisper_[^:]+:\s*.*$/iu, '')
      .replace(/^\s*main:\s*.*$/iu, '')
      .trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export async function requestWhisperCppTranscription(
  options: WhisperCppTranscriptionOptions,
): Promise<TranscribeMediaResponseDto> {
  const modelPath = options.modelPath.trim();
  if (!modelPath) return none('whisper.cpp model path is not configured');

  const args = ['-m', modelPath, '-f', options.audioPath, '-otxt'];
  if (options.language?.trim()) args.push('-l', options.language.trim());

  try {
    const runner = options.runner ?? defaultRunner;
    const { stdout } = await runner(options.executablePath, args, { timeout: options.timeoutMs });
    const text = parseWhisperText(stdout);
    if (!text) return none('Transcript empty');
    return { status: 'success', text, segments: [] };
  } catch {
    return none('whisper.cpp transcription unavailable');
  }
}
