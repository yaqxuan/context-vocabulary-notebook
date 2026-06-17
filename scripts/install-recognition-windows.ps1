$ErrorActionPreference = "Stop"

$ProjectName = "context-vocabulary-notebook"
$ModelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
$TesseractInstallerUrl = "https://github.com/tesseract-ocr/tesseract/releases/download/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe"
$TesseractInstallerSha256 = "f3fc4236425b690c8be756f35793f77394ee004be0a6460a440c754d892f68bc"
$ExpectedTesseractVersion = "5.5.0.20241111"
$TesseractInstallerTimeoutSeconds = 180
$FfmpegZipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-06-14-13-33/ffmpeg-n7.1.4-39-ga5faeca88f-win64-gpl-7.1.zip"
$FfmpegZipSha256 = "9bf9423be2096818d950b05748b50538a9013913ee8e26813b66172eea9b4015"
$WhisperZipUrl = "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.6/whisper-bin-x64.zip"

$AppRoot = (Get-Location).Path
$ToolsRoot = Join-Path $AppRoot "tools"
$ModelsRoot = Join-Path $AppRoot "models"
$FfmpegRoot = Join-Path $ToolsRoot "ffmpeg"
$TesseractRoot = Join-Path $ToolsRoot "tesseract"
$TessdataRoot = Join-Path $TesseractRoot "tessdata"
$WhisperRoot = Join-Path $ToolsRoot "whisper.cpp"
$ModelPath = Join-Path $ModelsRoot "ggml-small.bin"
$EnvPath = Join-Path $AppRoot ".env"
$TesseractLang = if ($env:CVN_TESSERACT_LANG) { $env:CVN_TESSERACT_LANG } else { "eng" }

function Write-Step($Message) {
  Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Assert-TesseractLang($Language) {
  if ($Language -notmatch '^[A-Za-z0-9_]+(\+[A-Za-z0-9_]+)*$') {
    throw "Invalid CVN_TESSERACT_LANG: use codes like eng, jpn, or eng+chi_sim."
  }
}

function Test-ProjectDir($Path) {
  $PackageJson = Join-Path $Path "package.json"
  if (-not (Test-Path -LiteralPath $PackageJson -PathType Leaf)) {
    return $false
  }

  $PackageContent = Get-Content -Raw -LiteralPath $PackageJson
  return $PackageContent -match '"name"\s*:\s*"context-vocabulary-notebook"'
}

function Find-FirstFile($Root, $Filter) {
  if (-not (Test-Path -LiteralPath $Root)) { return $null }
  return Get-ChildItem -LiteralPath $Root -Recurse -Filter $Filter -File -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Download-File($Uri, $OutFile) {
  $OutDir = Split-Path -Parent $OutFile
  [System.IO.Directory]::CreateDirectory($OutDir) | Out-Null
  Invoke-WebRequest -Uri $Uri -OutFile $OutFile
}

function Assert-FileSha256($Path, $ExpectedHash) {
  $ActualHash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($ActualHash -ne $ExpectedHash.ToLowerInvariant()) {
    throw "SHA-256 mismatch for $Path. Expected $ExpectedHash, got $ActualHash."
  }
}

function Assert-TesseractVersion($TesseractExe) {
  $VersionLine = try { (& $TesseractExe --version 2>&1 | Select-Object -First 1) } catch { "" }
  if ($VersionLine -notmatch [regex]::Escape($ExpectedTesseractVersion)) {
    throw "Unexpected Tesseract version at $TesseractExe. Expected $ExpectedTesseractVersion, got: $VersionLine"
  }
}

function Invoke-TesseractInstaller($InstallerPath, $ArgumentList) {
  Write-Step "Starting Tesseract installer; this step times out after $TesseractInstallerTimeoutSeconds seconds."
  $Process = Start-Process -FilePath $InstallerPath -ArgumentList $ArgumentList -PassThru
  if (-not $Process.WaitForExit($TesseractInstallerTimeoutSeconds * 1000)) {
    try { Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue } catch {}
    throw "Tesseract installer did not finish within $TesseractInstallerTimeoutSeconds seconds. Close any Tesseract setup window, then rerun this command."
  }
  $Process.Refresh()
  return $Process.ExitCode
}

function Get-TesseractLanguages {
  return @($TesseractLang -split '\+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Install-TesseractLanguages {
  [System.IO.Directory]::CreateDirectory($TessdataRoot) | Out-Null
  foreach ($Language in Get-TesseractLanguages) {
    $TrainedData = Join-Path $TessdataRoot "$Language.traineddata"
    if ((Test-Path -LiteralPath $TrainedData -PathType Leaf) -and ((Get-Item -LiteralPath $TrainedData).Length -gt 0)) {
      Write-Step "Tesseract language data already exists at $TrainedData"
      continue
    }

    Write-Step "Downloading Tesseract language data $Language into $TessdataRoot"
    Download-File "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/$Language.traineddata" $TrainedData
  }
}

function Set-EnvValue($Key, $Value) {
  $Line = "$Key=$Value"
  $Pattern = "^{0}=" -f [regex]::Escape($Key)
  $Lines = @()
  if (Test-Path -LiteralPath $EnvPath -PathType Leaf) {
    $Lines = @(Get-Content -LiteralPath $EnvPath)
  }

  $NextLines = New-Object System.Collections.Generic.List[string]
  $Wrote = $false
  foreach ($ExistingLine in $Lines) {
    if ($ExistingLine -match $Pattern) {
      if (-not $Wrote) {
        $NextLines.Add($Line)
        $Wrote = $true
      }
      continue
    }
    $NextLines.Add($ExistingLine)
  }

  if (-not $Wrote) {
    $NextLines.Add($Line)
  }

  Set-Content -LiteralPath $EnvPath -Encoding UTF8 -Value $NextLines
}

function Install-Ffmpeg {
  $Existing = Find-FirstFile $FfmpegRoot "ffmpeg.exe"
  if ($Existing) {
    Write-Step "FFmpeg already installed at $($Existing.FullName)"
    return $Existing.FullName
  }

  Write-Step "Downloading FFmpeg into $FfmpegRoot"
  [System.IO.Directory]::CreateDirectory($FfmpegRoot) | Out-Null
  $ZipPath = Join-Path $ToolsRoot "ffmpeg-n7.1.4-39-ga5faeca88f-win64-gpl-7.1.zip"
  Download-File $FfmpegZipUrl $ZipPath
  Assert-FileSha256 $ZipPath $FfmpegZipSha256
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $FfmpegRoot -Force

  $Installed = Find-FirstFile $FfmpegRoot "ffmpeg.exe"
  if (-not $Installed) { throw "ffmpeg.exe not found under $FfmpegRoot after extraction." }
  return $Installed.FullName
}

function Install-Tesseract {
  $Existing = Find-FirstFile $TesseractRoot "tesseract.exe"
  if ($Existing) {
    Assert-TesseractVersion $Existing.FullName
    Write-Step "Tesseract already installed at $($Existing.FullName)"
    return $Existing.FullName
  }

  Write-Step "Installing Tesseract into $TesseractRoot"
  [System.IO.Directory]::CreateDirectory($TesseractRoot) | Out-Null
  $InstallerPath = Join-Path $ToolsRoot "tesseract-ocr-w64-setup-5.5.0.20241111.exe"
  $TesseractInstallDirArg = "/D=$TesseractRoot"
  Download-File $TesseractInstallerUrl $InstallerPath
  Assert-FileSha256 $InstallerPath $TesseractInstallerSha256
  $InstallExitCode = Invoke-TesseractInstaller $InstallerPath @("/S", $TesseractInstallDirArg)
  if (($null -eq $InstallExitCode) -or ($InstallExitCode -ne 0)) { throw "Tesseract installer failed with exit code $InstallExitCode" }

  $Installed = Find-FirstFile $TesseractRoot "tesseract.exe"
  if (-not $Installed) {
    $DefaultInstall = "C:\Program Files\Tesseract-OCR"
    $DefaultTesseract = Join-Path $DefaultInstall "tesseract.exe"
    if (Test-Path -LiteralPath $DefaultTesseract -PathType Leaf) {
      Assert-TesseractVersion $DefaultTesseract
      Write-Step "Tesseract installer used default location; copying executable and DLLs into $TesseractRoot"
      Copy-Item -LiteralPath $DefaultTesseract -Destination (Join-Path $TesseractRoot "tesseract.exe") -Force
      Get-ChildItem -LiteralPath $DefaultInstall -Filter "*.dll" -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $TesseractRoot -Force
      }
      $Installed = Find-FirstFile $TesseractRoot "tesseract.exe"
    }
  }

  if (-not $Installed) { throw "tesseract.exe not found under $TesseractRoot after install. Installer exit code: $InstallExitCode" }
  Assert-TesseractVersion $Installed.FullName
  return $Installed.FullName
}

function Install-WhisperCpp {
  $Existing = Find-FirstFile $WhisperRoot "whisper-cli.exe"
  if ($Existing) {
    Write-Step "whisper.cpp already installed at $($Existing.FullName)"
    return $Existing.FullName
  }

  Write-Step "Downloading whisper.cpp CLI into $WhisperRoot"
  [System.IO.Directory]::CreateDirectory($WhisperRoot) | Out-Null
  $ZipPath = Join-Path $ToolsRoot "whisper-bin-x64.zip"
  Download-File $WhisperZipUrl $ZipPath
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $WhisperRoot -Force

  $Installed = Find-FirstFile $WhisperRoot "whisper-cli.exe"
  if (-not $Installed) { throw "whisper-cli.exe not found under $WhisperRoot after extraction." }
  return $Installed.FullName
}

function Install-Model {
  if ((Test-Path -LiteralPath $ModelPath -PathType Leaf) -and ((Get-Item -LiteralPath $ModelPath).Length -gt 0)) {
    Write-Step "Whisper model already exists at $ModelPath"
    return
  }

  Write-Step "Downloading Whisper model into $ModelPath"
  Download-File $ModelUrl $ModelPath
}

function Write-RecognitionEnv($FfmpegExe, $TesseractExe, $WhisperExe) {
  Write-Step "Writing recognition settings to .env"
  Set-EnvValue "CVN_FFMPEG_PATH" $FfmpegExe
  Set-EnvValue "CVN_OCR_PROVIDER" "tesseract"
  Set-EnvValue "CVN_TESSERACT_PATH" $TesseractExe
  Set-EnvValue "CVN_TESSERACT_LANG" $TesseractLang
  Set-EnvValue "CVN_TESSERACT_TIMEOUT_MS" "30000"
  Set-EnvValue "CVN_STT_PROVIDER" "whisper.cpp"
  Set-EnvValue "CVN_WHISPER_CPP_PATH" $WhisperExe
  Set-EnvValue "CVN_WHISPER_CPP_MODEL" $ModelPath
  Set-EnvValue "CVN_WHISPER_CPP_TIMEOUT_MS" "120000"
}

function Write-Verification($FfmpegExe, $TesseractExe, $WhisperExe) {
  Write-Step "Verification"
  & $FfmpegExe -version | Select-Object -First 1
  & $TesseractExe --version | Select-Object -First 1
  & $WhisperExe --help | Select-Object -First 1
  if (-not (Test-Path -LiteralPath $ModelPath -PathType Leaf)) { throw "Whisper model not found at $ModelPath" }

  Write-Host "FFmpeg: $FfmpegExe"
  Write-Host "Tesseract: $TesseractExe"
  Write-Host "whisper.cpp: $WhisperExe"
  Write-Host "Whisper model: $ModelPath"
  Write-Host "`nRestart the vocabulary notebook app, then click the local recognition check again."
}

if (-not (Test-ProjectDir $AppRoot)) {
  throw "Run this installer from the context-vocabulary-notebook project directory; package.json must have name context-vocabulary-notebook."
}
Assert-TesseractLang $TesseractLang

[System.IO.Directory]::CreateDirectory($ToolsRoot) | Out-Null
[System.IO.Directory]::CreateDirectory($ModelsRoot) | Out-Null

$FfmpegExe = Install-Ffmpeg
$TesseractExe = Install-Tesseract
Install-TesseractLanguages
$WhisperExe = Install-WhisperCpp
Install-Model
Write-RecognitionEnv $FfmpegExe $TesseractExe $WhisperExe
Write-Verification $FfmpegExe $TesseractExe $WhisperExe
