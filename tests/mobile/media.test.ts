import { describe, expect, it } from 'vitest';

import { normalizeNativeMediaPath } from '../../src/mobile/media.js';

describe('Android private media paths', () => {
  it('repairs the single-slash file URI returned by older APKs', () => {
    expect(normalizeNativeMediaPath('file:/data/user/0/io.example/files/cvn-media/video.mp4'))
      .toBe('/data/user/0/io.example/files/cvn-media/video.mp4');
  });

  it('preserves absolute paths and valid file URLs', () => {
    expect(normalizeNativeMediaPath('/data/user/0/io.example/files/cvn-media/video.mp4'))
      .toBe('/data/user/0/io.example/files/cvn-media/video.mp4');
    expect(normalizeNativeMediaPath('file:///data/user/0/io.example/files/cvn-media/video.mp4'))
      .toBe('file:///data/user/0/io.example/files/cvn-media/video.mp4');
  });
});
