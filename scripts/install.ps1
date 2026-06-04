$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/yaqxuan/context-vocabulary-notebook.git"
$InstallDir = if ($env:CVN_HOME) { $env:CVN_HOME } else { Join-Path (Get-Location) "context-vocabulary-notebook" }

function Write-Step($Message) {
  Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Has-Command($Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $MachinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $UserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = $MachinePath + ";" + $UserPath
  Write-Step "已刷新当前 PowerShell 的 PATH，若仍提示命令不可用请重新打开 PowerShell 后重试"
}

function Get-NodeMajor {
  if (-not (Has-Command "node")) { return 0 }
  try { return [int](& node -p "process.versions.node.split('.')[0]") } catch { return 0 }
}

function Node-IsSupported {
  return (Has-Command "node") -and (Has-Command "npm") -and ((Get-NodeMajor) -ge 20)
}

function Has-VCTools {
  $VsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path $VsWhere)) { return $false }
  $InstallPath = & $VsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  return -not [string]::IsNullOrWhiteSpace($InstallPath)
}

function Ensure-Winget {
  if (-not (Has-Command "winget")) {
    throw "缺少 winget。请先安装 App Installer，或手动安装 Git、Node.js 22 LTS、Visual Studio Build Tools 后重试。"
  }
}

function Ensure-Environment {
  Ensure-Winget

  if (-not (Has-Command "git")) {
    Write-Step "安装 Git"
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (-not (Node-IsSupported)) {
    Write-Step "安装或升级 Node.js 22 LTS"
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }

  if (-not (Has-VCTools)) {
    Write-Step "准备安装 Visual Studio Build Tools（用于 native module 编译，可能占用数 GB）"
    $Answer = Read-Host "输入 Y 继续安装 Visual Studio Build Tools；输入其他内容则停止"
    if ($Answer -notin @("Y", "y")) {
      throw "已取消 Visual Studio Build Tools 安装。请手动安装 native build 环境后重试。"
    }
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget --accept-package-agreements --accept-source-agreements --override "--wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
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

function Install-Project {
  $Parent = Split-Path -Parent $InstallDir
  if ($Parent -and -not (Test-Path $Parent)) {
    New-Item -ItemType Directory -Path $Parent | Out-Null
  }

  if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Step "发现已有项目目录，更新代码：$InstallDir"
    git -C "$InstallDir" pull --ff-only
  } else {
    Write-Step "克隆项目到：$InstallDir"
    git clone $RepoUrl "$InstallDir"
  }

  Set-Location $InstallDir

  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Step "已创建 .env"
  }

  Write-Step "安装项目依赖"
  npm ci

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
}

Ensure-Environment
Install-Project
