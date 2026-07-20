import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { X509Certificate, createHash, sign } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import selfsigned from 'selfsigned';
import { SYNC_PROTOCOL_VERSION, type SignedConnectionProfile } from '../../shared/sync.js';

export interface LanIdentity {
  privateKeyPem: string;
  certificatePem: string;
  spkiSha256: string;
  publicKeySpki: string;
}

function identityPaths(identityDir: string): { privateKey: string; certificate: string } {
  return {
    privateKey: path.join(identityDir, 'server-key.pem'),
    certificate: path.join(identityDir, 'server-cert.pem'),
  };
}

function protectPrivateKey(filePath: string): void {
  if (process.platform === 'win32') {
    const principal = execFileSync('whoami', [], { encoding: 'utf8', timeout: 2000 }).trim();
    execFileSync('icacls', [filePath, '/inheritance:r', '/grant:r', `${principal}:(F)`], {
      encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'ignore', 'pipe'],
    });
    return;
  }
  fs.chmodSync(filePath, 0o600);
}

export function lanAddresses(): string[] {
  const addresses = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (
        !entry.internal
        && (entry.family === 'IPv4' || entry.family === 'IPv6')
        && isAdvertisableLanAddress(entry.address)
      ) {
        addresses.add(entry.address);
      }
    }
  }
  return [...addresses].sort();
}

export function isAdvertisableLanAddress(input: string): boolean {
  const address = input.split('%')[0]!.toLowerCase();
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    // Tailnet addresses are valid inbound sources, but they must never be
    // advertised as ordinary LAN endpoints. Otherwise Android may save a
    // 100.64.0.0/10 address and silently depend on Tailscale being enabled.
    return a === 10
      || (a === 169 && b === 254)
      || (a === 172 && b! >= 16 && b! <= 31)
      || (a === 192 && b === 168);
  }
  if (net.isIP(address) !== 6) return false;
  // fd7a:115c:a1e0::/48 is Tailscale's ULA range. Link-local IPv6 addresses
  // require an interface scope id and are not portable inside a QR code.
  return (address.startsWith('fc') || address.startsWith('fd'))
    && !address.startsWith('fd7a:115c:a1e0:');
}

function publicIdentity(certificatePem: string): { spkiSha256: string; publicKeySpki: string } {
  const certificate = new X509Certificate(certificatePem);
  const spki = certificate.publicKey.export({ type: 'spki', format: 'der' });
  return {
    spkiSha256: createHash('sha256').update(spki).digest('base64url'),
    publicKeySpki: Buffer.from(spki).toString('base64url'),
  };
}

export async function ensureLanIdentity(db: Database, identityDir: string): Promise<LanIdentity> {
  const paths = identityPaths(identityDir);
  fs.mkdirSync(identityDir, { recursive: true, mode: 0o700 });
  let privateKeyPem: string;
  let certificatePem: string;
  if (fs.existsSync(paths.privateKey) && fs.existsSync(paths.certificate)) {
    privateKeyPem = fs.readFileSync(paths.privateKey, 'utf8');
    certificatePem = fs.readFileSync(paths.certificate, 'utf8');
  } else {
    const altNames = [
      { type: 2 as const, value: 'context-vocabulary-notebook.local' },
      { type: 2 as const, value: 'localhost' },
      { type: 7 as const, ip: '127.0.0.1' },
      { type: 7 as const, ip: '::1' },
      ...lanAddresses().map((ip) => ({ type: 7 as const, ip })),
    ];
    const generated = await selfsigned.generate(
      [{ name: 'commonName', value: 'Context Vocabulary Notebook' }],
      {
        keyType: 'ec',
        curve: 'P-256',
        algorithm: 'sha256',
        notAfterDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        extensions: [
          { name: 'basicConstraints', cA: false, critical: true },
          { name: 'keyUsage', digitalSignature: true, keyAgreement: true, critical: true },
          { name: 'extKeyUsage', serverAuth: true },
          { name: 'subjectAltName', altNames },
        ],
      },
    );
    privateKeyPem = generated.private;
    certificatePem = generated.cert;
    const tempKey = `${paths.privateKey}.tmp`;
    const tempCert = `${paths.certificate}.tmp`;
    fs.writeFileSync(tempKey, privateKeyPem, { mode: 0o600 });
    fs.writeFileSync(tempCert, certificatePem, { mode: 0o644 });
    fs.renameSync(tempKey, paths.privateKey);
    fs.renameSync(tempCert, paths.certificate);
  }
  protectPrivateKey(paths.privateKey);
  const { spkiSha256, publicKeySpki } = publicIdentity(certificatePem);
  db.prepare('UPDATE sync_server_config SET lan_fingerprint = ?, lan_public_key = ?, updated_at = ? WHERE id = 1')
    .run(spkiSha256, publicKeySpki, new Date().toISOString());
  return { privateKeyPem, certificatePem, spkiSha256, publicKeySpki };
}

export function lanUrls(port: number): string[] {
  return lanAddresses().map((address) => `https://${address.includes(':') ? `[${address}]` : address}:${port}`);
}

export function signedConnectionProfile(db: Database, identity: LanIdentity): SignedConnectionProfile {
  const config = db.prepare(`
    SELECT server_id, tailscale_url, lan_port, lan_service_name
    FROM sync_server_config WHERE id = 1
  `).get() as { server_id: string; tailscale_url: string | null; lan_port: number; lan_service_name: string };
  const profile: SignedConnectionProfile['profile'] = {
    protocol_version: SYNC_PROTOCOL_VERSION,
    server_id: config.server_id,
    tailscale_url: config.tailscale_url,
    lan_service_name: config.lan_service_name,
    lan_urls: lanUrls(config.lan_port),
    lan_spki_sha256: identity.spkiSha256,
    issued_at: new Date().toISOString(),
  };
  const signature = sign('sha256', Buffer.from(JSON.stringify(profile)), identity.privateKeyPem).toString('base64url');
  return { profile, signature };
}
