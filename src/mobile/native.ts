import { registerPlugin } from '@capacitor/core';

export interface PinnedHttpResponse {
  status: number;
  body: string;
  contentType: string | null;
}

interface PinnedHttpPlugin {
  request(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    spkiSha256?: string;
  }): Promise<PinnedHttpResponse>;
  download(options: {
    url: string;
    sha256: string;
    headers?: Record<string, string>;
    spkiSha256?: string;
  }): Promise<{ path: string; bytes: number }>;
  verifySignature(options: { data: string; signature: string; publicKeySpki: string }): Promise<{ valid: boolean }>;
  clearMedia(options: { keepSha256: string[] }): Promise<{ removed: number }>;
}

export interface DiscoveredLanService {
  name: string;
  host: string;
  port: number;
  attributes: Record<string, string>;
}

interface LanDiscoveryPlugin {
  discover(): Promise<{ services: DiscoveredLanService[] }>;
}

export const PinnedHttp = registerPlugin<PinnedHttpPlugin>('PinnedHttp');
export const LanDiscovery = registerPlugin<LanDiscoveryPlugin>('LanDiscovery');
