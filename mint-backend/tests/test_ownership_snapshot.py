from __future__ import annotations

import json
import unittest
from pathlib import Path

from corecats_mint_backend.config import Config
from corecats_mint_backend.ownership_snapshot import build_public_status_snapshot


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = json.dumps(payload, ensure_ascii=True).encode("utf-8")

    def read(self) -> bytes:
        return self._payload

    def close(self) -> None:
        return None

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


class OwnershipSnapshotTests(unittest.TestCase):
    def make_config(self) -> Config:
        return Config(
            profile="production",
            bind="127.0.0.1",
            port=8787,
            db_path=Path("/tmp/corecats-test.db"),
            shared_secret="test-secret",
            rpc_url="https://xcbapi-arch-mainnet.coreblockchain.net/",
            chain_id=1,
            network_id=1,
            network_name="mainnet",
            explorer_base_url="https://blockindex.net",
            corecats_address="cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
            foxar_dir=Path("/tmp"),
            spark_path=Path("/tmp/spark"),
            deployer_private_key="",
            mint_signer_private_key="",
            finalizer_private_key="",
            finalizer_address="",
            finalizer_keystore_path=None,
            finalizer_password_file=None,
            finalize_worker_interval_seconds=5,
            finalize_stuck_timeout_seconds=180,
            canary_allowed_core_id_keys=frozenset(),
            public_status_cache_seconds=120,
        )

    def test_builds_token_and_owner_indexes(self) -> None:
        config = self.make_config()

        def fake_urlopen(request, timeout=15):  # noqa: ARG001
            url = request.full_url
            if url == "https://blockindex.net/api/v2/address/cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a?page=1":
                return _FakeResponse({"totalPages": 1, "txids": ["0xaaa", "0xbbb"]})
            if url == "https://blockindex.net/api/v2/tx/0xaaa":
                return _FakeResponse(
                    {
                        "txid": "0xaaa",
                        "blockHeight": 100,
                        "blockTime": 1000,
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "00000000000000000000000000000000000000000000",
                                "to": "cb111111111111111111111111111111111111111111",
                                "value": "7",
                            }
                        ],
                    }
                )
            if url == "https://blockindex.net/api/v2/tx/0xbbb":
                return _FakeResponse(
                    {
                        "txid": "0xbbb",
                        "blockHeight": 101,
                        "blockTime": 1010,
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "cb111111111111111111111111111111111111111111",
                                "to": "cb222222222222222222222222222222222222222222",
                                "value": "7",
                            }
                        ],
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        snapshot = build_public_status_snapshot(config, opener=fake_urlopen)
        self.assertEqual(snapshot["mintedCount"], 1)
        self.assertEqual(snapshot["byToken"]["7"]["owner"], "cb222222222222222222222222222222222222222222")
        self.assertEqual(snapshot["byToken"]["7"]["mintTxHash"], "0xaaa")
        self.assertEqual(snapshot["byOwner"]["cb222222222222222222222222222222222222222222"]["tokenIds"], [7])


if __name__ == "__main__":
    unittest.main()
