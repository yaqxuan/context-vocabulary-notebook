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

function Get-NodeMajor {
  if (-not (Has-Command "node")) { return 0 }
  try { return [int](& node -p "process.versions.node.split('.')[0]") } catch { return 0 }
}

function Node-IsSupported {
  return (Has-Command "node") -and (Has-Command "npm") -and ((Get-NodeMajor) -ge 20)
}

function Ensure-Winget {
  if (-not (Has-Command "winget")) {
    throw "winget is missing. Install App Installer first, or install Git and Node.js 22 LTS manually, then rerun this installer."
  }
}

function Test-PythonAvailable {
  if (-not (Has-Command "python")) { return $false }
  cmd.exe /d /s /c "python --version >nul 2>nul"
  return $LASTEXITCODE -eq 0
}

function Get-VSInstallerDir {
  $ProgramFilesX86 = [System.Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  if (-not $ProgramFilesX86) { return $null }
  return Join-Path $ProgramFilesX86 "Microsoft Visual Studio\Installer"
}

function Get-VSWherePath {
  $InstallerDir = Get-VSInstallerDir
  if (-not $InstallerDir) { return $null }
  $VsWhere = Join-Path $InstallerDir "vswhere.exe"
  if (-not (Test-Path -LiteralPath $VsWhere)) { return $null }
  return $VsWhere
}

function Test-VCToolsAvailable {
  $VsWhere = Get-VSWherePath
  if (-not $VsWhere) { return $false }
  & $VsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath > $null 2> $null
  return $LASTEXITCODE -eq 0
}

function Get-BuildToolsInstallPath {
  $VsWhere = Get-VSWherePath
  if (-not $VsWhere) { return $null }
  $InstallPath = & $VsWhere -latest -products Microsoft.VisualStudio.Product.BuildTools -property installationPath 2> $null
  if ($LASTEXITCODE -ne 0) { return $null }
  if (-not $InstallPath) { return $null }
  return ($InstallPath | Select-Object -First 1).Trim()
}

function Install-WindowsNativeBuildTools {
  Ensure-Winget

  if (-not (Test-PythonAvailable)) {
    Write-Step "Python was not found; installing Python 3 for native module builds"
    winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
      throw "winget failed while installing Python 3 (exit code $LASTEXITCODE). Install Python manually, reopen PowerShell, then rerun this installer."
    }
    Refresh-Path
  }

  if (Test-VCToolsAvailable) {
    Write-Step "Visual Studio Build Tools with MSVC C++ tools already found"
    return
  }

  $BuildToolsPath = Get-BuildToolsInstallPath
  $InstallerDir = Get-VSInstallerDir
  $SetupExe = if ($InstallerDir) { Join-Path $InstallerDir "setup.exe" } else { $null }

  if ($BuildToolsPath -and $SetupExe -and (Test-Path -LiteralPath $SetupExe)) {
    Write-Step "Adding MSVC C++ tools to the existing Visual Studio Build Tools installation"
    & $SetupExe modify --installPath $BuildToolsPath --quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
    if ($LASTEXITCODE -ne 0) {
      throw "Visual Studio Installer failed while adding MSVC C++ tools (exit code $LASTEXITCODE). Open Visual Studio Installer, add Desktop development with C++, reopen PowerShell, then rerun this installer."
    }
  } else {
    Write-Step "Installing Visual Studio Build Tools with MSVC C++ tools for native module builds"
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --accept-package-agreements --accept-source-agreements --override "--wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    if ($LASTEXITCODE -ne 0) {
      throw "winget failed while installing Visual Studio Build Tools (exit code $LASTEXITCODE). Install Visual Studio Build Tools with Desktop development with C++ manually, reopen PowerShell, then rerun this installer."
    }
  }

  Refresh-Path
  if (-not (Test-VCToolsAvailable)) {
    throw "Visual Studio Build Tools was installed or modified, but MSVC C++ tools are still unavailable. Open Visual Studio Installer, add Desktop development with C++, reopen PowerShell, then rerun this installer."
  }
}

function Ensure-Environment {
  if (-not (Has-Command "git")) {
    Ensure-Winget
    Write-Step "Installing Git"
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (-not (Node-IsSupported)) {
    Ensure-Winget
    Write-Step "Installing or upgrading Node.js 22 LTS"
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (($env:CVN_INSTALL_FFMPEG -eq "1") -and (-not (Test-Ffmpeg))) {
    Ensure-Winget
    Write-Step "CVN_INSTALL_FFMPEG=1; installing ffmpeg"
    winget install --id Gyan.FFmpeg -e --source winget --accept-package-agreements --accept-source-agreements
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
    winget install --id UB-Mannheim.TesseractOCR -e --source winget --accept-package-agreements --accept-source-agreements
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
  if (-not (Node-IsSupported)) { throw "Node.js is too old. Install Node.js 20+; Node.js 22 LTS is recommended." }

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
  $script:LastNpmCiLog = Join-Path ([System.IO.Path]::GetTempPath()) "cvn-npm-ci-$PID.log"
  $NpmCommand = "npm ci > `"$script:LastNpmCiLog`" 2>&1"
  cmd.exe /d /s /c $NpmCommand
  $ExitCode = $LASTEXITCODE
  Get-Content -LiteralPath $script:LastNpmCiLog | ForEach-Object { Write-Host $_ }
  return $ExitCode -eq 0
}

function Test-NpmNativeBuildFailure {
  if (-not $script:LastNpmCiLog) { return $false }
  if (-not (Test-Path -LiteralPath $script:LastNpmCiLog)) { return $false }
  $Log = Get-Content -Raw -LiteralPath $script:LastNpmCiLog
  return $Log -match '(?i)better-sqlite3|node-gyp|gyp ERR! find VS|Visual Studio|MSVC|C\+\+ build tools|prebuild-install'
}

function Install-Project {
  if (-not (Test-Path -LiteralPath $InstallDir)) {
    [System.IO.Directory]::CreateDirectory($InstallDir) | Out-Null
  }

  if (Test-ProjectDir $InstallDir) {
    Write-Step "Existing project directory found; updating: $InstallDir"
    git -C "$InstallDir" pull --ff-only
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
      git clone $RepoUrl .
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
    if (Test-NpmNativeBuildFailure) {
      Write-Host "npm ci failed during native dependency installation. If the failure came from better-sqlite3, node-gyp, Python, MSVC, or C++ build tools, the Windows native build environment is likely incomplete."
      Write-Host "The installer will install Visual Studio Build Tools with MSVC C++ tools, then retry npm ci once."
      Install-WindowsNativeBuildTools
      Write-Step "Retrying npm ci after installing native build tools"
      if (-not (Invoke-NpmCi)) {
        throw @"

npm ci failed again after installing Windows native build tools. Check the npm error above first.
Common causes: locked node_modules files, antivirus file locks, corporate network/proxy restrictions, or a failed Visual Studio Build Tools installation.
Try closing editors/terminals that may hold node_modules, reopen PowerShell, then rerun this installer. If it still fails, remove node_modules and rerun:
  Remove-Item -Recurse -Force .\node_modules
  irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex

"@
      }
    } else {
      throw @"

npm ci failed. Check the npm error above first.
The failure did not look like a native build-tools issue, so the installer did not install Visual Studio Build Tools automatically.
Common causes: registry/network/proxy failures, lockfile/package errors, or local npm cache issues.
After fixing the reported npm problem, rerun this installer from the same directory.

"@
    }
  }

  Write-Step "Building project"
  npm run build

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
  Write-Host "  npm ci"
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
