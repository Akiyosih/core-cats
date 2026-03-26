from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any, Callable


Urlopen = Callable[..., Any]


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _request_json(
    base_url: str,
    secret: str,
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    auth: bool = False,
    opener: Urlopen = urllib.request.urlopen,
) -> dict[str, Any]:
    headers = {"accept": "application/json"}
    body = None
    if payload is not None:
        headers["content-type"] = "application/json"
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    if auth:
        headers["x-corecats-backend-shared-secret"] = secret

    request = urllib.request.Request(f"{base_url}{path}", data=body, headers=headers, method=method)
    try:
        with opener(request, timeout=10) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"{method} {path} returned HTTP {error.code}: {detail}") from error
    except Exception as error:  # noqa: BLE001
        raise RuntimeError(f"{method} {path} failed: {error}") from error

    try:
        parsed = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise RuntimeError(f"{method} {path} returned invalid JSON: {error}") from error
    if not isinstance(parsed, dict):
        raise RuntimeError(f"{method} {path} returned a non-object JSON payload")
    return parsed


def run_smoke_check(
    base_url: str,
    shared_secret: str,
    *,
    opener: Urlopen = urllib.request.urlopen,
) -> dict[str, Any]:
    if not shared_secret:
        raise ValueError("shared secret is required")

    normalized_base_url = base_url.rstrip("/")
    health = _request_json(normalized_base_url, shared_secret, "GET", "/healthz", opener=opener)
    if health.get("ok") is not True:
        raise RuntimeError("/healthz did not return ok=true")
    if health.get("networkName") != "mainnet":
        raise RuntimeError(f"/healthz returned unexpected networkName: {health.get('networkName')}")
    if int(health.get("chainId") or 0) != 1:
        raise RuntimeError(f"/healthz returned unexpected chainId: {health.get('chainId')}")
    backend_mode = str(health.get("backendMode") or "mint-active")

    if backend_mode == "read-only":
        mint_count = _request_json(normalized_base_url, shared_secret, "GET", "/api/public/mint-count", opener=opener)
        if int(mint_count.get("mintedCount") or 0) <= 0:
            raise RuntimeError("/api/public/mint-count returned an invalid mintedCount")

        token_owner = _request_json(
            normalized_base_url,
            shared_secret,
            "GET",
            "/api/public/token-owner?tokenId=1",
            opener=opener,
        )
        if int(token_owner.get("token", {}).get("tokenId") or 0) != 1:
            raise RuntimeError("/api/public/token-owner did not return tokenId=1")
        if not str(token_owner.get("token", {}).get("owner") or "").strip():
            raise RuntimeError("/api/public/token-owner did not return an owner")

        return {
            "base_url": normalized_base_url,
            "network": health.get("networkName"),
            "chain_id": int(health.get("chainId") or 0),
            "backend_mode": backend_mode,
            "public_reads": "ok",
        }

    session_id = f"smoke-{uuid.uuid4()}"
    session = {
        "id": session_id,
        "quantity": 1,
        "status": "awaiting_identity",
        "minter": "",
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
        "expiresAtMs": int(time.time() * 1000) + 5 * 60 * 1000,
        "identify": {
            "challengeHex": "0x" + ("ab" * 32),
            "desktopUri": "",
            "mobileUri": "",
            "qrDataUrl": "",
            "coreId": "",
            "completedAt": "",
        },
        "commit": None,
        "finalize": None,
        "history": [],
    }

    saved = _request_json(
        normalized_base_url,
        shared_secret,
        "PUT",
        f"/api/internal/sessions/{session_id}",
        payload=session,
        auth=True,
        opener=opener,
    )
    if saved.get("id") != session_id:
        raise RuntimeError("session PUT did not echo the saved session")

    loaded = _request_json(
        normalized_base_url,
        shared_secret,
        "GET",
        f"/api/internal/sessions/{session_id}",
        auth=True,
        opener=opener,
    )
    if loaded.get("id") != session_id:
        raise RuntimeError("session GET did not return the expected session id")
    if loaded.get("status") != "awaiting_identity":
        raise RuntimeError(f"session GET returned unexpected status: {loaded.get('status')}")

    deleted = _request_json(
        normalized_base_url,
        shared_secret,
        "DELETE",
        f"/api/internal/sessions/{session_id}",
        auth=True,
        opener=opener,
    )
    if deleted.get("deleted") is not True:
        raise RuntimeError("session DELETE did not report deleted=true")

    return {
        "base_url": normalized_base_url,
        "network": health.get("networkName"),
        "chain_id": int(health.get("chainId") or 0),
        "backend_mode": backend_mode,
        "session_crud": "ok",
    }


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 2:
        print("Usage: python3 -m corecats_mint_backend.contabo_smoke <base_url> <shared_secret>", file=sys.stderr)
        return 2

    try:
        result = run_smoke_check(args[0], args[1])
    except Exception as error:  # noqa: BLE001
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Smoke OK")
    print(f"  base_url={result['base_url']}")
    print(f"  network={result['network']}")
    print(f"  chain_id={result['chain_id']}")
    print(f"  backend_mode={result['backend_mode']}")
    if "session_crud" in result:
        print(f"  session_crud={result['session_crud']}")
    if "public_reads" in result:
        print(f"  public_reads={result['public_reads']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
