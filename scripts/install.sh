#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/yaqxuan/context-vocabulary-notebook.git"
INSTALL_DIR="${CVN_HOME:-$PWD/context-vocabulary-notebook}"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

node_major() {
  node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0
}

node_ok() {
  has_cmd node && has_cmd npm && [ "$(node_major)" -ge 20 ]
}

need_sudo() {
  if [ "$(id -u)" -ne 0 ]; then
    if has_cmd sudo; then
      sudo "$@"
    else
      echo "需要管理员权限，但系统没有 sudo：$*"
      exit 1
    fi
  else
    "$@"
  fi
}

install_linux_deps() {
  if has_cmd apt-get; then
    log "使用 apt-get 安装缺失环境"
    need_sudo apt-get update
    need_sudo apt-get install -y git curl ca-certificates gnupg build-essential python3 make g++

    if ! node_ok; then
      log "安装或升级 Node.js 22 LTS"
      need_sudo install -d -m 0755 /etc/apt/keyrings
      tmp_nodesource_key="$(mktemp)"
      trap 'rm -f "$tmp_nodesource_key"' EXIT
      curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor > "$tmp_nodesource_key"
      need_sudo install -m 0644 "$tmp_nodesource_key" /etc/apt/keyrings/nodesource.gpg
      rm -f "$tmp_nodesource_key"
      trap - EXIT
      need_sudo chmod a+r /etc/apt/keyrings/nodesource.gpg
      echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | need_sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
      need_sudo apt-get update
      need_sudo apt-get install -y nodejs
      export PATH="/usr/local/bin:/usr/bin:$PATH"
      log "已更新 PATH，若仍提示命令不存在请重新打开终端再试"
    fi
  else
    echo "未发现 apt-get。请手动安装 Git、Node.js 22 LTS、npm、Python3、make、g++ 或对应 build tools 后重试。"
    exit 1
  fi
}

install_macos_deps() {
  if ! has_cmd brew; then
    echo "未发现 Homebrew。请先安装 Homebrew，或手动安装 Git、Node.js 22 LTS 和 Xcode Command Line Tools 后重试。"
    echo "Homebrew: https://brew.sh/"
    exit 1
  fi

  log "使用 Homebrew 安装缺失环境"
  has_cmd git || brew install git
  node_ok || brew install node
  if ! xcode-select -p >/dev/null 2>&1; then
    log "未检测到 Xcode Command Line Tools，正在触发安装。如弹出系统窗口，请点击「安装」，完成后重新运行本脚本。"
    xcode-select --install 2>/dev/null || true
    echo "请在 Xcode Command Line Tools 安装完成后重新运行本脚本。"
    exit 1
  fi
}

ensure_environment() {
  case "$(uname -s)" in
    Linux*) install_linux_deps ;;
    Darwin*) install_macos_deps ;;
    *)
      echo "当前 Bash 环境不在 Linux/macOS/WSL 支持范围内。Windows 原生请使用 PowerShell 安装脚本。"
      exit 1
      ;;
  esac

  for cmd in git node npm; do
    if ! has_cmd "$cmd"; then
      echo "缺少命令：$cmd。请手动安装后重试。"
      exit 1
    fi
  done

  if ! node_ok; then
    echo "Node.js 版本过低。请安装 Node.js 20+，推荐 Node.js 22 LTS。"
    exit 1
  fi

  log "环境确认"
  git --version
  node --version
  npm --version
}

install_project() {
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log "发现已有项目目录，更新代码：$INSTALL_DIR"
    git -C "$INSTALL_DIR" pull --ff-only
  else
    log "克隆项目到：$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi

  cd "$INSTALL_DIR"

  if [ ! -f .env ]; then
    cp .env.example .env
    log "已创建 .env"
  fi

  log "安装项目依赖"
  npm ci

  log "构建项目"
  npm run build

  cat <<EOF

安装完成。

启动应用：
  cd "$INSTALL_DIR"
  npm run dev

浏览器打开：
  http://localhost:5173

本地 API 健康检查：
  http://localhost:3107/api/health

以后更新：
  cd "$INSTALL_DIR"
  git pull --ff-only
  npm ci
  npm run build

也可以重新运行本安装命令；请保持相同 CVN_HOME 或相同运行目录。

数据位置：
  数据库：$INSTALL_DIR/data/context-vocabulary-notebook.sqlite
  媒体文件：$INSTALL_DIR/uploads

EOF
}

ensure_environment
install_project
