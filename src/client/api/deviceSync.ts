import type { PairingPayload, SignedConnectionProfile } from '../../shared/sync';
import { apiRequest } from './client';

export interface DeviceSyncConfig {
  server_id: string;
  tailscale_url: string | null;
  lan_enabled: number;
  lan_port: number;
  lan_fingerprint: string | null;
  lan_public_key: string | null;
  lan_service_name: string;
}

export interface SyncDevice {
  device_id: string;
  device_name: string;
  device_type: 'android';
  paired_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

export interface PairingRequest {
  session_id: string;
  status: 'created' | 'awaiting_approval' | 'approved' | 'denied';
  requested_device_id: string | null;
  requested_name: string | null;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
}

export interface WslNetworkStatus {
  is_wsl: boolean;
  networking_mode: 'mirrored' | 'nat' | 'unknown' | null;
  lan_supported: boolean;
  note: string | null;
  firewall_command: string | null;
  verify_command: string | null;
}

export interface DeviceSyncStatus {
  config: DeviceSyncConfig;
  devices: SyncDevice[];
  pairing_requests: PairingRequest[];
  wsl: WslNetworkStatus;
}

export interface TailscaleStatus {
  installed: boolean;
  online: boolean;
  dns_name: string | null;
  configured_url: string | null;
  serve_command: string;
  serve_available: boolean;
}

export const getDeviceSyncStatus = () => apiRequest<DeviceSyncStatus>('/device-sync/status');
export const getTailscaleStatus = () => apiRequest<TailscaleStatus>('/device-sync/tailscale');
export const createPairingSession = () => apiRequest<PairingPayload>('/device-sync/pairing-sessions', { method: 'POST' });
export const setLanEnabled = (enabled: boolean) => apiRequest<{ enabled: boolean; restart_required: boolean }>('/device-sync/lan', { method: 'PATCH', json: { enabled } });
export const setTailscaleUrl = (tailscaleUrl: string | null) => apiRequest<TailscaleStatus>('/device-sync/tailscale', { method: 'PATCH', json: { tailscale_url: tailscaleUrl } });
export const approvePairing = (sessionId: string) => apiRequest<SyncDevice>(`/device-sync/pairing-sessions/${encodeURIComponent(sessionId)}/approve`, { method: 'POST' });
export const denyPairing = (sessionId: string) => apiRequest<void>(`/device-sync/pairing-sessions/${encodeURIComponent(sessionId)}/deny`, { method: 'POST' });
export const revokeSyncDevice = (deviceId: string) => apiRequest<void>(`/device-sync/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
export const getConnectionProfile = () => apiRequest<SignedConnectionProfile>('/device-sync/connection-profile');
