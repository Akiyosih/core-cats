from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import Config, load_config, normalize_core_address_key
from .finalize_worker import FinalizeManager, FinalizeWorker
from .ownership_snapshot import (
    OwnershipSnapshotCache,
    PUBLIC_OWNER_CACHE_SECONDS,
    PUBLIC_TOKEN_OWNER_CACHE_SECONDS,
)
from .policy import AuthorizationRejected, evaluate_authorization_precheck
from .rpc import CoreRpcClient, RpcError
from .spark import classify_finalize_error_detail, issue_mint_authorization, relay_finalize_mint
from .storage import SessionStore

MAX_SUPPLY = 1000


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def json_response(
    handler: BaseHTTPRequestHandler,
    status: int,
    payload: dict,
    *,
    cache_control: str = "no-store",
    extra_headers: dict[str, str] | None = None,
) -> None:
    data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("content-length", str(len(data)))
    handler.send_header("cache-control", cache_control)
    if extra_headers:
        for key, value in extra_headers.items():
            handler.send_header(key, value)
    handler.end_headers()
    handler.wfile.write(data)


def normalized_path(value: str) -> str:
    return urlparse(value).path


def is_canary_wallet_allowed(config: Config, minter: str) -> bool:
    if not config.canary_allowed_core_id_keys:
        return True
    return normalize_core_address_key(minter) in config.canary_allowed_core_id_keys


class MintBackendHandler(BaseHTTPRequestHandler):
    server_version = "CoreCatsMintBackend/0.1"

    @property
    def config(self) -> Config:
        return self.server.config  # type: ignore[attr-defined]

    @property
    def store(self) -> SessionStore:
        return self.server.store  # type: ignore[attr-defined]

    @property
    def rpc(self) -> CoreRpcClient:
        return self.server.rpc  # type: ignore[attr-defined]

    @property
    def finalize_manager(self) -> FinalizeManager:
        return self.server.finalize_manager  # type: ignore[attr-defined]

    @property
    def ownership_snapshot_cache(self) -> OwnershipSnapshotCache:
        return self.server.ownership_snapshot_cache  # type: ignore[attr-defined]

    def _require_auth(self) -> bool:
        if normalized_path(self.path) in {
            "/healthz",
            "/api/public/status",
            "/api/public/owner",
            "/api/public/token-owner",
            "/api/public/mint-count",
        }:
            return True

        expected = self.config.shared_secret
        if not expected:
            json_response(self, 500, {"error": "backend_secret_not_configured"})
            return False

        supplied = self.headers.get("x-corecats-backend-shared-secret", "")
        if not supplied or not secrets.compare_digest(supplied, expected):
            json_response(self, 403, {"error": "forbidden"})
            return False
        return True

    def _read_json(self) -> dict:
        length = int(self.headers.get("content-length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            raise ValueError("request body must be valid JSON")
        if not isinstance(payload, dict):
            raise ValueError("request body must be a JSON object")
        return payload

    def _session_id_from_path(self) -> str:
        prefix = "/api/internal/sessions/"
        path = normalized_path(self.path)
        if not path.startswith(prefix):
            return ""
        return path[len(prefix) :].strip()

    def _handle_healthz(self) -> None:
        json_response(
            self,
            200,
            {
                "ok": True,
                "networkName": self.config.network_name,
                "chainId": self.config.chain_id,
                "finalizeWorker": self.finalize_manager.snapshot(),
            },
        )

    def _public_status_headers(self) -> dict[str, str]:
        return {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
        }

    def _handle_public_status(self) -> None:
        json_response(
            self,
            410,
            {
                "error": "public_status_retired",
                "detail": "The global public status snapshot has been retired after sell-out. Use /api/public/owner or /api/public/token-owner instead.",
                "cacheTtlSeconds": 300,
            },
            cache_control="public, max-age=300, stale-while-revalidate=600",
            extra_headers=self._public_status_headers(),
        )

    def _handle_public_mint_count(self) -> None:
        try:
            available_supply = self.rpc.get_available_supply(self.config.corecats_address)
            minted_count = max(0, MAX_SUPPLY - available_supply)
            payload = {
                "fetchedAt": now_iso(),
                "errorMessage": "",
                "cacheTtlSeconds": 60,
                "coreCatsAddress": self.config.corecats_address,
                "mintedCount": minted_count,
                "availableSupply": available_supply,
            }
            json_response(
                self,
                200,
                payload,
                cache_control="public, max-age=60, stale-while-revalidate=60",
                extra_headers=self._public_status_headers(),
            )
            return
        except RpcError as error:
            json_response(
                self,
                502,
                {
                    "error": "public_mint_count_unavailable",
                    "detail": str(error),
                    "cacheTtlSeconds": 30,
                    "mintedCount": None,
                },
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return

    def _handle_public_owner(self) -> None:
        owner = str(parse_qs(urlparse(self.path).query).get("address", [""])[0] or "").strip()
        if not owner:
            json_response(
                self,
                400,
                {"error": "owner_address_required", "detail": "owner address is required"},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return
        try:
            payload = self.ownership_snapshot_cache.owner_lookup(owner)
        except ValueError as error:
            json_response(
                self,
                400,
                {"error": "invalid_owner_address", "detail": str(error)},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return
        except Exception as error:  # noqa: BLE001
            json_response(
                self,
                502,
                {"error": "public_owner_lookup_unavailable", "detail": str(error)},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return

        json_response(
            self,
            200,
            payload,
            cache_control=f"public, max-age={PUBLIC_OWNER_CACHE_SECONDS}, stale-while-revalidate={PUBLIC_OWNER_CACHE_SECONDS}",
            extra_headers=self._public_status_headers(),
        )

    def _handle_public_token_owner(self) -> None:
        raw_token_id = str(parse_qs(urlparse(self.path).query).get("tokenId", [""])[0] or "").strip()
        try:
            token_id = int(raw_token_id)
        except ValueError:
            token_id = 0

        if token_id <= 0 or token_id > MAX_SUPPLY:
            json_response(
                self,
                400,
                {"error": "token_id_required", "detail": "token id must be between 1 and 1000"},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return

        snapshot = self.ownership_snapshot_cache.snapshot()
        token_status = snapshot.get("byToken", {}).get(str(token_id))
        if not isinstance(token_status, dict) or not token_status.get("minted"):
            json_response(
                self,
                404,
                {"error": "token_not_minted", "detail": "This token is not minted yet."},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return

        try:
            payload = self.ownership_snapshot_cache.token_owner_lookup(token_id, self.rpc)
        except ValueError as error:
            json_response(
                self,
                400,
                {"error": "invalid_token_id", "detail": str(error)},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return
        except RpcError as error:
            json_response(
                self,
                502,
                {"error": "public_token_owner_unavailable", "detail": str(error)},
                cache_control="public, max-age=30, stale-while-revalidate=30",
                extra_headers=self._public_status_headers(),
            )
            return

        ttl = PUBLIC_TOKEN_OWNER_CACHE_SECONDS
        json_response(
            self,
            200,
            payload,
            cache_control=f"public, max-age={ttl}, stale-while-revalidate={ttl}",
            extra_headers=self._public_status_headers(),
        )

    def _handle_authorize(self) -> None:
        body = self._read_json()
        minter = str(body.get("minter") or "").strip()
        quantity = int(body.get("quantity") or 0)
        if not minter:
            json_response(self, 400, {"error": "minter is required"})
            return
        if quantity not in (1, 2, 3):
            json_response(self, 400, {"error": "quantity must be 1, 2, or 3"})
            return

        nonce = body.get("nonce") or str(int.from_bytes(secrets.token_bytes(32), "big"))
        expiry = int(body.get("expiry") or (int(datetime.now(timezone.utc).timestamp()) + 10 * 60))

        try:
            if not self.config.mint_signer_private_key:
                json_response(
                    self,
                    410,
                    {
                        "error": "mint_authorization_disabled",
                        "detail": "This backend is configured for the permissionless commit path and does not issue mint signatures.",
                    },
                )
                return
            if not is_canary_wallet_allowed(self.config, minter):
                json_response(
                    self,
                    403,
                    {
                        "error": "canary_wallet_not_allowed",
                        "detail": "This wallet is not on the rehearsal canary allowlist.",
                    },
                )
                return
            wallet_state = self.rpc.get_wallet_mint_state(self.config.corecats_address, minter=minter)
            precheck = evaluate_authorization_precheck(wallet_state, quantity)
            payload = issue_mint_authorization(
                self.config,
                minter=minter,
                quantity=quantity,
                nonce=str(nonce),
                expiry=expiry,
            )
            self.store.record_authorization(
                created_at=now_iso(),
                minter=minter,
                quantity=quantity,
                nonce=str(payload["nonce"]),
                expiry=int(payload["expiry"]),
                message_hash=str(payload["messageHash"]),
                signature=str(payload["signature"]),
            )
            json_response(
                self,
                200,
                {
                    **payload,
                    "coreCatsAddress": self.config.corecats_address,
                    "networkName": self.config.network_name,
                    "relayerEnabled": bool(self.config.finalizer_private_key or self.config.finalizer_keystore_path),
                    "walletState": {
                        "minted": precheck.minted,
                        "reserved": precheck.reserved,
                        "availableSupply": precheck.available_supply,
                        "availableSlots": precheck.available_slots,
                        "pendingCommitActive": precheck.pending_commit_active,
                        "finalizeBlock": precheck.finalize_block,
                        "expiryBlock": precheck.expiry_block,
                        "currentBlock": precheck.current_block,
                        "maxPerAddress": precheck.max_per_address,
                    },
                },
            )
        except AuthorizationRejected as error:
            json_response(self, 409, {"error": error.code, "detail": str(error)})
        except ValueError as error:
            json_response(self, 400, {"error": "invalid_minter", "detail": str(error)})
        except RpcError as error:
            json_response(self, 503, {"error": "wallet_state_unavailable", "detail": str(error)})
        except Exception as error:  # noqa: BLE001
            json_response(self, 500, {"error": "failed_to_issue_mint_authorization", "detail": str(error)})

    def _handle_precheck(self) -> None:
        body = self._read_json()
        minter = str(body.get("minter") or "").strip()
        quantity = int(body.get("quantity") or 0)
        if not minter:
            json_response(self, 400, {"error": "minter is required"})
            return
        if quantity not in (1, 2, 3):
            json_response(self, 400, {"error": "quantity must be 1, 2, or 3"})
            return

        try:
            wallet_state = self.rpc.get_wallet_mint_state(self.config.corecats_address, minter=minter)
            precheck = evaluate_authorization_precheck(wallet_state, quantity)
            json_response(
                self,
                200,
                {
                    "walletState": {
                        "minted": precheck.minted,
                        "reserved": precheck.reserved,
                        "availableSupply": precheck.available_supply,
                        "availableSlots": precheck.available_slots,
                        "pendingCommitActive": precheck.pending_commit_active,
                        "finalizeBlock": precheck.finalize_block,
                        "expiryBlock": precheck.expiry_block,
                        "currentBlock": precheck.current_block,
                        "maxPerAddress": precheck.max_per_address,
                    },
                    "coreCatsAddress": self.config.corecats_address,
                    "networkName": self.config.network_name,
                    "relayerEnabled": bool(self.config.finalizer_private_key or self.config.finalizer_keystore_path),
                },
            )
        except AuthorizationRejected as error:
            json_response(
                self,
                409,
                {
                    "error": error.code,
                    "detail": str(error),
                    "walletState": {
                        "minted": wallet_state.minted,
                        "reserved": wallet_state.effective_reserved,
                        "availableSupply": wallet_state.available_supply,
                        "availableSlots": wallet_state.available_slots,
                        "pendingCommitActive": wallet_state.pending_commit_active,
                        "finalizeBlock": wallet_state.pending_commit.finalize_block,
                        "expiryBlock": wallet_state.pending_commit.expiry_block,
                        "currentBlock": wallet_state.current_block,
                        "maxPerAddress": 3,
                    },
                },
            )
        except ValueError as error:
            json_response(self, 400, {"error": "invalid_minter", "detail": str(error)})
        except RpcError as error:
            json_response(self, 503, {"error": "wallet_state_unavailable", "detail": str(error)})
        except Exception as error:  # noqa: BLE001
            json_response(self, 500, {"error": "failed_to_run_wallet_precheck", "detail": str(error)})

    def _handle_finalize(self) -> None:
        body = self._read_json()
        minter = str(body.get("minter") or "").strip()
        session_id = str(body.get("sessionId") or "").strip()
        if not minter:
            json_response(self, 400, {"error": "minter is required"})
            return

        try:
            payload = relay_finalize_mint(self.config, minter=minter)
            self.store.record_finalize_attempt(
                created_at=now_iso(),
                session_id=session_id,
                minter=minter,
                status="submitted",
                tx_hash=str(payload["txHash"]),
            )
            json_response(self, 200, {"txHash": payload["txHash"], "relayerEnabled": True})
        except Exception as error:  # noqa: BLE001
            detail = str(error)
            code = classify_finalize_error_detail(detail)
            status = 500
            if code in {"too_early", "no_pending_commit", "finalize_expired"}:
                status = 409
            elif code == "relayer_not_configured":
                status = 501

            self.store.record_finalize_attempt(
                created_at=now_iso(),
                session_id=session_id,
                minter=minter,
                status=code,
                detail=detail,
            )
            json_response(self, status, {"error": code, "detail": detail})

    def _handle_get_session(self, session_id: str) -> None:
        session = self.store.get_session(session_id)
        if not session:
            json_response(self, 404, {"error": "session_not_found", "detail": "mint session not found or expired"})
            return
        json_response(self, 200, session)

    def _handle_put_session(self, session_id: str) -> None:
        body = self._read_json()
        if str(body.get("id") or "").strip() != session_id:
            json_response(self, 400, {"error": "session_id_mismatch"})
            return
        try:
            session = self.store.upsert_session(body)
        except Exception as error:  # noqa: BLE001
            json_response(self, 400, {"error": "invalid_session_payload", "detail": str(error)})
            return
        json_response(self, 200, session)

    def _handle_delete_session(self, session_id: str) -> None:
        deleted = self.store.delete_session(session_id)
        json_response(self, 200, {"ok": True, "deleted": deleted})

    def do_GET(self) -> None:  # noqa: N802
        if normalized_path(self.path) == "/healthz":
            return self._handle_healthz()
        if normalized_path(self.path) == "/api/public/mint-count":
            return self._handle_public_mint_count()
        if normalized_path(self.path) == "/api/public/status":
            return self._handle_public_status()
        if normalized_path(self.path) == "/api/public/owner":
            return self._handle_public_owner()
        if normalized_path(self.path) == "/api/public/token-owner":
            return self._handle_public_token_owner()
        if not self._require_auth():
            return

        session_id = self._session_id_from_path()
        if session_id:
            return self._handle_get_session(session_id)

        json_response(self, 404, {"error": "not_found"})

    def do_OPTIONS(self) -> None:  # noqa: N802
        if normalized_path(self.path) in {
            "/api/public/status",
            "/api/public/owner",
            "/api/public/token-owner",
            "/api/public/mint-count",
        }:
            self.send_response(204)
            for key, value in self._public_status_headers().items():
                self.send_header(key, value)
            self.send_header("content-length", "0")
            self.end_headers()
            return
        self.send_response(405)
        self.send_header("content-length", "0")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if not self._require_auth():
            return

        path = normalized_path(self.path)

        if path == "/api/mint/precheck":
            return self._handle_precheck()
        if path == "/api/mint/authorize":
            return self._handle_authorize()
        if path == "/api/mint/finalize":
            return self._handle_finalize()

        json_response(self, 404, {"error": "not_found"})

    def do_PUT(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        session_id = self._session_id_from_path()
        if session_id:
            return self._handle_put_session(session_id)
        json_response(self, 404, {"error": "not_found"})

    def do_DELETE(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        session_id = self._session_id_from_path()
        if session_id:
            return self._handle_delete_session(session_id)
        json_response(self, 404, {"error": "not_found"})

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        super().log_message(format, *args)


def main() -> None:
    config = load_config()
    store = SessionStore(config.db_path)
    rpc = CoreRpcClient(config.rpc_url)
    finalize_manager = FinalizeManager(config, store, rpc_client=rpc)
    finalize_worker = FinalizeWorker(finalize_manager, config.finalize_worker_interval_seconds)
    ownership_snapshot_cache = OwnershipSnapshotCache(config)

    server = ThreadingHTTPServer((config.bind, config.port), MintBackendHandler)
    server.config = config  # type: ignore[attr-defined]
    server.store = store  # type: ignore[attr-defined]
    server.rpc = rpc  # type: ignore[attr-defined]
    server.finalize_manager = finalize_manager  # type: ignore[attr-defined]
    server.ownership_snapshot_cache = ownership_snapshot_cache  # type: ignore[attr-defined]

    finalize_worker.start()
    print(f"Core Cats mint backend listening on http://{config.bind}:{config.port}")
    try:
        server.serve_forever()
    finally:
        finalize_worker.stop()


if __name__ == "__main__":
    main()
