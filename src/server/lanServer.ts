import https from 'node:https';
import net from 'node:net';
import type { Database } from 'better-sqlite3';
import Bonjour from 'bonjour-service';
import { ensureLanIdentity } from './domain/lanIdentity.js';
import { createSyncApp } from './syncApp.js';

export function isPrivateNetworkAddress(input: string | undefined): boolean {
  if (!input) return false;
  const address = input.startsWith('::ffff:') ? input.slice(7) : input.split('%')[0]!;
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || (a === 100 && b! >= 64 && b! <= 127) || (a === 169 && b === 254) || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168);
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb');
  }
  return false;
}

export interface LanSyncServer {
  server: https.Server;
  close: () => Promise<void>;
}

export async function startLanSyncServer(options: {
  db: Database;
  uploadsDir: string;
  identityDir: string;
  port?: number;
  host?: string;
  advertise?: boolean;
}): Promise<LanSyncServer> {
  const port = options.port ?? 3109;
  const identity = await ensureLanIdentity(options.db, options.identityDir);
  const app = createSyncApp(options.db, options.uploadsDir, { allowRemoteAddress: isPrivateNetworkAddress });
  const server = https.createServer({ key: identity.privateKeyPem, cert: identity.certificatePem, minVersion: 'TLSv1.2' }, app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, options.host ?? '::', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const config = options.db.prepare('SELECT server_id, lan_service_name FROM sync_server_config WHERE id = 1').get() as { server_id: string; lan_service_name: string };
  const bonjour = options.advertise === false ? null : new Bonjour();
  const service = bonjour?.publish({
    name: config.lan_service_name,
    type: 'cvn-sync',
    protocol: 'tcp',
    port,
    txt: { server_id: config.server_id, protocol: '1', fingerprint: identity.spkiSha256.slice(0, 16) },
  });
  return {
    server,
    close: async () => {
      service?.stop();
      bonjour?.destroy();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
