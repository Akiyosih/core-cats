#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/corecats-mint-backend.env}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -r "${ENV_FILE}" ]] || fail "Env file is not readable: ${ENV_FILE}"

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

BACKEND_MODE="${CORECATS_BACKEND_MODE:-mint-active}"
BACKEND_MODE="$(echo "${BACKEND_MODE}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"

if [[ "${BACKEND_MODE}" == "mint-active" && -z "${CORECATS_BACKEND_SHARED_SECRET:-}" ]]; then
  fail "CORECATS_BACKEND_SHARED_SECRET is not set in ${ENV_FILE}"
fi

(
  cd "${BACKEND_DIR}"
  python3 -m corecats_mint_backend.contabo_smoke "${BASE_URL}" "${CORECATS_BACKEND_SHARED_SECRET:-}"
)
