from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Any, Callable


Urlopen = Callable[..., Any]


def _request_healthz(base_url: str, *, opener: Urlopen = urllib.request.urlopen) -> dict[str, Any]:
    request = urllib.request.Request(f"{base_url.rstrip('/')}/healthz", headers={"accept": "application/json"}, method="GET")
    try:
        with opener(request, timeout=10) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"GET /healthz returned HTTP {error.code}: {detail}") from error
    except Exception as error:  # noqa: BLE001
        raise RuntimeError(f"GET /healthz failed: {error}") from error

    try:
        payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise RuntimeError(f"GET /healthz returned invalid JSON: {error}") from error
    if not isinstance(payload, dict):
        raise RuntimeError("GET /healthz returned a non-object JSON payload")
    return payload


def run_origin_check(base_url: str, *, opener: Urlopen = urllib.request.urlopen) -> dict[str, Any]:
    normalized = base_url.strip().rstrip("/")
    if not normalized.startswith("https://"):
        raise ValueError("backend origin must start with https://")

    health = _request_healthz(normalized, opener=opener)
    if health.get("ok") is not True:
        raise RuntimeError("/healthz did not return ok=true")
    if health.get("networkName") != "mainnet":
        raise RuntimeError(f"/healthz returned unexpected networkName: {health.get('networkName')}")
    if int(health.get("chainId") or 0) != 1:
        raise RuntimeError(f"/healthz returned unexpected chainId: {health.get('chainId')}")

    return {
        "base_url": normalized,
        "network": health.get("networkName"),
        "chain_id": int(health.get("chainId") or 0),
    }


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1:
        print("Usage: python3 -m corecats_mint_backend.contabo_origin_check <https_backend_origin>", file=sys.stderr)
        return 2

    try:
        result = run_origin_check(args[0])
    except Exception as error:  # noqa: BLE001
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Origin OK")
    print(f"  base_url={result['base_url']}")
    print(f"  network={result['network']}")
    print(f"  chain_id={result['chain_id']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
