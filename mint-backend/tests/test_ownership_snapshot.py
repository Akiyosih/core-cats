from __future__ import annotations

import json
import unittest
from pathlib import Path

from corecats_mint_backend.config import Config
from corecats_mint_backend.ownership_snapshot import build_public_owner_snapshot, build_public_status_snapshot


class _FakeRpcClient:
    def __init__(self, available_supply: int):
        self._available_supply = available_supply

    def get_available_supply(self, contract_address: str) -> int:  # noqa: ARG002
        return self._available_supply


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

    def test_builds_minted_status_from_available_supply(self) -> None:
        config = self.make_config()
        snapshot = build_public_status_snapshot(config, rpc_client=_FakeRpcClient(999))
        self.assertEqual(snapshot["mintedCount"], 1)
        self.assertTrue(snapshot["byToken"]["1"]["minted"])
        self.assertNotIn("2", snapshot["byToken"])

    def test_builds_owner_lookup_from_address_tokens(self) -> None:
        config = self.make_config()
        def fake_urlopen(request, timeout=15):  # noqa: ARG001
            url = request.full_url
            if url == "https://blockindex.net/api/v2/address/cb222222222222222222222222222222222222222222":
                return _FakeResponse(
                    {
                        "tokens": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "ids": ["7", "9"],
                            },
                            {
                                "type": "CBC721",
                                "contract": "cb999999999999999999999999999999999999999999",
                                "ids": ["100"],
                            },
                        ],
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        snapshot = build_public_owner_snapshot(
            config,
            "cb222222222222222222222222222222222222222222",
            opener=fake_urlopen,
        )
        self.assertEqual(snapshot["owner"]["tokenIds"], [7, 9])
        self.assertEqual(snapshot["byToken"]["7"]["owner"], "cb222222222222222222222222222222222222222222")
        self.assertEqual(snapshot["byToken"]["9"]["owner"], "cb222222222222222222222222222222222222222222")
        self.assertNotIn("100", snapshot["byToken"])


if __name__ == "__main__":
    unittest.main()
