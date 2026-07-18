$ErrorActionPreference = 'Stop'

$path = Join-Path $env:USERPROFILE '.wslconfig'
if (Test-Path -LiteralPath $path) {
  $backup = "$path.cvn-backup-$(Get-Date -Format yyyyMMddHHmmss)"
  Copy-Item -LiteralPath $path -Destination $backup
  $content = Get-Content -Raw -LiteralPath $path
} else {
  $content = ''
}

if ($content -match '(?im)^\s*\[wsl2\]\s*$') {
  if ($content -match '(?im)^\s*networkingMode\s*=.*$') {
    $content = [regex]::Replace($content, '(?im)^\s*networkingMode\s*=.*$', 'networkingMode=mirrored')
  } else {
    $content = [regex]::Replace($content, '(?im)^\s*\[wsl2\]\s*$', "[wsl2]`r`nnetworkingMode=mirrored", 1)
  }
} else {
  if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
  $content += "[wsl2]`r`nnetworkingMode=mirrored`r`n"
}

Set-Content -LiteralPath $path -Value $content -Encoding utf8
Write-Output 'CVN_WSL_MIRRORED_CONFIGURED'
