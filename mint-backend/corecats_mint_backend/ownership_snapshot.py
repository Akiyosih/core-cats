from __future__ import annotations

import json
import threading
import time
import urllib.request
from datetime import datetime, timezone
import re
from typing import Any, Callable

from .config import Config

ZERO_ADDRESS = "00000000000000000000000000000000000000000000"
BLOCKINDEX_USER_AGENT = "Mozilla/5.0 CoreCats/1.0"
CORE_ADDRESS_RE = re.compile(r"^(?:ab|cb)[0-9a-f]{42}$", re.IGNORECASE)
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


def build_public_status_snapshot(config: Config, *, opener: Urlopen = urllib.request.urlopen) -> dict[str, Any]:
    txids = _fetch_contract_tx_ids(config, opener=opener)
    api_base_url = f"{config.explorer_base_url.rstrip('/')}/api/v2"
    transactions = [_fetch_json(f"{api_base_url}/tx/{txid}", opener=opener) for txid in txids]

    transactions.sort(key=lambda tx: (_to_int(tx.get("blockHeight")), _to_int(tx.get("blockTime"))))
    normalized_contract = _normalize_address(config.corecats_address)
    token_states: dict[int, dict[str, Any]] = {}

    for tx in transactions:
        for transfer in tx.get("tokenTransfers", []):
            if transfer.get("type") != "CBC721":
                continue
            if _normalize_address(transfer.get("contract", "")) != normalized_contract:
                continue

            token_id = _to_int(transfer.get("value"))
            if token_id <= 0:
                continue

            current = token_states.get(token_id) or {
                "tokenId": token_id,
                "minted": False,
                "owner": None,
                "mintTxHash": None,
                "latestTxHash": None,
                "mintedAt": None,
                "updatedAt": None,
            }

            from_address = _normalize_address(transfer.get("from", ""))
            to_address = _normalize_address(transfer.get("to", ""))

            if from_address == ZERO_ADDRESS and not current["mintTxHash"]:
                current["minted"] = True
                current["mintTxHash"] = tx.get("txid")
                current["mintedAt"] = tx.get("blockTime")

            current["minted"] = True
            current["owner"] = to_address or None
            current["latestTxHash"] = tx.get("txid")
            current["updatedAt"] = tx.get("blockTime")
            token_states[token_id] = current

    by_token: dict[str, Any] = {}
    by_owner_buckets: dict[str, dict[str, Any]] = {}

    for token_id, state in token_states.items():
        owner = state["owner"]
        by_token[str(token_id)] = {
            "minted": True,
            "owner": owner,
            "mintTxHash": state["mintTxHash"],
            "latestTxHash": state["latestTxHash"],
            "mintedAt": state["mintedAt"],
            "updatedAt": state["updatedAt"],
            "explorer": {
                "mintTx": _explorer_tx_url(config.explorer_base_url, state["mintTxHash"]),
                "latestTx": _explorer_tx_url(config.explorer_base_url, state["latestTxHash"]),
                "owner": _explorer_address_url(config.explorer_base_url, owner),
            },
        }

        if owner and owner != ZERO_ADDRESS:
            bucket = by_owner_buckets.get(owner) or {
                "owner": owner,
                "explorer": _explorer_address_url(config.explorer_base_url, owner),
                "tokenIds": [],
            }
            bucket["tokenIds"].append(token_id)
            by_owner_buckets[owner] = bucket

    by_owner = {}
    for owner, bucket in by_owner_buckets.items():
        bucket["tokenIds"].sort()
        by_owner[owner] = bucket

    return {
        "fetchedAt": now_iso(),
        "errorMessage": "",
        "cacheTtlSeconds": config.public_status_cache_seconds,
        "explorerBaseUrl": config.explorer_base_url,
        "coreCatsAddress": config.corecats_address,
        "mintedCount": len(token_states),
        "byToken": by_token,
        "byOwner": by_owner,
    }


class OwnershipSnapshotCache:
    def __init__(self, config: Config, *, opener: Urlopen = urllib.request.urlopen):
        self._config = config
        self._opener = opener
        self._lock = threading.Lock()
        self._snapshot: dict[str, Any] | None = None
        self._expires_at = 0.0

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
        snapshot = self.snapshot()
        owner_bucket = snapshot.get("byOwner", {}).get(normalized_owner) or {
            "owner": normalized_owner,
            "explorer": _explorer_address_url(self._config.explorer_base_url, normalized_owner),
            "tokenIds": [],
        }
        token_ids = [int(token_id) for token_id in owner_bucket.get("tokenIds", [])]
        by_token = {
            str(token_id): snapshot.get("byToken", {}).get(str(token_id))
            for token_id in token_ids
            if snapshot.get("byToken", {}).get(str(token_id))
        }
        return {
            "fetchedAt": snapshot.get("fetchedAt", now_iso()),
            "errorMessage": snapshot.get("errorMessage", ""),
            "cacheTtlSeconds": snapshot.get("cacheTtlSeconds", self._config.public_status_cache_seconds),
            "explorerBaseUrl": snapshot.get("explorerBaseUrl", self._config.explorer_base_url),
            "coreCatsAddress": snapshot.get("coreCatsAddress", self._config.corecats_address),
            "owner": owner_bucket,
            "byToken": by_token,
        }
