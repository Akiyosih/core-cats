from __future__ import annotations

import unittest
from pathlib import Path

from corecats_mint_backend.config import Config
from corecats_mint_backend.server import (
    is_public_read_path,
    is_read_only_retired_path,
    is_canary_wallet_allowed,
    normalized_path,
    token_owner_lookup_error_is_not_minted,
)


class ServerPathTests(unittest.TestCase):
    def test_normalized_path_drops_query_string(self) -> None:
        self.assertEqual(
            normalized_path("/api/mint/authorize?sessionId=test-session&step=identify"),
            "/api/mint/authorize",
        )

    def test_normalized_path_keeps_internal_session_prefix(self) -> None:
        self.assertEqual(
            normalized_path("/api/internal/sessions/test-session?sessionId=test-session"),
            "/api/internal/sessions/test-session",
        )

    def test_invalid_token_lookup_errors_map_to_not_minted(self) -> None:
        self.assertTrue(token_owner_lookup_error_is_not_minted(RuntimeError("xcb_call failed: CRC721: invalid token ID")))
        self.assertTrue(token_owner_lookup_error_is_not_minted(RuntimeError("owner query for nonexistent token")))
        self.assertFalse(token_owner_lookup_error_is_not_minted(RuntimeError("temporary upstream RPC failure")))

    def test_public_read_paths_match_owner_surface(self) -> None:
        self.assertTrue(is_public_read_path("/healthz"))
        self.assertTrue(is_public_read_path("/api/public/token-owner?tokenId=1"))
        self.assertFalse(is_public_read_path("/api/internal/sessions/test"))

    def test_read_only_retired_paths_cover_mint_and_sessions(self) -> None:
        self.assertTrue(is_read_only_retired_path("/api/mint/precheck"))
        self.assertTrue(is_read_only_retired_path("/api/internal/sessions/test-session"))
        self.assertFalse(is_read_only_retired_path("/api/public/owner"))


class CanaryAllowlistTests(unittest.TestCase):
    def make_config(self, allowed: frozenset[str]) -> Config:
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
            canary_allowed_core_id_keys=allowed,
            public_status_cache_seconds=120,
        )

    def test_allowlist_is_open_when_not_configured(self) -> None:
        config = self.make_config(frozenset())
        self.assertTrue(is_canary_wallet_allowed(config, "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416"))

    def test_allowlist_matches_core_address_formats(self) -> None:
        config = self.make_config(frozenset({"0xcc64595127da8b1f7d4a03f7e0e1f4562409b416"}))
        self.assertTrue(is_canary_wallet_allowed(config, "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416"))
        self.assertTrue(is_canary_wallet_allowed(config, "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416"))
        self.assertFalse(is_canary_wallet_allowed(config, "cb751e48f322f114de6a8c1cacbe914544abe29dbad2"))


if __name__ == "__main__":
    unittest.main()
