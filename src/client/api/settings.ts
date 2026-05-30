import type { PatchSettingsBody, SettingsDto } from '../../shared/types';
import { apiRequest } from './client';

export function getSettings(): Promise<SettingsDto> {
  return apiRequest<SettingsDto>('/settings');
}

export function patchSettings(body: PatchSettingsBody): Promise<SettingsDto> {
  return apiRequest<SettingsDto>('/settings', { method: 'PATCH', json: body });
}
