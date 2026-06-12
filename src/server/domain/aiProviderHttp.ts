import { lookup } from 'node:dns/promises';
import net from 'node:net';

import { Agent, type Dispatcher } from 'undici';

export const AI_FETCH_TIMEOUT_MS = 15_000;

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function ipv4MappedToIpv4(address: string): string | null {
  const lower = stripIpv6Brackets(address).toLowerCase();
  const dottedMatch = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedMatch) return dottedMatch[1];

  const hexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hexMatch) return null;

  const high = Number.parseInt(hexMatch[1], 16);
  const low = Number.parseInt(hexMatch[2], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low) || high > 0xffff || low > 0xffff) return null;

  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

function isPrivateAiProviderAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_AI_PROVIDER_URLS === 'true';
}

function parseIpv4(address: string): number[] | null {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4) return null;
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
}

function isNonPublicIpv4(address: string): boolean {
  const parts = parseIpv4(address);
  if (!parts) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return a >= 224;
}

function isNonPublicIpv6(address: string): boolean {
  const normalized = stripIpv6Brackets(address).toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  const firstPart = normalized.split(':')[0] ?? '';
  const first = Number.parseInt(firstPart || '0', 16);
  if (!Number.isFinite(first)) return true;
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  return (first & 0xff00) === 0xff00;
}

function isBlockedAiAddress(address: string): boolean {
  if (isPrivateAiProviderAllowed()) return false;

  const normalized = (ipv4MappedToIpv4(address) ?? stripIpv6Brackets(address)).toLowerCase();
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isNonPublicIpv4(normalized);
  if (ipVersion === 6) return isNonPublicIpv6(normalized);
  return true;
}

function isBlockedAiHostname(hostname: string): boolean {
  if (isPrivateAiProviderAllowed()) return false;
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return normalized === 'localhost' || normalized === 'metadata.google.internal';
}

export function normalizeAiBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export interface SafeAiRequest {
  baseUrl: string;
  dispatcher?: Dispatcher;
  close: () => Promise<void>;
}

function createPinnedDnsDispatcher(dnsName: string, address: string, family: 4 | 6): Dispatcher {
  return new Agent({
    connect: {
      lookup: (hostname, _options, callback) => {
        const requested = hostname.toLowerCase().replace(/\.$/, '');
        if (requested !== dnsName) {
          callback(new Error('Unexpected AI provider hostname'), '', 0);
          return;
        }
        callback(null, address, family);
      },
    },
  });
}

export async function prepareSafeAiRequest(baseUrl: string): Promise<SafeAiRequest | null> {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  if (isPrivateAiProviderAllowed()) {
    return { baseUrl: normalizeAiBaseUrl(baseUrl), close: async () => {} };
  }

  const hostname = url.hostname.toLowerCase();
  const dnsName = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  if (isBlockedAiHostname(dnsName)) return null;

  const ipHostname = stripIpv6Brackets(hostname);
  if (net.isIP(ipHostname) !== 0) {
    if (isBlockedAiAddress(ipHostname)) return null;
    return { baseUrl: normalizeAiBaseUrl(baseUrl), close: async () => {} };
  }

  try {
    const results = await lookup(dnsName, { all: true, verbatim: true });
    const safeResults = results.filter((result) => !isBlockedAiAddress(result.address));
    if (safeResults.length !== results.length || safeResults.length === 0) return null;

    const selected = safeResults[0]!;
    const dispatcher = createPinnedDnsDispatcher(dnsName, selected.address, selected.family as 4 | 6);
    return { baseUrl: normalizeAiBaseUrl(baseUrl), dispatcher, close: () => dispatcher.close() };
  } catch {
    return null;
  }
}

export async function isSafeAiBaseUrl(baseUrl: string): Promise<boolean> {
  const request = await prepareSafeAiRequest(baseUrl);
  if (!request) return false;
  await request.close();
  return true;
}

export interface SafeAiFetchResult {
  response: Response;
  close: () => Promise<void>;
}

export async function fetchSafeAiProvider(baseUrl: string, path: string, init: RequestInit): Promise<SafeAiFetchResult | null> {
  const request = await prepareSafeAiRequest(baseUrl);
  if (!request) return null;

  try {
    const response = await fetch(`${request.baseUrl}${path}`, {
      ...init,
      dispatcher: request.dispatcher,
    } as RequestInit & { dispatcher?: Dispatcher });
    return { response, close: request.close };
  } catch (error) {
    await request.close();
    throw error;
  }
}

export async function closeUnreadSafeAiResponse(result: SafeAiFetchResult): Promise<void> {
  await result.response.body?.cancel().catch(() => undefined);
  await result.close();
}
