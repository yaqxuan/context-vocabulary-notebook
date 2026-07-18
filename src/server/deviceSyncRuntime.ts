import path from 'node:path';
import type { Database } from 'better-sqlite3';
import { startLanSyncServer, type LanSyncServer } from './lanServer.js';

export class DeviceSyncRuntime {
  private lanServer: LanSyncServer | null = null;
  private operation: Promise<void> | null = null;

  constructor(
    private readonly db: Database,
    private readonly uploadsDir: string,
    private readonly identityDir: string,
    private readonly options: { advertise?: boolean } = {},
  ) {}

  get lanRunning(): boolean {
    return this.lanServer !== null;
  }

  async startConfiguredLan(): Promise<void> {
    const config = this.db.prepare('SELECT lan_enabled FROM sync_server_config WHERE id = 1')
      .get() as { lan_enabled: number };
    if (config.lan_enabled === 1 || process.env.CVN_LAN_SYNC === '1') await this.setLanEnabled(true);
  }

  async setLanEnabled(enabled: boolean): Promise<void> {
    const operation = (this.operation ?? Promise.resolve())
      .then(() => this.applyLanState(enabled));
    this.operation = operation;
    try {
      await operation;
    } finally {
      if (this.operation === operation) this.operation = null;
    }
  }

  private async applyLanState(enabled: boolean): Promise<void> {
    if (enabled && !this.lanServer) {
      const config = this.db.prepare('SELECT lan_port FROM sync_server_config WHERE id = 1')
        .get() as { lan_port: number };
      const port = Number(process.env.LAN_SYNC_PORT ?? config.lan_port);
      this.lanServer = await startLanSyncServer({
        db: this.db,
        uploadsDir: this.uploadsDir,
        identityDir: path.resolve(this.identityDir),
        port,
        advertise: this.options.advertise,
      });
    } else if (!enabled && this.lanServer) {
      const current = this.lanServer;
      this.lanServer = null;
      await current.close();
    }
    this.db.prepare('UPDATE sync_server_config SET lan_enabled = ?, updated_at = ? WHERE id = 1')
      .run(enabled ? 1 : 0, new Date().toISOString());
  }

  async close(): Promise<void> {
    if (!this.lanServer) return;
    const current = this.lanServer;
    this.lanServer = null;
    await current.close();
  }
}
