import { lookup } from 'node:dns/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn(async () => [{ address: '198.18.0.132', family: 4 }]);
  return { default: { lookup }, lookup };
});

const PROXY_ENV_KEYS = ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'all_proxy', 'no_proxy'] as const;

describe('AI provider HTTP safety', () => {
  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS;
    for (const key of PROXY_ENV_KEYS) delete process.env[key];
    vi.mocked(lookup).mockResolvedValue([{ address: '198.18.0.132', family: 4 }] as never);
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

  it('uses configured proxy environment for fake-ip AI provider DNS results', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    const request = await prepareSafeAiRequest('https://api.deepseek.com');

    expect(request).toMatchObject({
      baseUrl: 'https://api.deepseek.com',
      dispatcher: expect.any(Object),
      close: expect.any(Function),
    });
    await request?.close();
  });

  it('keeps blocking local AI provider hosts when proxy environment is configured', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('http://localhost')).resolves.toBeNull();
    await expect(prepareSafeAiRequest('http://127.0.0.1')).resolves.toBeNull();
    await expect(prepareSafeAiRequest('http://169.254.169.254')).resolves.toBeNull();
  });

  it('keeps blocking private DNS results when proxy environment is configured', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    vi.mocked(lookup).mockResolvedValue([{ address: '10.0.0.8', family: 4 }] as never);
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://internal.example.com')).resolves.toBeNull();
  });

  it('honors no_proxy before skipping fake-ip DNS validation', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    process.env.NO_PROXY = 'api.deepseek.com';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });

  it('honors whitespace-separated no_proxy hosts before skipping fake-ip DNS validation', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    process.env.NO_PROXY = 'localhost api.deepseek.com';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });

  it('lets lowercase no_proxy override uppercase NO_PROXY before skipping fake-ip DNS validation', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    process.env.NO_PROXY = 'example.com';
    process.env.no_proxy = 'api.deepseek.com';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });

  it('honors wildcard no_proxy hosts before skipping fake-ip DNS validation', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    process.env.NO_PROXY = '*.deepseek.com';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });

  it('ignores no_proxy entries when their port does not match the AI provider URL', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7897';
    process.env.NO_PROXY = 'api.deepseek.com:8080';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    const request = await prepareSafeAiRequest('https://api.deepseek.com');

    expect(request).toMatchObject({
      baseUrl: 'https://api.deepseek.com',
      dispatcher: expect.any(Object),
      close: expect.any(Function),
    });
    await request?.close();
  });

  it('does not skip fake-ip DNS validation for all_proxy alone', async () => {
    process.env.ALL_PROXY = 'http://127.0.0.1:7897';
    const { prepareSafeAiRequest } = await import('../../src/server/domain/aiProviderHttp.js');

    await expect(prepareSafeAiRequest('https://api.deepseek.com')).resolves.toBeNull();
  });
});
