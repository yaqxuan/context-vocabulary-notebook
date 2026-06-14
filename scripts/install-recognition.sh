#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="context-vocabulary-notebook"
WHISPER_REPO="https://github.com/ggerganov/whisper.cpp.git"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"

APP_ROOT="$PWD"
TOOLS_ROOT="$APP_ROOT/tools"
MODELS_ROOT="$APP_ROOT/models"
WHISPER_ROOT="$TOOLS_ROOT/whisper.cpp"
WHISPER_EXE="$WHISPER_ROOT/build/bin/whisper-cli"
MODEL_PATH="$MODELS_ROOT/ggml-small.bin"
ENV_FILE="$APP_ROOT/.env"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

tesseract_apt_package() {
  case "$1" in
    chi_sim) printf 'tesseract-ocr-chi-sim\n' ;;
    eng) printf 'tesseract-ocr-eng\n' ;;
    jpn) printf 'tesseract-ocr-jpn\n' ;;
    kor) printf 'tesseract-ocr-kor\n' ;;
    fra) printf 'tesseract-ocr-fra\n' ;;
    deu) printf 'tesseract-ocr-deu\n' ;;
    spa) printf 'tesseract-ocr-spa\n' ;;
    rus) printf 'tesseract-ocr-rus\n' ;;
    *) printf 'tesseract-ocr-%s\n' "$1" ;;
  esac
}

tesseract_languages() {
  local raw="${CVN_TESSERACT_LANG:-eng}"
  local language
  printf '%s' "$raw" | tr '+' '\n' | while IFS= read -r language; do
    [ -n "$language" ] && printf '%s\n' "$language"
  done
}

validate_tesseract_lang() {
  if [[ ! "$1" =~ ^[A-Za-z0-9_]+(\+[A-Za-z0-9_]+)*$ ]]; then
    echo "Invalid CVN_TESSERACT_LANG: use codes like eng, jpn, or eng+chi_sim."
    exit 1
  fi
}

is_project_dir() {
  [ -f "$1/package.json" ] && grep -Eq '"name"[[:space:]]*:[[:space:]]*"context-vocabulary-notebook"' "$1/package.json"
}

need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif has_cmd sudo; then
    sudo "$@"
  else
    echo "Administrator privileges are required, but sudo is not available: $*"
    exit 1
  fi
}

install_linux_packages() {
  [ "${CVN_SKIP_SYSTEM_PACKAGES:-}" = "1" ] && return
  has_cmd apt-get || return

  local packages=()
  has_cmd git || packages+=(git)
  has_cmd curl || packages+=(curl)
  has_cmd cmake || packages+=(cmake)
  has_cmd g++ || packages+=(build-essential)
  has_cmd ffmpeg || packages+=(ffmpeg)
  has_cmd tesseract || packages+=(tesseract-ocr)
  if [ -n "${CVN_TESSERACT_LANG:-}" ]; then
    local language
    while IFS= read -r language; do
      packages+=("$(tesseract_apt_package "$language")")
    done < <(tesseract_languages)
  fi

  if [ "${#packages[@]}" -eq 0 ]; then
    log "Linux recognition dependencies are already available; skipping apt-get"
    return
  fi

  log "Installing Linux recognition dependencies: ${packages[*]}"
  need_sudo apt-get update
  if ! need_sudo apt-get install -y "${packages[@]}"; then
    cat <<'EOF'
apt-get failed. This is usually a system package-source problem, not a notebook problem.
Fix broken Docker / Chrome / NVIDIA / GPG apt sources, install missing tools manually, then rerun this installer.
EOF
    exit 1
  fi
}

install_macos_packages() {
  [ "${CVN_SKIP_SYSTEM_PACKAGES:-}" = "1" ] && return
  [ "$(uname -s)" = "Darwin" ] || return

  local packages=()
  has_cmd git || packages+=(git)
  has_cmd curl || packages+=(curl)
  has_cmd cmake || packages+=(cmake)
  has_cmd ffmpeg || packages+=(ffmpeg)
  has_cmd tesseract || packages+=(tesseract)

  if [ "${#packages[@]}" -eq 0 ]; then
    log "macOS recognition dependencies are already available; skipping brew"
    return
  fi
  if ! has_cmd brew; then
    echo "Homebrew is missing. Install Homebrew or install these tools manually: ${packages[*]}"
    exit 1
  fi

  log "Installing macOS recognition dependencies: ${packages[*]}"
  brew install "${packages[@]}"
}

require_build_tools() {
  local missing=()
  has_cmd git || missing+=(git)
  has_cmd curl || missing+=(curl)
  has_cmd cmake || missing+=(cmake)
  has_cmd ffmpeg || missing+=(ffmpeg)
  has_cmd tesseract || missing+=(tesseract)

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Missing required recognition tools: ${missing[*]}"
    echo "Install them with your system package manager, then rerun this installer."
    exit 1
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp
  touch "$ENV_FILE"
  tmp="$(mktemp)"

  if grep -Eq "^${key}=" "$ENV_FILE"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { prefix = key "="; wrote = 0 }
      index($0, prefix) == 1 {
        if (!wrote) {
          print key "=" value
          wrote = 1
        }
        next
      }
      { print }
    ' "$ENV_FILE" > "$tmp"
  else
    cp "$ENV_FILE" "$tmp"
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi

  mv "$tmp" "$ENV_FILE"
}

install_whisper_cpp() {
  if [ -x "$WHISPER_EXE" ]; then
    log "whisper.cpp already installed at $WHISPER_EXE"
    return
  fi

  mkdir -p "$TOOLS_ROOT"
  if [ -d "$WHISPER_ROOT/.git" ]; then
    log "Updating whisper.cpp"
    git -C "$WHISPER_ROOT" pull --ff-only
  elif [ -d "$WHISPER_ROOT" ]; then
    echo "$WHISPER_ROOT exists but is not a git checkout. Move it aside, then rerun this installer."
    exit 1
  else
    log "Cloning whisper.cpp into $WHISPER_ROOT"
    git clone "$WHISPER_REPO" "$WHISPER_ROOT"
  fi

  log "Building whisper.cpp CLI"
  cmake -S "$WHISPER_ROOT" -B "$WHISPER_ROOT/build" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$WHISPER_ROOT/build" --config Release

  if [ ! -x "$WHISPER_EXE" ]; then
    echo "whisper-cli was not created at $WHISPER_EXE"
    exit 1
  fi
}

install_model() {
  mkdir -p "$MODELS_ROOT"
  if [ -s "$MODEL_PATH" ]; then
    log "Whisper model already exists at $MODEL_PATH"
    return
  fi

  log "Downloading Whisper model into $MODEL_PATH"
  curl -L -o "$MODEL_PATH" "$MODEL_URL"
}

write_env() {
  log "Writing recognition settings to .env"
  set_env_value CVN_FFMPEG_PATH "$(command -v ffmpeg)"
  set_env_value CVN_OCR_PROVIDER tesseract
  set_env_value CVN_TESSERACT_PATH "$(command -v tesseract)"
  set_env_value CVN_TESSERACT_LANG "${CVN_TESSERACT_LANG:-eng}"
  set_env_value CVN_TESSERACT_TIMEOUT_MS 30000
  set_env_value CVN_STT_PROVIDER whisper.cpp
  set_env_value CVN_WHISPER_CPP_PATH "$WHISPER_EXE"
  set_env_value CVN_WHISPER_CPP_MODEL "$MODEL_PATH"
  set_env_value CVN_WHISPER_CPP_TIMEOUT_MS 120000
}

write_verification() {
  log "Verification"
  ffmpeg -version | head -n 1 || true
  tesseract --version | head -n 1 || true
  "$WHISPER_EXE" --help >/dev/null 2>&1 || true
  test -s "$MODEL_PATH"
  printf 'ffmpeg: %s\n' "$(command -v ffmpeg)"
  printf 'tesseract: %s\n' "$(command -v tesseract)"
  printf 'whisper.cpp: %s\n' "$WHISPER_EXE"
  printf 'Whisper model: %s\n' "$MODEL_PATH"
  printf '\nRestart the vocabulary notebook app, then click the local recognition check again.\n'
}

main() {
  if ! is_project_dir "$APP_ROOT"; then
    echo "Run this installer from the context-vocabulary-notebook project directory; package.json must have name context-vocabulary-notebook."
    exit 1
  fi
  validate_tesseract_lang "${CVN_TESSERACT_LANG:-eng}"

  mkdir -p "$TOOLS_ROOT" "$MODELS_ROOT"
  install_linux_packages
  install_macos_packages
  require_build_tools
  install_whisper_cpp
  install_model
  write_env
  write_verification
}

main "$@"
