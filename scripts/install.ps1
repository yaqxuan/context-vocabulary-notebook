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
    $VersionLine = try { (& ffmpeg -version 2>$null | Select-Object -First 1) } catch { "已检测到" }
    Write-Host "视频/音频处理依赖 ffmpeg：已检测到 ($VersionLine)"
  } else {
    Write-Host "视频/音频处理依赖 ffmpeg：未检测到。应用已安装完成；如需从视频提取音频，请安装 ffmpeg，或重新运行安装命令并设置 CVN_INSTALL_FFMPEG=1。"
  }
}

function Write-TesseractStatus {
  if (Test-Tesseract) {
    $VersionLine = try { (& tesseract --version 2>$null | Select-Object -First 1) } catch { "已检测到" }
    Write-Host "本地 OCR 依赖 Tesseract：已检测到 ($VersionLine)"
  } else {
    Write-Host "本地 OCR 依赖 Tesseract：未检测到。应用已安装完成；图片/视频帧文字识别会在就绪检查中提示缺失。可手动安装 Tesseract 后设置 CVN_TESSERACT_PATH；如需让脚本尝试 winget 安装，请设置 CVN_INSTALL_TESSERACT=1 后重新运行。"
  }
}

function Write-WhisperCppStatus {
  if (Has-Command "whisper-cli") {
    $WhisperPath = (Get-Command "whisper-cli" -ErrorAction SilentlyContinue).Source
    Write-Host "本地语音识别依赖 whisper.cpp：已检测到 whisper-cli ($WhisperPath)"
  } elseif ($env:CVN_WHISPER_CPP_PATH -and (Test-Path -LiteralPath $env:CVN_WHISPER_CPP_PATH -PathType Leaf)) {
    Write-Host "本地语音识别依赖 whisper.cpp：已检测到 CVN_WHISPER_CPP_PATH ($env:CVN_WHISPER_CPP_PATH)"
  } elseif ((Has-Command "main") -and (Test-LooksLikeWhisperCpp "main")) {
    $WhisperPath = (Get-Command "main" -ErrorAction SilentlyContinue).Source
    Write-Host "本地语音识别依赖 whisper.cpp：已检测到 whisper.cpp main ($WhisperPath)。建议设置 CVN_WHISPER_CPP_PATH 指向该可执行文件。"
  } else {
    Write-Host "本地语音识别依赖 whisper.cpp：未检测到 whisper-cli。应用已安装完成；语音识别会在就绪检查中提示缺少依赖。如果使用非 whisper-cli 名称，请设置 CVN_WHISPER_CPP_PATH 指向 whisper.cpp 可执行文件，并设置 CVN_WHISPER_CPP_MODEL。"
  }
}

function Write-LocalRecognitionStatus {
  Write-TesseractStatus
  Write-WhisperCppStatus
  Write-Host "提示：安装脚本不会自动安装 whisper.cpp 或 Whisper 模型；本地识别状态也可在应用就绪检查界面查看。"
}

function Refresh-Path {
  $CurrentPath = $env:Path
  $MachinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $UserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $PathParts = @($CurrentPath, $MachinePath, $UserPath) -join ";"
  $env:Path = ($PathParts -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique) -join ";"
  Write-Step "已刷新当前 PowerShell 的 PATH，若仍提示命令不可用请重新打开 PowerShell 后重试"
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
    throw "缺少 winget。请先安装 App Installer，或手动安装 Git、Node.js 22 LTS 后重试。"
  }
}

function Ensure-Environment {
  if (-not (Has-Command "git")) {
    Ensure-Winget
    Write-Step "安装 Git"
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (-not (Node-IsSupported)) {
    Ensure-Winget
    Write-Step "安装或升级 Node.js 22 LTS"
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (($env:CVN_INSTALL_FFMPEG -eq "1") -and (-not (Test-Ffmpeg))) {
    Ensure-Winget
    Write-Step "CVN_INSTALL_FFMPEG=1，安装 ffmpeg"
    winget install --id Gyan.FFmpeg -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Ffmpeg)) {
      Write-Host "ffmpeg 安装后仍不可用。应用仍会继续安装；如需视频转写，请重新打开 PowerShell 后确认 ffmpeg 在 PATH 中。"
    }
  } elseif (-not (Test-Ffmpeg)) {
    Write-Step "未检测到 ffmpeg；应用仍会继续安装。如需从视频提取音频，请安装 ffmpeg，或设置 CVN_INSTALL_FFMPEG=1 后重新运行安装命令。"
  }

  if (($env:CVN_INSTALL_TESSERACT -eq "1") -and (-not (Test-Tesseract))) {
    Ensure-Winget
    Write-Step "CVN_INSTALL_TESSERACT=1，安装 Tesseract OCR"
    winget install --id UB-Mannheim.TesseractOCR -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Tesseract)) {
      Write-Host "Tesseract 安装后仍不可用。应用仍会继续安装；如需本地 OCR，请重新打开 PowerShell 后确认 tesseract 在 PATH 中，或设置 CVN_TESSERACT_PATH。"
    }
  } elseif (-not (Test-Tesseract)) {
    Write-Step "未检测到 Tesseract；应用仍会继续安装。如需本地 OCR，请手动安装 Tesseract，或设置 CVN_INSTALL_TESSERACT=1 后重新运行安装命令。"
  }

  if (-not (Has-Command "git")) { throw "Git 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Has-Command "node")) { throw "Node.js 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Has-Command "npm")) { throw "npm 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Node-IsSupported)) { throw "Node.js 版本过低。请安装 Node.js 20+，推荐 Node.js 22 LTS。" }

  Write-Step "环境确认"
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
  npm ci
  return $LASTEXITCODE -eq 0
}

function Install-Project {
  if (-not (Test-Path -LiteralPath $InstallDir)) {
    [System.IO.Directory]::CreateDirectory($InstallDir) | Out-Null
  }

  if (Test-ProjectDir $InstallDir) {
    Write-Step "发现已有项目目录，更新代码：$InstallDir"
    git -C "$InstallDir" pull --ff-only
  } else {
    if (-not (Test-EmptyDir $InstallDir)) {
      throw @"
当前目录不是空目录，也不是 Context Vocabulary Notebook 项目目录：
  $InstallDir

为避免把项目文件混入其他文件，请换到一个空目录后重新运行，或显式设置 CVN_HOME 指向要安装的目录。

示例：
  `$InstallDir = "C:\path\to\empty-folder"
  New-Item -ItemType Directory -Force `$InstallDir | Out-Null
  Set-Location `$InstallDir
  irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
"@
    }

    Write-Step "克隆项目到当前目录：$InstallDir"
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
    Write-Step "已创建 .env"
  }

  Write-Step "安装项目依赖"
  if (-not (Invoke-NpmCi)) {
    throw @"

npm ci 失败。请先查看上方 npm 错误。
如果错误提到 better-sqlite3、node-gyp、Python、Visual Studio Build Tools、MSVC 或 C++ build tools，通常是 native build tools 不完整。
Windows 可尝试：
  1. 安装 Python 3: winget install --id Python.Python.3.12 -e --source winget
  2. 安装 Visual Studio Build Tools（包含 MSVC C++ 工具）:
     winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --accept-package-agreements --accept-source-agreements --override "--wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  3. 重新打开 PowerShell 后再运行本安装命令。

"@
  }

  Write-Step "构建项目"
  npm run build

  Write-Host ""
  Write-Host "安装完成。"
  Write-Host ""
  Write-Host "启动应用："
  Write-Host "  Set-Location `"$InstallDir`""
  Write-Host "  npm run dev"
  Write-Host ""
  Write-Host "浏览器打开："
  Write-Host "  http://localhost:5173"
  Write-Host ""
  Write-Host "本地 API 健康检查："
  Write-Host "  http://localhost:3107/api/health"
  Write-Host ""
  Write-Host "以后更新："
  Write-Host "  Set-Location `"$InstallDir`""
  Write-Host "  git pull --ff-only"
  Write-Host "  npm ci"
  Write-Host "  npm run build"
  Write-Host ""
  Write-Host "也可以重新运行本安装命令；请保持相同 CVN_HOME 或相同运行目录。"
  Write-Host ""
  Write-Host "数据位置："
  Write-Host "  数据库：$InstallDir\data\context-vocabulary-notebook.sqlite"
  Write-Host "  媒体文件：$InstallDir\uploads"
  Write-Host ""
  Write-FfmpegStatus
  Write-LocalRecognitionStatus
}

Ensure-Environment
Install-Project
