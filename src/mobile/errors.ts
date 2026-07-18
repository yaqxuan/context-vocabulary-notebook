export type MobileErrorCode =
  | 'unknown'
  | 'database_unavailable'
  | 'snapshot_invalid'
  | 'snapshot_protocol'
  | 'review_state_missing'
  | 'card_unavailable'
  | 'scanner_unsupported'
  | 'scanner_installing'
  | 'qr_not_read'
  | 'pairing_code_invalid'
  | 'pairing_transport_missing'
  | 'pairing_denied'
  | 'pairing_expired'
  | 'lan_not_configured'
  | 'tailscale_not_configured'
  | 'https_required'
  | 'server_mismatch'
  | 'upgrade_required'
  | 'profile_wrong_pc'
  | 'profile_signature_invalid'
  | 'pc_identity_changed'
  | 'not_paired'
  | 'http_error';

export class MobileError extends Error {
  constructor(
    public readonly code: MobileErrorCode,
    public readonly detail?: string,
    public readonly values: Record<string, string | number> = {},
  ) {
    super(detail ?? code);
    this.name = 'MobileError';
  }
}

export function toMobileError(error: unknown): MobileError {
  if (error instanceof MobileError) return error;
  return new MobileError('unknown', error instanceof Error ? error.message : String(error));
}
