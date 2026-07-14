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

node_ok() {
  has_cmd node \
    && has_cmd npm \
    && node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22 ? 0 : 1)' >/dev/null 2>&1
}

ffmpeg_ok() {
  has_cmd ffmpeg
}

tesseract_ok() {
  has_cmd tesseract
}

looks_like_whisper_cpp() {
  local cmd="$1"
  local help_output
  help_output="$($cmd --help 2>&1 | head -n 20 || true)"
  printf '%s\n' "$help_output" | grep -Eiq 'whisper\.cpp|whisper|--model|-m[ ,]'
}

whisper_cpp_ok() {
  has_cmd whisper-cli || { [ -n "${CVN_WHISPER_CPP_PATH:-}" ] && [ -x "${CVN_WHISPER_CPP_PATH:-}" ]; } || { has_cmd main && looks_like_whisper_cpp main; }
}

ffmpeg_status_message() {
  if ffmpeg_ok; then
    printf 'ffmpeg for video/audio processing: found (%s)\n' "$(ffmpeg -version 2>/dev/null | head -n 1)"
  else
    printf 'ffmpeg for video/audio processing: not found. The app install can continue; install ffmpeg if you need video audio extraction, or rerun the installer with CVN_INSTALL_FFMPEG=1.\n'
  fi
}

tesseract_status_message() {
  if tesseract_ok; then
    printf 'Tesseract for local OCR: found (%s)\n' "$(tesseract --version 2>/dev/null | head -n 1)"
  else
    printf 'Tesseract for local OCR: not found. The app install can continue; image/video-frame OCR readiness will report it as missing. On Linux/WSL, rerun with CVN_INSTALL_TESSERACT=1 to try apt installation; on macOS, run brew install tesseract; or install it manually and set CVN_TESSERACT_PATH.\n'
  fi
}

whisper_cpp_status_message() {
  if has_cmd whisper-cli; then
    printf 'whisper.cpp for local speech recognition: found whisper-cli (%s)\n' "$(command -v whisper-cli)"
  elif [ -n "${CVN_WHISPER_CPP_PATH:-}" ] && [ -x "${CVN_WHISPER_CPP_PATH:-}" ]; then
    printf 'whisper.cpp for local speech recognition: found CVN_WHISPER_CPP_PATH (%s)\n' "$CVN_WHISPER_CPP_PATH"
  elif has_cmd main && looks_like_whisper_cpp main; then
    printf 'whisper.cpp for local speech recognition: found whisper.cpp main (%s). Consider setting CVN_WHISPER_CPP_PATH to this executable.\n' "$(command -v main)"
  else
    printf 'whisper.cpp for local speech recognition: whisper-cli not found. The app install can continue; speech recognition readiness will report the missing dependency. If your executable has another name, set CVN_WHISPER_CPP_PATH to the whisper.cpp executable and set CVN_WHISPER_CPP_MODEL.\n'
  fi
}

local_recognition_status_messages() {
  tesseract_status_message
  whisper_cpp_status_message
  printf 'Note: this installer does not install whisper.cpp or Whisper models automatically; local recognition status is also available in the app readiness panel.\n'
}

need_sudo() {
  if [ "$(id -u)" -ne 0 ]; then
    if has_cmd sudo; then
      sudo "$@"
    else
      echo "Administrator privileges are required, but sudo is not available: $*"
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

apt-get failed. This is usually a system package-source problem, not a project problem.
Common causes include broken Docker / Chrome / NVIDIA third-party apt sources, missing GPG keys, or stuck chromium-browser / snapd configuration.

Options:
  1. Fix or disable the broken apt sources, then rerun this installer;
  2. Install Git, Node.js 20.19+ or 22.12+, and npm manually, then rerun this installer;
  3. If npm ci later reports native module build errors, install python3, make, g++, or build-essential.

EOF
}

install_linux_deps() {
  local apt_packages=(git curl ca-certificates gnupg build-essential python3 make g++)
  if [ "${CVN_INSTALL_FFMPEG:-}" = "1" ] && ! ffmpeg_ok; then
    apt_packages+=(ffmpeg)
  fi
  if [ "${CVN_INSTALL_TESSERACT:-}" = "1" ] && ! tesseract_ok; then
    apt_packages+=(tesseract-ocr)
  fi

  if linux_core_ok; then
    log "Linux core dependencies are already available; skipping apt-get"
    if ! linux_native_tools_ok; then
      log "Native build tools may be incomplete; if npm ci fails while building better-sqlite3, install python3, make, g++, or build-essential."
    fi
    if [ "${CVN_INSTALL_FFMPEG:-}" = "1" ] && ! ffmpeg_ok; then
      if ! has_cmd apt-get; then
        echo "apt-get was not found, so ffmpeg cannot be installed automatically. The app install will continue; install ffmpeg manually if you need video transcription."
      else
        log "CVN_INSTALL_FFMPEG=1; preparing to install ffmpeg with apt-get"
        echo "Note: apt-get checks every apt source on the system; if unrelated Docker, Chromium, or other sources fail, fix or disable those sources and rerun this installer."
        if ! need_sudo apt-get update; then
          explain_apt_failure
          exit 1
        fi
        if ! need_sudo apt-get install -y ffmpeg; then
          explain_apt_failure
          exit 1
        fi
      fi
    elif ! ffmpeg_ok; then
      log "ffmpeg was not found; the app install will continue. Install ffmpeg if you need video audio extraction, or rerun with CVN_INSTALL_FFMPEG=1."
    fi
    if [ "${CVN_INSTALL_TESSERACT:-}" = "1" ] && ! tesseract_ok; then
      if ! has_cmd apt-get; then
        echo "apt-get was not found, so Tesseract cannot be installed automatically. The app install will continue; install Tesseract manually if you need local OCR."
      else
        log "CVN_INSTALL_TESSERACT=1; preparing to install Tesseract OCR with apt-get"
        echo "Note: apt-get checks every apt source on the system; if unrelated Docker, Chromium, or other sources fail, fix or disable those sources and rerun this installer."
        if ! need_sudo apt-get update; then
          explain_apt_failure
          exit 1
        fi
        if ! need_sudo apt-get install -y tesseract-ocr; then
          explain_apt_failure
          exit 1
        fi
      fi
    elif ! tesseract_ok; then
      log "Tesseract was not found; the app install will continue. Install Tesseract if you need local OCR, or on Linux/WSL rerun with CVN_INSTALL_TESSERACT=1."
    fi
    return
  fi

  if ! has_cmd apt-get; then
    echo "apt-get was not found. Install Git, Node.js 22 LTS, npm, Python3, make, g++, or equivalent build tools manually, then rerun this installer."
    exit 1
  fi

  log "Git or Node.js/npm is missing; preparing to install missing environment dependencies with apt-get"
  echo "Note: apt-get checks every apt source on the system; if unrelated Docker, Chromium, or other sources fail, fix or disable those sources and rerun this installer."

  if ! need_sudo apt-get update; then
    explain_apt_failure
    exit 1
  fi

  if ! need_sudo apt-get install -y "${apt_packages[@]}"; then
    explain_apt_failure
    exit 1
  fi

  if ! node_ok; then
    log "Installing or upgrading Node.js 22 LTS"
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
    log "PATH has been updated; if commands are still unavailable, reopen your terminal and rerun this installer"
  fi
}

install_macos_deps() {
  if ! has_cmd brew; then
    echo "Homebrew was not found. Install Homebrew first, or install Git, Node.js 22 LTS, and Xcode Command Line Tools manually, then rerun this installer."
    echo "Homebrew: https://brew.sh/"
    exit 1
  fi

  log "Installing missing environment dependencies with Homebrew"
  has_cmd git || brew install git
  node_ok || brew install node
  if [ "${CVN_INSTALL_FFMPEG:-}" = "1" ] && ! ffmpeg_ok; then
    log "CVN_INSTALL_FFMPEG=1; installing ffmpeg with Homebrew"
    brew install ffmpeg
  elif ! ffmpeg_ok; then
    log "ffmpeg was not found; the app install will continue. Install ffmpeg if you need video audio extraction, or rerun with CVN_INSTALL_FFMPEG=1."
  fi
  if [ "${CVN_INSTALL_TESSERACT:-}" = "1" ] && ! tesseract_ok; then
    log "CVN_INSTALL_TESSERACT=1; installing Tesseract OCR with Homebrew"
    brew install tesseract
  elif ! tesseract_ok; then
    log "Tesseract was not found; the app install will continue. Install Tesseract if you need local OCR (on macOS, run brew install tesseract)."
  fi
  if ! xcode-select -p >/dev/null 2>&1; then
    log "Xcode Command Line Tools were not found; starting the installer. If a system dialog appears, click Install, then rerun this script after it completes."
    xcode-select --install 2>/dev/null || true
    echo "Rerun this script after Xcode Command Line Tools installation completes."
    exit 1
  fi
}

ensure_environment() {
  case "$(uname -s)" in
    Linux*) install_linux_deps ;;
    Darwin*) install_macos_deps ;;
    *)
      echo "This Bash environment is not supported. Use the PowerShell installer on native Windows."
      exit 1
      ;;
  esac

  for cmd in git node npm; do
    if ! has_cmd "$cmd"; then
      echo "Missing command: $cmd. Install it manually, then rerun this installer."
      exit 1
    fi
  done

  if ! node_ok; then
    echo "Unsupported Node.js version. Install Node.js 20.19+ or 22.12+; Node.js 22 LTS is recommended."
    exit 1
  fi

  log "Environment check"
  git --version
  node --version
  npm --version
  ffmpeg_status_message
  local_recognition_status_messages
}

is_empty_dir() {
  [ ! -d "$1" ] && return 0
  [ -z "$(find "$1" -mindepth 1 -maxdepth 1 -print -quit)" ]
}

install_project() {
  mkdir -p "$INSTALL_DIR"

  if is_project_dir "$INSTALL_DIR"; then
    log "Existing project directory found; updating: $INSTALL_DIR"
    git -C "$INSTALL_DIR" pull --ff-only
  else
    if ! is_empty_dir "$INSTALL_DIR"; then
      cat <<EOF
The target directory is not empty and is not a Context Vocabulary Notebook project directory:
  $INSTALL_DIR

To avoid mixing project files into an unrelated folder, change into an empty directory and rerun the installer. CVN_HOME is an optional explicit override.

Example:
  mkdir -p /path/to/empty-directory
  cd /path/to/empty-directory
  curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash

EOF
      exit 1
    fi

    log "Cloning project into the current directory: $INSTALL_DIR"
    (cd "$INSTALL_DIR" && git clone "$REPO_URL" .)
  fi

  cd "$INSTALL_DIR"

  if [ ! -f .env ]; then
    cp .env.example .env
    log "Created .env"
  fi

  log "Installing project dependencies"
  if ! npm ci \
    --prefer-offline \
    --no-audit \
    --no-fund \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=2000 \
    --fetch-retry-maxtimeout=15000 \
    --fetch-timeout=60000; then
    cat <<'EOF'

npm ci failed. Check the npm error above first.
If the error mentions better-sqlite3, node-gyp, Python, make, or g++, native build tools are likely incomplete.
On Ubuntu / Debian / WSL, try:
  sudo apt-get update
  sudo apt-get install -y python3 make g++ build-essential

EOF
    exit 1
  fi

  log "Building project"
  npm run build

  cat <<EOF

Installation complete.

Start the app:
  cd "$INSTALL_DIR"
  npm run dev

Open in your browser:
  http://localhost:5173

Local API health check:
  http://localhost:3107/api/health

To update later:
  cd "$INSTALL_DIR"
  git pull --ff-only
  npm ci --prefer-offline --no-audit --no-fund
  npm run build

You can also rerun this installer from this same project directory.

Data locations:
  Database: $INSTALL_DIR/data/context-vocabulary-notebook.sqlite
  Media files: $INSTALL_DIR/uploads

$(ffmpeg_status_message)
$(local_recognition_status_messages)

EOF
}

ensure_environment
install_project
