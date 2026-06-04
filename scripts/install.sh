#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/yaqxuan/context-vocabulary-notebook.git"

is_project_dir() {
  [ -d "$1/.git" ] && [ -f "$1/package.json" ] && grep -Eq '"name"[[:space:]]*:[[:space:]]*"context-vocabulary-notebook"' "$1/package.json"
}

resolve_install_dir() {
  if [ -n "${CVN_HOME:-}" ]; then
    printf '%s\n' "$CVN_HOME"
    return
  fi

  printf '%s\n' "$PWD"
}

INSTALL_DIR="$(resolve_install_dir)"

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

linux_core_ok() {
  has_cmd git && node_ok
}

linux_native_tools_ok() {
  has_cmd python3 && has_cmd make && has_cmd g++
}

explain_apt_failure() {
  cat <<'EOF'

apt-get 失败。这通常不是本项目问题，而是当前系统已有 apt 源或未完成包配置异常。
常见例子：Docker / Chrome / NVIDIA 等第三方源缺 GPG key，或 chromium-browser / snapd 配置卡住。

你可以选择：
  1. 修复或禁用系统里损坏的 apt 源后重试；
  2. 手动安装 Git、Node.js 20+ 和 npm 后重试；
  3. 如果 npm ci 后续提示 native module 编译失败，再安装 python3、make、g++ 或 build-essential。

EOF
}

install_linux_deps() {
  if linux_core_ok; then
    log "Linux 基础依赖已满足，跳过 apt-get"
    if ! linux_native_tools_ok; then
      log "未检测到完整 native build tools；如果 npm ci 编译 better-sqlite3 失败，请再安装 python3、make、g++ 或 build-essential。"
    fi
    return
  fi

  if ! has_cmd apt-get; then
    echo "未发现 apt-get。请手动安装 Git、Node.js 22 LTS、npm、Python3、make、g++ 或对应 build tools 后重试。"
    exit 1
  fi

  log "检测到缺少 Git 或 Node.js/npm，准备使用 apt-get 安装缺失环境"
  echo "提示：apt-get 会检查系统里所有 apt 源；如果 Docker、Chromium 等无关源报错，请先修复或禁用对应源后重试。"

  if ! need_sudo apt-get update; then
    explain_apt_failure
    exit 1
  fi

  if ! need_sudo apt-get install -y git curl ca-certificates gnupg build-essential python3 make g++; then
    explain_apt_failure
    exit 1
  fi

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
    if ! need_sudo apt-get update; then
      explain_apt_failure
      exit 1
    fi
    if ! need_sudo apt-get install -y nodejs; then
      explain_apt_failure
      exit 1
    fi
    export PATH="/usr/local/bin:/usr/bin:$PATH"
    log "已更新 PATH，若仍提示命令不存在请重新打开终端再试"
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

is_empty_dir() {
  [ ! -d "$1" ] && return 0
  [ -z "$(find "$1" -mindepth 1 -maxdepth 1 -print -quit)" ]
}

install_project() {
  mkdir -p "$INSTALL_DIR"

  if is_project_dir "$INSTALL_DIR"; then
    log "发现已有项目目录，更新代码：$INSTALL_DIR"
    git -C "$INSTALL_DIR" pull --ff-only
  else
    if ! is_empty_dir "$INSTALL_DIR"; then
      cat <<EOF
当前目录不是空目录，也不是 Context Vocabulary Notebook 项目目录：
  $INSTALL_DIR

为避免把项目文件混入其他文件，请换到一个空目录后重新运行，或显式设置 CVN_HOME 指向要安装的目录。

示例：
  mkdir -p "$HOME/context-vocabulary-notebook"
  cd "$HOME/context-vocabulary-notebook"
  curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash

EOF
      exit 1
    fi

    log "克隆项目到当前目录：$INSTALL_DIR"
    (cd "$INSTALL_DIR" && git clone "$REPO_URL" .)
  fi

  cd "$INSTALL_DIR"

  if [ ! -f .env ]; then
    cp .env.example .env
    log "已创建 .env"
  fi

  log "安装项目依赖"
  if ! npm ci; then
    cat <<'EOF'

npm ci 失败。请先查看上方 npm 错误。
如果错误提到 better-sqlite3、node-gyp、Python、make 或 g++，通常是 native build tools 不完整。
Ubuntu / Debian / WSL 可尝试：
  sudo apt-get update
  sudo apt-get install -y python3 make g++ build-essential

EOF
    exit 1
  fi

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
