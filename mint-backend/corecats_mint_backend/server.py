from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from .config import Config, load_config
from .spark import issue_mint_authorization, relay_finalize_mint
from .storage import SessionStore


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("content-length", str(len(data)))
    handler.send_header("cache-control", "no-store")
    handler.end_headers()
    handler.wfile.write(data)


def normalized_path(value: str) -> str:
    return urlparse(value).path


class MintBackendHandler(BaseHTTPRequestHandler):
    server_version = "CoreCatsMintBackend/0.1"

    @property
    def config(self) -> Config:
        return self.server.config  # type: ignore[attr-defined]

    @property
    def store(self) -> SessionStore:
        return self.server.store  # type: ignore[attr-defined]

    def _require_auth(self) -> bool:
        if normalized_path(self.path) == "/healthz":
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
            },
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
                    "relayerEnabled": bool(self.config.finalizer_private_key),
                },
            )
        except Exception as error:  # noqa: BLE001
            json_response(self, 500, {"error": "failed_to_issue_mint_authorization", "detail": str(error)})

    def _handle_finalize(self) -> None:
        body = self._read_json()
        minter = str(body.get("minter") or "").strip()
        if not minter:
            json_response(self, 400, {"error": "minter is required"})
            return

        try:
            payload = relay_finalize_mint(self.config, minter=minter)
            self.store.record_finalize_attempt(
                created_at=now_iso(),
                minter=minter,
                status="submitted",
                tx_hash=str(payload["txHash"]),
            )
            json_response(self, 200, {"txHash": payload["txHash"], "relayerEnabled": True})
        except Exception as error:  # noqa: BLE001
            detail = str(error)
            code = "finalize_failed"
            status = 500
            if "finalize too early" in detail:
                code = "too_early"
                status = 409
            elif "no pending commit" in detail:
                code = "no_pending_commit"
                status = 409
            elif "finalize expired" in detail:
                code = "finalize_expired"
                status = 409
            elif "Finalizer key is not configured" in detail:
                code = "relayer_not_configured"
                status = 501

            self.store.record_finalize_attempt(
                created_at=now_iso(),
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
        if not self._require_auth():
            return

        session_id = self._session_id_from_path()
        if session_id:
            return self._handle_get_session(session_id)

        json_response(self, 404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._require_auth():
            return

        path = normalized_path(self.path)

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
    server = ThreadingHTTPServer((config.bind, config.port), MintBackendHandler)
    server.config = config  # type: ignore[attr-defined]
    server.store = SessionStore(config.db_path)  # type: ignore[attr-defined]
    print(f"Core Cats mint backend listening on http://{config.bind}:{config.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
