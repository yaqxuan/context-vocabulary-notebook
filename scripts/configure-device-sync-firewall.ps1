param(
  [ValidateRange(1, 65535)][int]$Port = 3109,
  [switch]$HyperV
)

$ErrorActionPreference = 'Stop'

if ($HyperV) {
  $rule = Get-NetFirewallHyperVRule -Name 'CVNDeviceSync' -ErrorAction SilentlyContinue
  if ($rule) { Remove-NetFirewallHyperVRule -Name 'CVNDeviceSync' }
  New-NetFirewallHyperVRule `
    -Name 'CVNDeviceSync' `
    -DisplayName 'Context Vocabulary Notebook device sync' `
    -Direction Inbound `
    -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' `
    -Protocol TCP `
    -LocalPorts $Port | Out-Null
} else {
  $rule = Get-NetFirewallRule -Name 'CVNDeviceSync' -ErrorAction SilentlyContinue
  if ($rule) { Remove-NetFirewallRule -Name 'CVNDeviceSync' }
  New-NetFirewallRule `
    -Name 'CVNDeviceSync' `
    -DisplayName 'Context Vocabulary Notebook device sync' `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Private | Out-Null
}

Write-Output 'CVN_DEVICE_SYNC_FIREWALL_READY'
