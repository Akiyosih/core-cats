from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Event, Lock, Thread
from typing import Callable

from .config import Config
from .rpc import CoreRpcClient, WalletMintState
from .spark import classify_finalize_error_detail, relay_finalize_mint
from .storage import SessionStore


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(value: str) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def append_history(session: dict, entry: dict) -> None:
    history = session.get("history")
    if not isinstance(history, list):
        history = []
    if history:
        last = dict(history[-1])
        last.pop("at", None)
        if last == entry:
            session["history"] = history
            return
    item = {"at": now_iso(), **entry}
    history.append(item)
    session["history"] = history[-20:]


def ensure_finalize_state(session: dict) -> dict:
    source = session.get("finalize") if isinstance(session.get("finalize"), dict) else {}
    finalize = {
        "status": source.get("status") or "awaiting_finalize",
        "data": source.get("data") or "",
        "desktopUri": source.get("desktopUri") or "",
        "mobileUri": source.get("mobileUri") or "",
        "qrDataUrl": source.get("qrDataUrl") or "",
        "txHash": source.get("txHash") or "",
        "submittedAt": source.get("submittedAt") or "",
        "confirmedAt": source.get("confirmedAt") or "",
        "mode": source.get("mode") or "manual",
        "lastError": source.get("lastError") or "",
        "lastErrorCode": source.get("lastErrorCode") or "",
        "lastAttemptAt": source.get("lastAttemptAt") or "",
        "retryCount": int(source.get("retryCount") or 0),
        "stuck": bool(source.get("stuck")),
        "stuckSince": source.get("stuckSince") or "",
        "confirmedBlockNumber": int(source.get("confirmedBlockNumber") or 0),
    }
    session["finalize"] = finalize
    return finalize


@dataclass(frozen=True)
class FinalizeHealthSnapshot:
    enabled: bool
    last_sweep_at: str
    pending_sessions: int
    stuck_sessions: int
    oldest_pending_seconds: int
    last_error: str


class FinalizeManager:
    def __init__(
        self,
        config: Config,
        store: SessionStore,
        *,
        rpc_client: CoreRpcClient | None = None,
        relay_fn: Callable[[Config, str], dict[str, str]] | None = None,
    ):
        self._config = config
        self._store = store
        self._rpc = rpc_client or CoreRpcClient(config.rpc_url)
        self._relay_fn = relay_fn or (lambda cfg, minter: relay_finalize_mint(cfg, minter=minter))
        self._lock = Lock()
        self._snapshot = FinalizeHealthSnapshot(
            enabled=self.enabled,
            last_sweep_at="",
            pending_sessions=0,
            stuck_sessions=0,
            oldest_pending_seconds=0,
            last_error="",
        )

    @property
    def enabled(self) -> bool:
        return self._config.mint_writes_enabled and bool(
            self._config.finalizer_private_key or self._config.finalizer_keystore_path
        )

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            data = self._snapshot
        return {
            "enabled": data.enabled,
            "lastSweepAt": data.last_sweep_at or None,
            "pendingSessions": data.pending_sessions,
            "stuckSessions": data.stuck_sessions,
            "oldestPendingSeconds": data.oldest_pending_seconds,
            "lastError": data.last_error or None,
        }

    def run_once(self) -> None:
        if not self.enabled:
            self._set_snapshot(pending_sessions=0, stuck_sessions=0, oldest_pending_seconds=0, last_error="")
            return

        pending_sessions = 0
        stuck_sessions = 0
        oldest_pending_seconds = 0
        last_error = ""

        sessions = self._store.list_finalize_candidates(limit=100)
        now = datetime.now(timezone.utc)
        for session in sessions:
            try:
                changed = self._process_session(session)
                if changed:
                    self._store.upsert_session(session)
            except Exception as error:  # noqa: BLE001
                last_error = str(error)
                try:
                    self._store.upsert_session(session)
                except Exception:  # noqa: BLE001
                    pass
                print(
                    "[corecats-mint-backend] finalize session processing failed: "
                    f"session_id={session.get('id')} detail={error}"
                )

            finalize = ensure_finalize_state(session)
            if session.get("status") in {"commit_submitted", "commit_confirmed", "finalize_submitted"} and not finalize["confirmedAt"]:
                pending_sessions += 1
                confirmed_at = parse_iso(str(session.get("commit", {}).get("confirmedAt") or ""))
                if confirmed_at is not None:
                    age_seconds = max(0, int((now - confirmed_at).total_seconds()))
                    oldest_pending_seconds = max(oldest_pending_seconds, age_seconds)
            if finalize["stuck"]:
                stuck_sessions += 1

        self._set_snapshot(
            pending_sessions=pending_sessions,
            stuck_sessions=stuck_sessions,
            oldest_pending_seconds=oldest_pending_seconds,
            last_error=last_error,
        )

    def _set_snapshot(self, *, pending_sessions: int, stuck_sessions: int, oldest_pending_seconds: int, last_error: str) -> None:
        with self._lock:
            self._snapshot = FinalizeHealthSnapshot(
                enabled=self.enabled,
                last_sweep_at=now_iso(),
                pending_sessions=pending_sessions,
                stuck_sessions=stuck_sessions,
                oldest_pending_seconds=oldest_pending_seconds,
                last_error=last_error,
            )

    def _process_session(self, session: dict) -> bool:
        if not str(session.get("minter") or "").strip():
            return False

        finalize = ensure_finalize_state(session)
        changed = self._update_stuck_state(session)

        if session.get("status") == "commit_submitted":
            changed = self._handle_submitted_commit(session) or changed
            if session.get("status") != "commit_confirmed":
                changed = self._update_stuck_state(session) or changed
                return changed

        wallet_state = self._rpc.get_wallet_mint_state(self._config.corecats_address, str(session["minter"]))

        if finalize["confirmedAt"]:
            if finalize["stuck"]:
                finalize["stuck"] = False
                finalize["stuckSince"] = ""
                session["updatedAt"] = now_iso()
                return True
            return changed

        if finalize["txHash"]:
            changed = self._handle_submitted_finalize(session, wallet_state) or changed
        else:
            changed = self._handle_pending_finalize(session, wallet_state) or changed

        changed = self._update_stuck_state(session) or changed
        return changed

    def _handle_submitted_commit(self, session: dict) -> bool:
        commit = session.get("commit") if isinstance(session.get("commit"), dict) else {}
        tx_hash = str(commit.get("txHash") or "").strip()
        if not tx_hash:
            return False

        receipt = self._rpc.get_transaction_receipt(tx_hash)
        if receipt is None:
            changed = False
            if commit.get("status") != "commit_submitted":
                commit["status"] = "commit_submitted"
                changed = True
            if session.get("status") != "commit_submitted":
                session["status"] = "commit_submitted"
                changed = True
            if changed:
                session["updatedAt"] = now_iso()
            return changed

        if receipt.success is False:
            changed = False
            if commit.get("status") != "commit_reverted":
                commit["status"] = "commit_reverted"
                changed = True
            if session.get("status") != "commit_failed":
                session["status"] = "commit_failed"
                changed = True
            next_error = {
                "code": "commit_reverted",
                "message": "Commit transaction reverted on-chain.",
            }
            if session.get("error") != next_error:
                session["error"] = next_error
                changed = True
            if changed:
                session["updatedAt"] = now_iso()
                append_history(session, {"step": "commit", "event": "reverted", "txHash": tx_hash})
            return changed

        changed = False
        if commit.get("status") != "commit_confirmed":
            commit["status"] = "commit_confirmed"
            changed = True
        if not commit.get("confirmedAt"):
            commit["confirmedAt"] = now_iso()
            changed = True
        if int(commit.get("confirmedBlockNumber") or 0) != receipt.block_number:
            commit["confirmedBlockNumber"] = receipt.block_number
            changed = True
        if session.get("status") != "commit_confirmed":
            session["status"] = "commit_confirmed"
            changed = True
        if session.get("error") is not None:
            session["error"] = None
            changed = True
        if changed:
            session["updatedAt"] = now_iso()
            append_history(session, {"step": "commit", "event": "confirmed", "txHash": tx_hash})
        return changed

    def _handle_pending_finalize(self, session: dict, wallet_state: WalletMintState) -> bool:
        finalize = ensure_finalize_state(session)

        if wallet_state.pending_commit_expired:
            return self._set_finalize_expired(session)

        if not wallet_state.pending_commit.exists:
            return self._set_finalize_retrying(
                session,
                code="no_pending_commit",
                detail="No pending commit is available for relayer finalize.",
            )

        if wallet_state.current_block <= wallet_state.pending_commit.finalize_block:
            return self._set_finalize_retrying(session, code="", detail="")

        try:
            result = self._relay_fn(self._config, str(session["minter"]))
        except Exception as error:  # noqa: BLE001
            code = classify_finalize_error_detail(str(error))
            if code == "finalize_expired":
                return self._set_finalize_expired(session)
            if code == "relayer_not_configured":
                return self._set_finalize_manual_only(session, detail=str(error))
            return self._set_finalize_retrying(session, code=code, detail=str(error), increment_retry=True)

        tx_hash = str(result["txHash"])
        finalize["txHash"] = tx_hash
        finalize["submittedAt"] = now_iso()
        finalize["lastAttemptAt"] = finalize["submittedAt"]
        finalize["retryCount"] = int(finalize.get("retryCount") or 0) + 1
        finalize["status"] = "submitted"
        finalize["mode"] = "relayer"
        finalize["lastError"] = ""
        finalize["lastErrorCode"] = ""
        session["status"] = "finalize_submitted"
        session["updatedAt"] = finalize["submittedAt"]
        append_history(session, {"step": "finalize", "event": "submitted_by_relayer", "txHash": tx_hash})
        self._store.record_finalize_attempt(
            created_at=finalize["submittedAt"],
            session_id=str(session.get("id") or ""),
            minter=str(session["minter"]),
            status="submitted",
            tx_hash=tx_hash,
        )
        return True

    def _handle_submitted_finalize(self, session: dict, wallet_state: WalletMintState) -> bool:
        finalize = ensure_finalize_state(session)
        receipt = self._rpc.get_transaction_receipt(str(finalize["txHash"]))
        if receipt is None:
            if session.get("status") != "finalize_submitted":
                session["status"] = "finalize_submitted"
                session["updatedAt"] = now_iso()
                return True
            return False

        if receipt.success is False:
            tx_hash = finalize["txHash"]
            finalize["txHash"] = ""
            finalize["submittedAt"] = ""
            finalize["confirmedBlockNumber"] = 0
            append_history(session, {"step": "finalize", "event": "relayer_tx_reverted", "txHash": tx_hash})
            self._store.record_finalize_attempt(
                created_at=now_iso(),
                session_id=str(session.get("id") or ""),
                minter=str(session["minter"]),
                status="tx_reverted",
                tx_hash=tx_hash,
                detail="Relayer finalize transaction reverted on-chain.",
            )
            if wallet_state.pending_commit_expired:
                return self._set_finalize_expired(session, already_changed=True)
            return self._set_finalize_retrying(
                session,
                code="tx_reverted",
                detail="Relayer finalize transaction reverted on-chain.",
                already_changed=True,
            )

        finalize["status"] = "confirmed"
        finalize["confirmedAt"] = finalize["confirmedAt"] or now_iso()
        finalize["confirmedBlockNumber"] = receipt.block_number
        finalize["mode"] = "relayer"
        finalize["lastError"] = ""
        finalize["lastErrorCode"] = ""
        finalize["stuck"] = False
        finalize["stuckSince"] = ""
        session["status"] = "finalized"
        session["updatedAt"] = finalize["confirmedAt"]
        append_history(session, {"step": "finalize", "event": "confirmed_by_relayer", "txHash": finalize["txHash"]})
        self._store.record_finalize_attempt(
            created_at=finalize["confirmedAt"],
            session_id=str(session.get("id") or ""),
            minter=str(session["minter"]),
            status="confirmed",
            tx_hash=str(finalize["txHash"]),
        )
        return True

    def _set_finalize_retrying(
        self,
        session: dict,
        *,
        code: str,
        detail: str,
        increment_retry: bool = False,
        already_changed: bool = False,
    ) -> bool:
        finalize = ensure_finalize_state(session)
        changed = already_changed
        if finalize["status"] != "retrying":
            finalize["status"] = "retrying"
            changed = True
        if session.get("status") != "commit_confirmed":
            session["status"] = "commit_confirmed"
            changed = True

        if increment_retry:
            finalize["retryCount"] = int(finalize.get("retryCount") or 0) + 1
            finalize["lastAttemptAt"] = now_iso()
            changed = True

        if finalize["lastError"] != detail:
            finalize["lastError"] = detail
            changed = True
        if finalize["lastErrorCode"] != code:
            finalize["lastErrorCode"] = code
            changed = True

        if changed:
            session["updatedAt"] = now_iso()
            if code or detail:
                append_history(session, {"step": "finalize", "event": "relayer_retry", "code": code or None})
                self._store.record_finalize_attempt(
                    created_at=session["updatedAt"],
                    session_id=str(session.get("id") or ""),
                    minter=str(session["minter"]),
                    status=code or "retrying",
                    detail=detail,
                )
        return changed

    def _set_finalize_expired(self, session: dict, *, already_changed: bool = False) -> bool:
        finalize = ensure_finalize_state(session)
        changed = already_changed
        if finalize["status"] != "expired":
            finalize["status"] = "expired"
            changed = True
        if finalize["lastError"] != "Finalize window expired before completion.":
            finalize["lastError"] = "Finalize window expired before completion."
            changed = True
        if finalize["lastErrorCode"] != "finalize_expired":
            finalize["lastErrorCode"] = "finalize_expired"
            changed = True
        if session.get("status") != "finalize_expired":
            session["status"] = "finalize_expired"
            changed = True

        if changed:
            session["updatedAt"] = now_iso()
            append_history(session, {"step": "finalize", "event": "expired"})
            self._store.record_finalize_attempt(
                created_at=session["updatedAt"],
                session_id=str(session.get("id") or ""),
                minter=str(session["minter"]),
                status="finalize_expired",
                detail="Finalize window expired before completion.",
            )
        return changed

    def _set_finalize_manual_only(self, session: dict, *, detail: str) -> bool:
        finalize = ensure_finalize_state(session)
        changed = False
        if finalize["status"] != "manual_only":
            finalize["status"] = "manual_only"
            changed = True
        if finalize["lastError"] != detail:
            finalize["lastError"] = detail
            changed = True
        if finalize["lastErrorCode"] != "relayer_not_configured":
            finalize["lastErrorCode"] = "relayer_not_configured"
            changed = True

        if changed:
            session["updatedAt"] = now_iso()
            append_history(session, {"step": "finalize", "event": "manual_only"})
        return changed

    def _update_stuck_state(self, session: dict) -> bool:
        finalize = ensure_finalize_state(session)
        if finalize["confirmedAt"] or finalize["status"] == "expired":
            if finalize["stuck"]:
                finalize["stuck"] = False
                finalize["stuckSince"] = ""
                session["updatedAt"] = now_iso()
                return True
            return False

        confirmed_at = parse_iso(str(session.get("commit", {}).get("confirmedAt") or ""))
        if confirmed_at is None:
            return False

        age_seconds = int((datetime.now(timezone.utc) - confirmed_at).total_seconds())
        should_mark_stuck = age_seconds >= self._config.finalize_stuck_timeout_seconds
        if should_mark_stuck == finalize["stuck"]:
            return False

        finalize["stuck"] = should_mark_stuck
        finalize["stuckSince"] = now_iso() if should_mark_stuck else ""
        session["updatedAt"] = now_iso()
        if should_mark_stuck:
            append_history(session, {"step": "finalize", "event": "stuck_detected", "txHash": finalize["txHash"] or None})
            self._store.record_finalize_attempt(
                created_at=session["updatedAt"],
                session_id=str(session.get("id") or ""),
                minter=str(session["minter"]),
                status="stuck",
                tx_hash=str(finalize["txHash"]),
                detail="Finalize is taking longer than the configured stuck timeout.",
            )
            print(
                "[corecats-mint-backend] finalize session stuck: "
                f"session_id={session.get('id')} minter={session.get('minter')} tx_hash={finalize['txHash']}"
            )
        return True


class FinalizeWorker(Thread):
    def __init__(self, manager: FinalizeManager, interval_seconds: int):
        super().__init__(daemon=True)
        self._manager = manager
        self._interval_seconds = max(1, interval_seconds)
        self._stop_event = Event()

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._manager.run_once()
            except Exception as error:  # noqa: BLE001
                print(f"[corecats-mint-backend] finalize worker sweep failed: {error}")
            self._stop_event.wait(self._interval_seconds)
