import { describe, expect, it, vi } from 'vitest';

import {
  extractWavAudioWithFfmpeg,
  requestWhisperCppTranscription,
  type ExecFileRunner,
} from '../../src/server/domain/localWhisper.js';

describe('local whisper.cpp transcription', () => {
  it('extracts mono 16k wav audio with configured ffmpeg', async () => {
    const runner = vi.fn(async () => ({ stdout: '', stderr: '' })) satisfies ExecFileRunner;

    await expect(extractWavAudioWithFfmpeg('/tmp/input.mp4', '/tmp/audio.wav', '/opt/ffmpeg', runner)).resolves.toBe('/tmp/audio.wav');

    expect(runner).toHaveBeenCalledWith('/opt/ffmpeg', [
      '-y',
      '-i', '/tmp/input.mp4',
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-c:a', 'pcm_s16le',
      '/tmp/audio.wav',
    ], { timeout: 60_000 });
  });

  it('returns none when whisper model path is empty', async () => {
    const runner = vi.fn(async () => ({ stdout: 'ignored', stderr: '' })) satisfies ExecFileRunner;

    await expect(requestWhisperCppTranscription({
      executablePath: 'whisper-cli',
      modelPath: '',
      audioPath: '/tmp/audio.wav',
      timeoutMs: 1000,
      runner,
    })).resolves.toEqual({
      status: 'none',
      text: '',
      segments: [],
      message: 'whisper.cpp model path is not configured',
    });
    expect(runner).not.toHaveBeenCalled();
  });

  it('runs whisper-cli without shell and parses text output', async () => {
    const runner = vi.fn(async () => ({
      stdout: 'whisper_init_from_file: loading model\n[00:00:00.000 --> 00:00:02.000] Hello world.\nmain: processing done\n',
      stderr: '',
    })) satisfies ExecFileRunner;

    await expect(requestWhisperCppTranscription({
      executablePath: '/bin/whisper-cli',
      modelPath: '/models/ggml.bin',
      audioPath: '/tmp/audio.wav',
      language: 'en',
      timeoutMs: 2000,
      runner,
    })).resolves.toEqual({ status: 'success', text: 'Hello world.', segments: [] });

    expect(runner).toHaveBeenCalledWith('/bin/whisper-cli', [
      '-m', '/models/ggml.bin',
      '-f', '/tmp/audio.wav',
      '-otxt',
      '-l', 'en',
    ], { timeout: 2000 });
  });

  it('returns none for empty output and command failure', async () => {
    const emptyRunner = vi.fn(async () => ({ stdout: 'main: only progress\n', stderr: '' })) satisfies ExecFileRunner;
    await expect(requestWhisperCppTranscription({
      executablePath: 'whisper-cli',
      modelPath: '/models/ggml.bin',
      audioPath: '/tmp/audio.wav',
      timeoutMs: 1000,
      runner: emptyRunner,
    })).resolves.toEqual({ status: 'none', text: '', segments: [], message: 'Transcript empty' });

    const failingRunner = vi.fn(async () => { throw new Error('boom'); }) satisfies ExecFileRunner;
    await expect(requestWhisperCppTranscription({
      executablePath: 'whisper-cli',
      modelPath: '/models/ggml.bin',
      audioPath: '/tmp/audio.wav',
      timeoutMs: 1000,
      runner: failingRunner,
    })).resolves.toEqual({ status: 'none', text: '', segments: [], message: 'whisper.cpp transcription unavailable' });
  });
});
