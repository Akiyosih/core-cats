from __future__ import annotations

import json
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import re
from typing import Any, Callable

from .config import Config
from .rpc import CoreRpcClient
from .token_evidence import fetch_owner_of

ZERO_ADDRESS = "00000000000000000000000000000000000000000000"
BLOCKINDEX_USER_AGENT = "Mozilla/5.0 CoreCats/1.0"
CORE_ADDRESS_RE = re.compile(r"^(?:ab|cb)[0-9a-f]{42}$", re.IGNORECASE)
MAX_SUPPLY = 1000
Urlopen = Callable[..., Any]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_address(value: str) -> str:
    return str(value or "").strip().lower()


def _normalize_owner_lookup(value: str) -> str:
    normalized = _normalize_address(value)
    if not CORE_ADDRESS_RE.match(normalized):
        raise ValueError("owner address must be a valid Core wallet address")
    return normalized


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _explorer_address_url(explorer_base_url: str, address: str) -> str | None:
    if not address:
        return None
    return f"{explorer_base_url.rstrip('/')}/address/{address}"


def _explorer_tx_url(explorer_base_url: str, tx_hash: str) -> str | None:
    if not tx_hash:
        return None
    return f"{explorer_base_url.rstrip('/')}/tx/{tx_hash}"


def _fetch_json(url: str, *, opener: Urlopen) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "accept": "application/json",
            "user-agent": BLOCKINDEX_USER_AGENT,
        },
        method="GET",
    )
    with opener(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"Expected JSON object from {url}")
    return payload


def _empty_token_status(owner: str | None = None) -> dict[str, Any]:
    return {
        "minted": True,
        "owner": owner,
        "mintTxHash": None,
        "latestTxHash": None,
        "mintedAt": None,
        "updatedAt": None,
        "explorer": {
            "mintTx": None,
            "latestTx": None,
            "owner": None,
        },
    }


def _extract_owner_token_ids(payload: dict[str, Any], normalized_contract: str) -> list[int]:
    token_ids: set[int] = set()
    for token in payload.get("tokens", []):
        if token.get("type") != "CBC721":
            continue
        if _normalize_address(token.get("contract", "")) != normalized_contract:
            continue
        for token_id in token.get("ids", []):
            parsed = _to_int(token_id)
            if parsed > 0:
                token_ids.add(parsed)
    return sorted(token_ids)


def _fetch_contract_tx_ids(config: Config, *, opener: Urlopen) -> list[str]:
    txids: list[str] = []
    page = 1
    total_pages = 1
    api_base_url = f"{config.explorer_base_url.rstrip('/')}/api/v2"

    while page <= total_pages:
        payload = _fetch_json(f"{api_base_url}/address/{config.corecats_address}?page={page}", opener=opener)
        total_pages = max(1, _to_int(payload.get("totalPages")))
        txids.extend(str(txid) for txid in payload.get("txids", []) if txid)
        page += 1

    return list(dict.fromkeys(txids))


def _extract_minted_token_ids(payload: dict[str, Any], normalized_contract: str) -> list[int]:
    token_ids: set[int] = set()
    for transfer in payload.get("tokenTransfers", []):
        if transfer.get("type") != "CBC721":
            continue
        if _normalize_address(transfer.get("contract", "")) != normalized_contract:
            continue
        if _normalize_address(transfer.get("from", "")) != ZERO_ADDRESS:
            continue
        parsed = _to_int(transfer.get("value"))
        if parsed > 0:
            token_ids.add(parsed)
    return sorted(token_ids)


def build_public_status_snapshot(
    config: Config,
    *,
    opener: Urlopen = urllib.request.urlopen,
    rpc_client: CoreRpcClient | None = None,
) -> dict[str, Any]:
    txids = _fetch_contract_tx_ids(config, opener=opener)
    normalized_contract = _normalize_address(config.corecats_address)
    api_base_url = f"{config.explorer_base_url.rstrip('/')}/api/v2"
    minted_token_ids: set[int] = set()

    if txids:
        max_workers = min(32, max(4, len(txids)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(_fetch_json, f"{api_base_url}/tx/{txid}", opener=opener): txid
                for txid in txids
            }
            for future in as_completed(futures):
                payload = future.result()
                minted_token_ids.update(_extract_minted_token_ids(payload, normalized_contract))

    rpc_minted_count: int | None = None
    try:
        client = rpc_client or CoreRpcClient(config.rpc_url)
        available_supply = client.get_available_supply(config.corecats_address)
        rpc_minted_count = max(0, MAX_SUPPLY - available_supply)
    except Exception:  # noqa: BLE001
        rpc_minted_count = None

    by_token = {str(token_id): _empty_token_status() for token_id in sorted(minted_token_ids)}
    return {
        "fetchedAt": now_iso(),
        "errorMessage": "",
        "cacheTtlSeconds": config.public_status_cache_seconds,
        "explorerBaseUrl": config.explorer_base_url,
        "coreCatsAddress": config.corecats_address,
        "mintedCount": max(len(minted_token_ids), rpc_minted_count or 0),
        "byToken": by_token,
        "byOwner": {},
    }


def build_public_owner_snapshot(config: Config, owner: str, *, opener: Urlopen = urllib.request.urlopen) -> dict[str, Any]:
    normalized_owner = _normalize_owner_lookup(owner)
    normalized_contract = _normalize_address(config.corecats_address)
    api_base_url = f"{config.explorer_base_url.rstrip('/')}/api/v2"
    payload = _fetch_json(f"{api_base_url}/address/{normalized_owner}", opener=opener)
    token_ids = _extract_owner_token_ids(payload, normalized_contract)
    owner_url = _explorer_address_url(config.explorer_base_url, normalized_owner)
    by_token = {
        str(token_id): {
            **_empty_token_status(normalized_owner),
            "explorer": {
                "mintTx": None,
                "latestTx": None,
                "owner": owner_url,
            },
        }
        for token_id in token_ids
    }
    return {
        "fetchedAt": now_iso(),
        "errorMessage": "",
        "cacheTtlSeconds": config.public_status_cache_seconds,
        "explorerBaseUrl": config.explorer_base_url,
        "coreCatsAddress": config.corecats_address,
        "owner": {
            "owner": normalized_owner,
            "explorer": owner_url,
            "tokenIds": token_ids,
        },
        "byToken": by_token,
    }


class OwnershipSnapshotCache:
    def __init__(self, config: Config, *, opener: Urlopen = urllib.request.urlopen):
        self._config = config
        self._opener = opener
        self._lock = threading.Lock()
        self._snapshot: dict[str, Any] | None = None
        self._expires_at = 0.0
        self._owner_cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._token_owner_cache: dict[int, tuple[float, dict[str, Any]]] = {}

    def snapshot(self) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            if self._snapshot and self._expires_at > now:
                return self._snapshot

        try:
            snapshot = build_public_status_snapshot(self._config, opener=self._opener)
        except Exception as error:  # noqa: BLE001
            message = str(error)
            with self._lock:
                if self._snapshot:
                    return {
                        **self._snapshot,
                        "errorMessage": message,
                    }
            return {
                "fetchedAt": now_iso(),
                "errorMessage": message,
                "cacheTtlSeconds": self._config.public_status_cache_seconds,
                "explorerBaseUrl": self._config.explorer_base_url,
                "coreCatsAddress": self._config.corecats_address,
                "mintedCount": 0,
                "byToken": {},
                "byOwner": {},
            }

        with self._lock:
            self._snapshot = snapshot
            self._expires_at = now + self._config.public_status_cache_seconds
            return snapshot

    def owner_lookup(self, owner: str) -> dict[str, Any]:
        normalized_owner = _normalize_owner_lookup(owner)
        now = time.time()
        with self._lock:
            cached = self._owner_cache.get(normalized_owner)
            if cached and cached[0] > now:
                return cached[1]

        payload = build_public_owner_snapshot(self._config, normalized_owner, opener=self._opener)
        with self._lock:
            self._owner_cache[normalized_owner] = (now + self._config.public_status_cache_seconds, payload)
        return payload

    def token_owner_lookup(self, token_id: int, rpc: CoreRpcClient) -> dict[str, Any]:
        parsed_token_id = _to_int(token_id)
        if parsed_token_id <= 0:
            raise ValueError("token id must be a positive integer")

        now = time.time()
        with self._lock:
            cached = self._token_owner_cache.get(parsed_token_id)
            if cached and cached[0] > now:
                return cached[1]

        owner = _normalize_owner_lookup(fetch_owner_of(rpc, self._config.corecats_address, parsed_token_id))
        owner_url = _explorer_address_url(self._config.explorer_base_url, owner)
        payload = {
            "fetchedAt": now_iso(),
            "errorMessage": "",
            "cacheTtlSeconds": self._config.public_status_cache_seconds,
            "explorerBaseUrl": self._config.explorer_base_url,
            "coreCatsAddress": self._config.corecats_address,
            "token": {
                "tokenId": parsed_token_id,
                "owner": owner,
                "explorer": owner_url,
            },
        }

        with self._lock:
            self._token_owner_cache[parsed_token_id] = (now + self._config.public_status_cache_seconds, payload)
        return payload
