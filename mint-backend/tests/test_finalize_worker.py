from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from corecats_mint_backend.config import Config
from corecats_mint_backend.finalize_worker import FinalizeManager
from corecats_mint_backend.rpc import PendingCommitState, TransactionReceipt, WalletMintState
from corecats_mint_backend.storage import SessionStore


def iso_seconds_ago(seconds: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=seconds)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class FakeRpcClient:
    def __init__(self, *, wallet_state: WalletMintState, receipt: TransactionReceipt | None = None):
        self.wallet_state = wallet_state
        self.receipt = receipt

    def get_wallet_mint_state(self, contract_address: str, minter: str) -> WalletMintState:
        return self.wallet_state

    def get_transaction_receipt(self, tx_hash: str) -> TransactionReceipt | None:
        return self.receipt


class FinalizeManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.store = SessionStore(Path(self.tempdir.name) / "corecats-mint.db")
        self.config = Config(
            profile="development",
            bind="127.0.0.1",
            port=8787,
            db_path=Path(self.tempdir.name) / "corecats-mint.db",
            shared_secret="dev-only-secret",
            rpc_url="http://127.0.0.1:8545",
            chain_id=1,
            network_id=1,
            network_name="mainnet",
            explorer_base_url="https://blockindex.net",
            corecats_address="cb111111111111111111111111111111111111111111",
            foxar_dir=Path(self.tempdir.name),
            spark_path=Path(self.tempdir.name) / "spark",
            deployer_private_key="",
            mint_signer_private_key="signer",
            finalizer_private_key="finalizer",
            finalizer_address="cb222222222222222222222222222222222222222222",
            finalizer_keystore_path=None,
            finalizer_password_file=None,
            finalize_worker_interval_seconds=5,
            finalize_stuck_timeout_seconds=180,
            canary_allowed_core_id_keys=frozenset(),
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _put_session(self, session: dict) -> None:
        self.store.upsert_session(session)

    def _base_session(self) -> dict:
        return {
            "id": "session-1",
            "status": "commit_confirmed",
            "quantity": 1,
            "minter": "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
            "createdAt": iso_seconds_ago(30),
            "updatedAt": iso_seconds_ago(30),
            "expiresAtMs": int((datetime.now(timezone.utc) + timedelta(minutes=20)).timestamp() * 1000),
            "identify": {
                "challengeHex": "0xabc",
                "desktopUri": "",
                "mobileUri": "",
                "qrDataUrl": "",
                "coreId": "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
                "expectedCoreId": "",
                "completedAt": iso_seconds_ago(30),
            },
            "commit": {
                "status": "awaiting_commit",
                "nonce": "1",
                "expiry": 9999999999,
                "messageHash": "0xhash",
                "walletState": {"minted": 0, "reserved": 0, "availableSlots": 3},
                "commitHash": "0xcommit",
                "data": "0xf634ddd1",
                "desktopUri": "",
                "mobileUri": "",
                "qrDataUrl": "",
                "txHash": "0xcommit-tx",
                "confirmedAt": iso_seconds_ago(30),
            },
            "finalize": {
                "status": "awaiting_finalize",
                "data": "0x11709128",
                "desktopUri": "corepass:tx/...",
                "mobileUri": "corepass:tx/...",
                "qrDataUrl": "data:image/png;base64,abc",
                "txHash": "",
                "submittedAt": "",
                "confirmedAt": "",
                "mode": "manual",
                "lastError": "",
                "lastErrorCode": "",
                "lastAttemptAt": "",
                "retryCount": 0,
                "stuck": False,
                "stuckSince": "",
                "confirmedBlockNumber": 0,
            },
            "error": None,
            "history": [],
        }

    def test_run_once_submits_relayer_finalize_when_session_is_ready(self) -> None:
        self._put_session(self._base_session())
        manager = FinalizeManager(
            self.config,
            self.store,
            rpc_client=FakeRpcClient(
                wallet_state=WalletMintState(
                    current_block=105,
                    minted=0,
                    reserved=1,
                    effective_reserved=1,
                    pending_commit=PendingCommitState(quantity=1, finalize_block=100, expiry_block=300, commit_hash="0xabc"),
                )
            ),
            relay_fn=lambda config, minter: {"txHash": "0xfinalize"},
        )

        manager.run_once()

        session = self.store.get_session("session-1")
        self.assertEqual(session["status"], "finalize_submitted")
        self.assertEqual(session["finalize"]["status"], "submitted")
        self.assertEqual(session["finalize"]["txHash"], "0xfinalize")
        self.assertEqual(session["finalize"]["mode"], "relayer")

    def test_run_once_marks_receipt_confirmed(self) -> None:
        session = self._base_session()
        session["status"] = "finalize_submitted"
        session["finalize"]["status"] = "submitted"
        session["finalize"]["mode"] = "relayer"
        session["finalize"]["txHash"] = "0xfinalize"
        session["finalize"]["submittedAt"] = iso_seconds_ago(20)
        self._put_session(session)
        manager = FinalizeManager(
            self.config,
            self.store,
            rpc_client=FakeRpcClient(
                wallet_state=WalletMintState(
                    current_block=106,
                    minted=1,
                    reserved=0,
                    effective_reserved=0,
                    pending_commit=PendingCommitState(quantity=0, finalize_block=0, expiry_block=0, commit_hash="0x0"),
                ),
                receipt=TransactionReceipt(tx_hash="0xfinalize", block_number=106, success=True),
            ),
        )

        manager.run_once()

        updated = self.store.get_session("session-1")
        self.assertEqual(updated["status"], "finalized")
        self.assertEqual(updated["finalize"]["status"], "confirmed")
        self.assertEqual(updated["finalize"]["confirmedBlockNumber"], 106)

    def test_run_once_marks_stuck_session_for_alerting(self) -> None:
        session = self._base_session()
        session["commit"]["confirmedAt"] = iso_seconds_ago(400)
        self._put_session(session)
        manager = FinalizeManager(
            self.config,
            self.store,
            rpc_client=FakeRpcClient(
                wallet_state=WalletMintState(
                    current_block=99,
                    minted=0,
                    reserved=1,
                    effective_reserved=1,
                    pending_commit=PendingCommitState(quantity=1, finalize_block=100, expiry_block=300, commit_hash="0xabc"),
                )
            ),
            relay_fn=lambda config, minter: {"txHash": "0xfinalize"},
        )

        manager.run_once()

        updated = self.store.get_session("session-1")
        self.assertTrue(updated["finalize"]["stuck"])


if __name__ == "__main__":
    unittest.main()
