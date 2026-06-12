import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn(async () => [{ address: '198.18.0.132', family: 4 }]);
  return { default: { lookup }, lookup };
});

describe('AI provider HTTP safety', () => {
  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS;
    vi.resetModules();
  });

  it('does not pin a dispatcher when private AI provider URLs are explicitly allowed', async () => {
    process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS = 'true';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    const request = await prepareSafeAiRequest('https://api.deepseek.com');

    expect(request).toEqual({
      baseUrl: 'https://api.deepseek.com',
      close: expect.any(Function),
    });
    expect(request).not.toHaveProperty('dispatcher');
  });

  it('rejects fake-ip AI provider DNS results by default', async () => {
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });
});
