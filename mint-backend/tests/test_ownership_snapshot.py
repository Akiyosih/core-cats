from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from corecats_mint_backend.config import Config
from corecats_mint_backend.ownership_snapshot import (
    OwnershipSnapshotCache,
    build_public_owner_snapshot,
    build_public_status_snapshot,
)


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


class _FakeRpc:
    def __init__(self, owner: str):
        self._owner = owner

    def eth_call(self, contract_address, data, block_tag="latest"):  # noqa: ARG002
        return f"0x{self._owner}"


class _FakeSupplyRpc:
    def __init__(self, available_supply: int):
        self._available_supply = available_supply

    def get_available_supply(self, contract_address):  # noqa: ARG002
        return self._available_supply


class OwnershipSnapshotTests(unittest.TestCase):
    def make_config(self) -> Config:
        return Config(
            profile="production",
            backend_mode="mint-active",
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

    def test_builds_minted_status_from_contract_mint_transfers(self) -> None:
        config = self.make_config()
        def fake_urlopen(request, timeout=15):  # noqa: ARG001
            url = request.full_url
            if url == "https://blockindex.net/api/v2/address/cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a?page=1":
                return _FakeResponse({"totalPages": 1, "txids": ["0xaaa", "0xbbb", "0xccc"]})
            if url == "https://blockindex.net/api/v2/tx/0xaaa":
                return _FakeResponse(
                    {
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "00000000000000000000000000000000000000000000",
                                "to": "cb111111111111111111111111111111111111111111",
                                "value": "7",
                            }
                        ]
                    }
                )
            if url == "https://blockindex.net/api/v2/tx/0xbbb":
                return _FakeResponse(
                    {
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "cb111111111111111111111111111111111111111111",
                                "to": "cb222222222222222222222222222222222222222222",
                                "value": "7",
                            }
                        ]
                    }
                )
            if url == "https://blockindex.net/api/v2/tx/0xccc":
                return _FakeResponse(
                    {
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "00000000000000000000000000000000000000000000",
                                "to": "cb333333333333333333333333333333333333333333",
                                "value": "9",
                            }
                        ]
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        snapshot = build_public_status_snapshot(
            config,
            opener=fake_urlopen,
            rpc_client=_FakeSupplyRpc(998),
        )
        self.assertEqual(snapshot["mintedCount"], 2)
        self.assertTrue(snapshot["byToken"]["7"]["minted"])
        self.assertTrue(snapshot["byToken"]["9"]["minted"])
        self.assertNotIn("8", snapshot["byToken"])

    def test_prefers_onchain_supply_when_collection_is_sold_out(self) -> None:
        config = self.make_config()

        def fake_urlopen(request, timeout=15):  # noqa: ARG001
            url = request.full_url
            if url == "https://blockindex.net/api/v2/address/cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a?page=1":
                return _FakeResponse({"totalPages": 1, "txids": ["0xaaa"]})
            if url == "https://blockindex.net/api/v2/tx/0xaaa":
                return _FakeResponse(
                    {
                        "tokenTransfers": [
                            {
                                "type": "CBC721",
                                "contract": "cb3022bb9ee4752d778f4c63b47559e77b4ca06a122a",
                                "from": "00000000000000000000000000000000000000000000",
                                "to": "cb111111111111111111111111111111111111111111",
                                "value": "7",
                            }
                        ]
                    }
                )
            raise AssertionError(f"Unexpected URL: {url}")

        snapshot = build_public_status_snapshot(
            config,
            opener=fake_urlopen,
            rpc_client=_FakeSupplyRpc(0),
        )
        self.assertEqual(snapshot["mintedCount"], 1000)
        self.assertEqual(len(snapshot["byToken"]), 1)
        self.assertIn("7", snapshot["byToken"])

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

    def test_token_owner_lookup_uses_rpc(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            config = Config(
                profile="production",
                backend_mode="mint-active",
                bind="127.0.0.1",
                port=8787,
                db_path=Path(tmp_dir) / "corecats-test.db",
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
            cache = OwnershipSnapshotCache(config)
            payload = cache.token_owner_lookup(7, _FakeRpc("cb222222222222222222222222222222222222222222"))
            self.assertEqual(payload["token"]["tokenId"], 7)
            self.assertEqual(payload["token"]["owner"], "cb222222222222222222222222222222222222222222")
            self.assertEqual(
                payload["token"]["explorer"],
                "https://blockindex.net/address/cb222222222222222222222222222222222222222222",
            )


if __name__ == "__main__":
    unittest.main()
