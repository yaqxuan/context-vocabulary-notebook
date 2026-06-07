#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW_INSTALL_URL="https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh"
REPO_URL="https://github.com/yaqxuan/context-vocabulary-notebook.git"
TMP_ROOT=""
KEEP_TMP=0

log() {
  printf '[smoke-install] %s\n' "$*"
}

fail() {
  KEEP_TMP=1
  printf '[smoke-install] FAILURE: %s\n' "$*" >&2
  if [ -n "$TMP_ROOT" ]; then
    printf '[smoke-install] Preserved temp dir: %s\n' "$TMP_ROOT" >&2
  fi
  exit 1
}

cleanup() {
  local status=$?
  if [ "$status" -eq 0 ] && [ "$KEEP_TMP" -eq 0 ] && [ -n "$TMP_ROOT" ]; then
    rm -rf "$TMP_ROOT"
  elif [ "$status" -ne 0 ] && [ -n "$TMP_ROOT" ]; then
    printf '[smoke-install] Preserved temp dir: %s\n' "$TMP_ROOT" >&2
  fi
}
trap cleanup EXIT

assert_exists() {
  [ -e "$1" ] || fail "Expected path to exist: $1"
}

assert_not_exists() {
  [ ! -e "$1" ] || fail "Expected path to be absent: $1"
}

assert_file_contains() {
  local file="$1"
  local expected="$2"
  grep -Fq "$expected" "$file" || fail "Expected $file to contain: $expected"
}

make_local_git_wrapper() {
  local bin_dir="$1"
  mkdir -p "$bin_dir"
  local real_git
  real_git="$(command -v git)"
  cat > "$bin_dir/git" <<EOF
#!/usr/bin/env bash
set -euo pipefail
if [ "\${1:-}" = "clone" ] && [ "\${2:-}" = "$REPO_URL" ]; then
  shift 2
  exec "$real_git" clone "$ROOT_DIR" "\$@"
fi
exec "$real_git" "\$@"
EOF
  chmod +x "$bin_dir/git"
}

run_installer() {
  local app_dir="$1"
  local mode="${CVN_SMOKE_INSTALL_SOURCE:-local}"
  mkdir -p "$app_dir"
  case "$mode" in
    local)
      local wrapper_dir="$TMP_ROOT/bin"
      make_local_git_wrapper "$wrapper_dir"
      (cd "$app_dir" && PATH="$wrapper_dir:$PATH" bash "$ROOT_DIR/scripts/install.sh")
      ;;
    published)
      local install_url="${CVN_INSTALL_URL:-$RAW_INSTALL_URL}"
      (cd "$app_dir" && curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL "$install_url" | bash)
      ;;
    *)
      fail "Unsupported CVN_SMOKE_INSTALL_SOURCE=$mode; use local or published"
      ;;
  esac
}

verify_install_outputs() {
  local app_dir="$1"
  assert_exists "$app_dir/.git"
  assert_exists "$app_dir/package.json"
  assert_exists "$app_dir/.env"
  assert_exists "$app_dir/dist"
}

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/cvn-smoke-install.XXXXXX")"
log "Temp dir: $TMP_ROOT"

APP_DIR="$TMP_ROOT/app"
log "Running initial installer in empty temp app dir"
run_installer "$APP_DIR"
verify_install_outputs "$APP_DIR"

log "Adding sentinel data and custom .env content before rerun"
mkdir -p "$APP_DIR/data/uploads"
printf 'sentinel upload\n' > "$APP_DIR/data/uploads/sentinel.txt"
printf 'custom env sentinel\n' > "$APP_DIR/.env"

log "Rerunning installer in existing project dir"
run_installer "$APP_DIR"
verify_install_outputs "$APP_DIR"
assert_not_exists "$APP_DIR/context-vocabulary-notebook"
assert_file_contains "$APP_DIR/.env" "custom env sentinel"
assert_file_contains "$APP_DIR/data/uploads/sentinel.txt" "sentinel upload"

log "Testing refusal for non-empty ordinary directory"
REFUSAL_DIR="$TMP_ROOT/non-empty"
mkdir -p "$REFUSAL_DIR"
printf 'not a project\n' > "$REFUSAL_DIR/ordinary.txt"
set +e
refusal_output="$(run_installer "$REFUSAL_DIR" 2>&1)"
refusal_status=$?
set -e
if [ "$refusal_status" -eq 0 ]; then
  printf '%s\n' "$refusal_output" >&2
  fail "Installer succeeded in a non-empty ordinary directory"
fi
printf '%s\n' "$refusal_output" | grep -Eq '不是空目录|not.*empty|non-empty|Context Vocabulary Notebook' || fail "Refusal output did not explain non-empty directory protection"
assert_not_exists "$REFUSAL_DIR/.git"
assert_not_exists "$REFUSAL_DIR/package.json"

log "Smoke install passed"
