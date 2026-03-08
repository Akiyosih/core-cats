#!/usr/bin/env bash
set -euo pipefail

BACKEND_ORIGIN="${1:-${BACKEND_ORIGIN:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -n "${BACKEND_ORIGIN}" ]] || fail "Pass the backend HTTPS origin as the first argument or BACKEND_ORIGIN"

(
  cd "${BACKEND_DIR}"
  python3 -m corecats_mint_backend.contabo_origin_check "${BACKEND_ORIGIN}"
)
