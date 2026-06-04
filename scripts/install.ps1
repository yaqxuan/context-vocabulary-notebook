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

  if (-not (Has-Command "git")) { throw "Git 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Has-Command "node")) { throw "Node.js 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Has-Command "npm")) { throw "npm 安装后仍不可用，请重新打开 PowerShell 后重试。" }
  if (-not (Node-IsSupported)) { throw "Node.js 版本过低。请安装 Node.js 20+，推荐 Node.js 22 LTS。" }

  Write-Step "环境确认"
  git --version
  node --version
  npm --version
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
  New-Item -ItemType Directory -Path "$HOME\context-vocabulary-notebook"
  Set-Location "$HOME\context-vocabulary-notebook"
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
}

Ensure-Environment
Install-Project
