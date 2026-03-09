#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/corecats-mint-backend.env}"
SERVICE_FILE="${SERVICE_FILE:-/etc/systemd/system/corecats-mint-backend.service}"
EXPECTED_WALLET4_KEYSTORE_PATH="${EXPECTED_WALLET4_KEYSTORE_PATH:-/root/corecats-keystores/wallet4_finalizer_mainnet.json}"
EXPECTED_WALLET4_PASSWORD_PATH="${EXPECTED_WALLET4_PASSWORD_PATH:-/root/.secrets/wallet4_finalizer_mainnet.password}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARN: $*" >&2
}

require_file() {
  local path="$1"
  [[ -f "${path}" ]] || fail "Required file is missing: ${path}"
}

require_dir() {
  local path="$1"
  [[ -d "${path}" ]] || fail "Required directory is missing: ${path}"
}

check_mode_600() {
  local path="$1"
  local mode
  mode="$(stat -c '%a' "${path}")"
  [[ "${mode}" == "600" ]] || fail "File permission must be 600: ${path} (actual: ${mode})"
}

is_placeholder() {
  local value
  value="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
  [[ -z "${value}" || "${value}" == "replace-me" || "${value}" == replace-with-* ]]
}

if [[ "${ALLOW_NON_ROOT_FOR_TESTS:-0}" != "1" && "${EUID:-$(id -u)}" -ne 0 ]]; then
  fail "Run as root on the Contabo host"
fi

require_file "${ENV_FILE}"
require_file "${SERVICE_FILE}"
check_mode_600 "${ENV_FILE}"

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

if [[ "${CORECATS_BACKEND_PROFILE:-}" != "production" ]]; then
  fail "CORECATS_BACKEND_PROFILE must be production"
fi

if [[ "${CORE_NETWORK_NAME:-}" != "mainnet" ]]; then
  fail "CORE_NETWORK_NAME must be mainnet"
fi

if [[ "${CORE_CHAIN_ID:-}" != "1" ]]; then
  fail "CORE_CHAIN_ID must be 1"
fi

if [[ "${CORE_NETWORK_ID:-}" != "1" ]]; then
  fail "CORE_NETWORK_ID must be 1"
fi

RPC_URL="${CORE_RPC_URL:-${CORE_TESTNET_RPC_URL:-}}"
if [[ -z "${RPC_URL}" ]]; then
  fail "Either CORE_RPC_URL or CORE_TESTNET_RPC_URL must be set"
fi

if [[ "${RPC_URL}" == "https://xcbapi-arch-devin.coreblockchain.net/" ]]; then
  fail "RPC URL must not point to Devin in production"
fi

if [[ "${CORE_EXPLORER_BASE_URL:-}" == "https://xab.blockindex.net" ]]; then
  fail "CORE_EXPLORER_BASE_URL must not point to the Devin explorer in production"
fi

if is_placeholder "${CORECATS_BACKEND_SHARED_SECRET:-}" || [[ "${CORECATS_BACKEND_SHARED_SECRET:-}" == "dev-only-secret" ]]; then
  fail "CORECATS_BACKEND_SHARED_SECRET is empty or placeholder-like"
fi

if is_placeholder "${CORECATS_ADDRESS:-}"; then
  fail "CORECATS_ADDRESS is empty or placeholder-like"
fi

if is_placeholder "${MINT_SIGNER_PRIVATE_KEY:-}"; then
  fail "MINT_SIGNER_PRIVATE_KEY is empty or placeholder-like"
fi

if [[ ! "${MINT_SIGNER_PRIVATE_KEY}" =~ ^(0x)?[0-9a-fA-F]{114}$ ]]; then
  fail "MINT_SIGNER_PRIVATE_KEY must be a 57-byte key (114 hex chars, optional 0x prefix)"
fi

require_dir "${CORECATS_FOXAR_DIR:-}"
require_file "${SPARK_PATH:-}"
if [[ ! -x "${SPARK_PATH}" ]]; then
  fail "SPARK_PATH is not executable: ${SPARK_PATH}"
fi

require_dir "$(dirname "${CORECATS_BACKEND_DB_PATH:-/var/lib/corecats-mint-backend/corecats-mint.db}")"

HAS_FINALIZER_RAW=0
HAS_FINALIZER_KEYSTORE=0

if [[ -n "${FINALIZER_PRIVATE_KEY:-}" ]]; then
  HAS_FINALIZER_RAW=1
  if [[ ! "${FINALIZER_PRIVATE_KEY}" =~ ^(0x)?[0-9a-fA-F]{114}$ ]]; then
    fail "FINALIZER_PRIVATE_KEY must be a 57-byte key (114 hex chars, optional 0x prefix)"
  fi
fi

if [[ -n "${FINALIZER_KEYSTORE_PATH:-}" || -n "${FINALIZER_PASSWORD_FILE:-}" ]]; then
  if [[ -z "${FINALIZER_KEYSTORE_PATH:-}" || -z "${FINALIZER_PASSWORD_FILE:-}" ]]; then
    fail "FINALIZER_KEYSTORE_PATH and FINALIZER_PASSWORD_FILE must be set together"
  fi
  if [[ -z "${FINALIZER_ADDRESS:-}" ]]; then
    fail "FINALIZER_ADDRESS must be set when FINALIZER_KEYSTORE_PATH is used"
  fi
  HAS_FINALIZER_KEYSTORE=1
  require_file "${FINALIZER_KEYSTORE_PATH}"
  require_file "${FINALIZER_PASSWORD_FILE}"
  check_mode_600 "${FINALIZER_KEYSTORE_PATH}"
  check_mode_600 "${FINALIZER_PASSWORD_FILE}"

  if [[ "${FINALIZER_KEYSTORE_PATH}" != "${EXPECTED_WALLET4_KEYSTORE_PATH}" ]]; then
    warn "Finalizer keystore path differs from recommended default: ${FINALIZER_KEYSTORE_PATH}"
  fi
  if [[ "${FINALIZER_PASSWORD_FILE}" != "${EXPECTED_WALLET4_PASSWORD_PATH}" ]]; then
    warn "Finalizer password path differs from recommended default: ${FINALIZER_PASSWORD_FILE}"
  fi
fi

if [[ "${HAS_FINALIZER_RAW}" -eq 0 && "${HAS_FINALIZER_KEYSTORE}" -eq 0 ]]; then
  fail "Set FINALIZER_PRIVATE_KEY or FINALIZER_KEYSTORE_PATH + FINALIZER_PASSWORD_FILE"
fi

(
  cd "${BACKEND_DIR}"
  python3 - <<'PY'
from corecats_mint_backend.config import load_config

cfg = load_config()
print(f"config-ok profile={cfg.profile} network={cfg.network_name} chain_id={cfg.chain_id} network_id={cfg.network_id}")
PY
)

echo "Preflight OK"
echo "  env_file=${ENV_FILE}"
echo "  service_file=${SERVICE_FILE}"
echo "  rpc_url=${RPC_URL}"
echo "  corecats_address=${CORECATS_ADDRESS}"
echo "  finalizer_mode=$([[ "${HAS_FINALIZER_KEYSTORE}" -eq 1 ]] && echo "keystore" || echo "raw")"
