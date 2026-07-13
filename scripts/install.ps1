$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/yaqxuan/context-vocabulary-notebook.git"

function Test-ProjectDir($Path) {
  $GitDir = Join-Path $Path ".git"
  $PackageJson = Join-Path $Path "package.json"
  if (-not ((Test-Path -LiteralPath $GitDir) -and (Test-Path -LiteralPath $PackageJson))) {
    return $false
  }

  $PackageContent = Get-Content -Raw -LiteralPath $PackageJson
  return $PackageContent -match '"name"\s*:\s*"context-vocabulary-notebook"'
}

function Resolve-InstallDir {
  if ($env:CVN_HOME) { return $env:CVN_HOME }
  return (Get-Location).Path
}

$InstallDir = Resolve-InstallDir

function Write-Step($Message) {
  Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Has-Command($Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-CheckedNative {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Arguments = @(),
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  & $Command @Arguments
  $ExitCode = $LASTEXITCODE
  if ($ExitCode -ne 0) {
    throw "$FailureMessage (exit code $ExitCode)."
  }
}

function Test-Ffmpeg {
  return Has-Command "ffmpeg"
}

function Test-Tesseract {
  return Has-Command "tesseract"
}

function Test-LooksLikeWhisperCpp($CommandName) {
  try {
    $HelpOutput = (& $CommandName --help 2>&1 | Select-Object -First 20) -join "`n"
    return $HelpOutput -match '(?i)whisper\.cpp|whisper|--model|-m[ ,]'
  } catch {
    return $false
  }
}

function Test-WhisperCpp {
  if (Has-Command "whisper-cli") { return $true }
  if ($env:CVN_WHISPER_CPP_PATH -and (Test-Path -LiteralPath $env:CVN_WHISPER_CPP_PATH -PathType Leaf)) { return $true }
  return (Has-Command "main") -and (Test-LooksLikeWhisperCpp "main")
}

function Write-FfmpegStatus {
  if (Test-Ffmpeg) {
    $VersionLine = try { (& ffmpeg -version 2>$null | Select-Object -First 1) } catch { "found" }
    Write-Host "ffmpeg for video/audio processing: found ($VersionLine)"
  } else {
    Write-Host "ffmpeg for video/audio processing: not found. The app install can continue; install ffmpeg if you need video audio extraction, or rerun the installer with CVN_INSTALL_FFMPEG=1."
  }
}

function Write-TesseractStatus {
  if (Test-Tesseract) {
    $VersionLine = try { (& tesseract --version 2>$null | Select-Object -First 1) } catch { "found" }
    Write-Host "Tesseract for local OCR: found ($VersionLine)"
  } else {
    Write-Host "Tesseract for local OCR: not found. The app install can continue; image/video-frame OCR readiness will report it as missing. Install Tesseract manually and set CVN_TESSERACT_PATH, or rerun with CVN_INSTALL_TESSERACT=1 to let the installer try winget."
  }
}

function Write-WhisperCppStatus {
  if (Has-Command "whisper-cli") {
    $WhisperPath = (Get-Command "whisper-cli" -ErrorAction SilentlyContinue).Source
    Write-Host "whisper.cpp for local speech recognition: found whisper-cli ($WhisperPath)"
  } elseif ($env:CVN_WHISPER_CPP_PATH -and (Test-Path -LiteralPath $env:CVN_WHISPER_CPP_PATH -PathType Leaf)) {
    Write-Host "whisper.cpp for local speech recognition: found CVN_WHISPER_CPP_PATH ($env:CVN_WHISPER_CPP_PATH)"
  } elseif ((Has-Command "main") -and (Test-LooksLikeWhisperCpp "main")) {
    $WhisperPath = (Get-Command "main" -ErrorAction SilentlyContinue).Source
    Write-Host "whisper.cpp for local speech recognition: found whisper.cpp main ($WhisperPath). Consider setting CVN_WHISPER_CPP_PATH to this executable."
  } else {
    Write-Host "whisper.cpp for local speech recognition: whisper-cli not found. The app install can continue; speech recognition readiness will report the missing dependency. If your executable has another name, set CVN_WHISPER_CPP_PATH to the whisper.cpp executable and set CVN_WHISPER_CPP_MODEL."
  }
}

function Write-LocalRecognitionStatus {
  Write-TesseractStatus
  Write-WhisperCppStatus
  Write-Host "Note: this installer does not install whisper.cpp or Whisper models automatically; local recognition status is also available in the app readiness panel."
}

function Refresh-Path {
  $CurrentPath = $env:Path
  $MachinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $UserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $PathParts = @($CurrentPath, $MachinePath, $UserPath) -join ";"
  $env:Path = ($PathParts -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique) -join ";"
  Write-Step "Refreshed PATH for this PowerShell session; if commands are still unavailable, reopen PowerShell and rerun this installer"
}

function Node-IsSupported {
  if ((-not (Has-Command "node")) -or (-not (Has-Command "npm"))) { return $false }
  try {
    & node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22 ? 0 : 1)'
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Ensure-Winget {
  if (-not (Has-Command "winget")) {
    throw "winget is missing. Install App Installer first, or install Git and Node.js 22 LTS manually, then rerun this installer."
  }
}

function Ensure-Environment {
  if (-not (Has-Command "git")) {
    Ensure-Winget
    Write-Step "Installing Git"
    Invoke-CheckedNative -Command "winget" -Arguments @("install", "--id", "Git.Git", "-e", "--source", "winget", "--accept-package-agreements", "--accept-source-agreements") -FailureMessage "Git installation failed"
    Refresh-Path
  }

  if (-not (Node-IsSupported)) {
    Ensure-Winget
    Write-Step "Installing or upgrading Node.js 22 LTS"
    Invoke-CheckedNative -Command "winget" -Arguments @("install", "--id", "OpenJS.NodeJS.LTS", "-e", "--source", "winget", "--accept-package-agreements", "--accept-source-agreements") -FailureMessage "Node.js installation or upgrade failed"
    Refresh-Path
  }

  if (($env:CVN_INSTALL_FFMPEG -eq "1") -and (-not (Test-Ffmpeg))) {
    Ensure-Winget
    Write-Step "CVN_INSTALL_FFMPEG=1; installing ffmpeg"
    Invoke-CheckedNative -Command "winget" -Arguments @("install", "--id", "Gyan.FFmpeg", "-e", "--source", "winget", "--accept-package-agreements", "--accept-source-agreements") -FailureMessage "ffmpeg installation failed"
    Refresh-Path
    if (-not (Test-Ffmpeg)) {
      Write-Host "ffmpeg is still unavailable after installation. The app install will continue; if you need video transcription, reopen PowerShell and confirm ffmpeg is on PATH."
    }
  } elseif (-not (Test-Ffmpeg)) {
    Write-Step "ffmpeg was not found; the app install will continue. Install ffmpeg if you need video audio extraction, or rerun with CVN_INSTALL_FFMPEG=1."
  }

  if (($env:CVN_INSTALL_TESSERACT -eq "1") -and (-not (Test-Tesseract))) {
    Ensure-Winget
    Write-Step "CVN_INSTALL_TESSERACT=1; installing Tesseract OCR"
    Invoke-CheckedNative -Command "winget" -Arguments @("install", "--id", "UB-Mannheim.TesseractOCR", "-e", "--source", "winget", "--accept-package-agreements", "--accept-source-agreements") -FailureMessage "Tesseract installation failed"
    Refresh-Path
    if (-not (Test-Tesseract)) {
      Write-Host "Tesseract is still unavailable after installation. The app install will continue; if you need local OCR, reopen PowerShell and confirm tesseract is on PATH, or set CVN_TESSERACT_PATH."
    }
  } elseif (-not (Test-Tesseract)) {
    Write-Step "Tesseract was not found; the app install will continue. Install Tesseract manually if you need local OCR, or rerun with CVN_INSTALL_TESSERACT=1."
  }

  if (-not (Has-Command "git")) { throw "Git is still unavailable after installation. Reopen PowerShell, then rerun this installer." }
  if (-not (Has-Command "node")) { throw "Node.js is still unavailable after installation. Reopen PowerShell, then rerun this installer." }
  if (-not (Has-Command "npm")) { throw "npm is still unavailable after installation. Reopen PowerShell, then rerun this installer." }
  if (-not (Node-IsSupported)) { throw "Unsupported Node.js version. Install Node.js 20.19+ or 22.12+; Node.js 22 LTS is recommended." }

  Write-Step "Environment check"
  git --version
  node --version
  npm --version
  Write-FfmpegStatus
  Write-LocalRecognitionStatus
}

function Test-EmptyDir($Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $true }
  return $null -eq (Get-ChildItem -Force -LiteralPath $Path | Select-Object -First 1)
}

function Invoke-NpmCi {
  npm ci --prefer-offline --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=15000 --fetch-timeout=60000
  return $LASTEXITCODE -eq 0
}

function Install-Project {
  if (-not (Test-Path -LiteralPath $InstallDir)) {
    [System.IO.Directory]::CreateDirectory($InstallDir) | Out-Null
  }

  if (Test-ProjectDir $InstallDir) {
    Write-Step "Existing project directory found; updating: $InstallDir"
    Invoke-CheckedNative -Command "git" -Arguments @("-C", $InstallDir, "pull", "--ff-only") -FailureMessage "Project update failed; resolve local Git changes or network errors, then rerun the installer"
  } else {
    if (-not (Test-EmptyDir $InstallDir)) {
      throw @"
The target directory is not empty and is not a Context Vocabulary Notebook project directory:
  $InstallDir

To avoid mixing project files into an unrelated folder, rerun this installer from an empty directory, or set CVN_HOME to the directory where you want the project installed.

Example:
  `$InstallDir = "C:\path\to\empty-folder"
  New-Item -ItemType Directory -Force `$InstallDir | Out-Null
  Set-Location `$InstallDir
  irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
"@
    }

    Write-Step "Cloning project into the current directory: $InstallDir"
    Push-Location -LiteralPath $InstallDir
    try {
      Invoke-CheckedNative -Command "git" -Arguments @("clone", $RepoUrl, ".") -FailureMessage "Project clone failed"
    } finally {
      Pop-Location
    }
  }

  Set-Location -LiteralPath $InstallDir

  if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Step "Created .env"
  }

  Write-Step "Installing project dependencies"
  if (-not (Invoke-NpmCi)) {
    throw @"

npm ci failed. Check the npm error above first.
If the error mentions better-sqlite3, node-gyp, Python, Visual Studio Build Tools, MSVC, or C++ build tools, native build tools are likely incomplete.
On Windows, try:
  1. Install Python 3: winget install --id Python.Python.3.12 -e --source winget
  2. Install Visual Studio Build Tools with MSVC C++ tools:
     winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --accept-package-agreements --accept-source-agreements --override "--wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  3. Reopen PowerShell, then rerun this installer.

"@
  }

  Write-Step "Building project"
  Invoke-CheckedNative -Command "npm" -Arguments @("run", "build") -FailureMessage "Project build failed"

  Write-Host ""
  Write-Host "Installation complete."
  Write-Host ""
  Write-Host "Start the app:"
  Write-Host "  Set-Location `"$InstallDir`""
  Write-Host "  npm run dev"
  Write-Host ""
  Write-Host "Open in your browser:"
  Write-Host "  http://localhost:5173"
  Write-Host ""
  Write-Host "Local API health check:"
  Write-Host "  http://localhost:3107/api/health"
  Write-Host ""
  Write-Host "To update later:"
  Write-Host "  Set-Location `"$InstallDir`""
  Write-Host "  git pull --ff-only"
  Write-Host "  npm ci --prefer-offline --no-audit --no-fund"
  Write-Host "  npm run build"
  Write-Host ""
  Write-Host "You can also rerun this installer; keep the same CVN_HOME or run it from the same directory."
  Write-Host ""
  Write-Host "Data locations:"
  Write-Host "  Database: $InstallDir\data\context-vocabulary-notebook.sqlite"
  Write-Host "  Media files: $InstallDir\uploads"
  Write-Host ""
  Write-FfmpegStatus
  Write-LocalRecognitionStatus
}

Ensure-Environment
Install-Project
