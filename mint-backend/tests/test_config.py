from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from corecats_mint_backend.config import _read_core_id_keys, load_config, normalize_core_address_key

DUMMY_MAINNET_CORECATS_ADDRESS = "cb111111111111111111111111111111111111111111"
DUMMY_FINALIZER_ADDRESS = "cb222222222222222222222222222222222222222222"


class ConfigValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.spark_path = Path(self.tempdir.name) / "spark"
        self.spark_path.write_text("#!/bin/sh\n", encoding="utf-8")
        self.spark_path.chmod(0o755)
        self.foxar_dir = Path(self.tempdir.name) / "foxar"
        self.foxar_dir.mkdir()
        self.finalizer_password_file = Path(self.tempdir.name) / "wallet4.password"
        self.finalizer_password_file.write_text("super-secret\n", encoding="utf-8")
        self.finalizer_keystore = Path(self.tempdir.name) / "wallet4.json"
        self.finalizer_keystore.write_text("{}", encoding="utf-8")

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _base_env(self) -> dict[str, str]:
        return {
            "CORECATS_BACKEND_SHARED_SECRET": "dev-only-secret",
            "CORECATS_FOXAR_DIR": str(self.foxar_dir),
            "SPARK_PATH": str(self.spark_path),
        }

    def test_development_profile_accepts_local_defaults(self) -> None:
        with patch.dict(os.environ, self._base_env(), clear=True):
            config = load_config()
        self.assertEqual(config.profile, "development")
        self.assertEqual(config.network_name, "devin")

    def test_production_profile_rejects_devin_defaults(self) -> None:
        env = self._base_env()
        env["CORECATS_BACKEND_PROFILE"] = "production"
        env["CORECATS_BACKEND_SHARED_SECRET"] = "replace-with-strong-random-secret"
        env["FINALIZER_PRIVATE_KEY"] = "1" * 114

        with patch.dict(os.environ, env, clear=True):
            with self.assertRaisesRegex(ValueError, "CORE_NETWORK_NAME must be 'mainnet' in production"):
                load_config()

    def test_production_profile_accepts_explicit_mainnet_values(self) -> None:
        env = self._base_env()
        env.update(
            {
                "CORECATS_BACKEND_PROFILE": "production",
                "CORECATS_BACKEND_SHARED_SECRET": "super-secret-value",
                "CORE_RPC_URL": "https://xcbapi-arch-mainnet.coreblockchain.net/",
                "CORE_CHAIN_ID": "1",
                "CORE_NETWORK_ID": "1",
                "CORE_NETWORK_NAME": "mainnet",
                "CORE_EXPLORER_BASE_URL": "https://blockindex.net",
                "CORECATS_ADDRESS": DUMMY_MAINNET_CORECATS_ADDRESS,
                "FINALIZER_PRIVATE_KEY": "3" * 114,
            }
        )

        with patch.dict(os.environ, env, clear=True):
            config = load_config()
        self.assertEqual(config.profile, "production")
        self.assertEqual(config.network_name, "mainnet")

    def test_production_read_only_mode_does_not_require_finalizer_or_foxar_tooling(self) -> None:
        env = self._base_env()
        env.update(
            {
                "CORECATS_BACKEND_PROFILE": "production",
                "CORECATS_BACKEND_MODE": "read-only",
                "CORECATS_BACKEND_SHARED_SECRET": "",
                "CORE_RPC_URL": "https://xcbapi-arch-mainnet.coreblockchain.net/",
                "CORE_CHAIN_ID": "1",
                "CORE_NETWORK_ID": "1",
                "CORE_NETWORK_NAME": "mainnet",
                "CORE_EXPLORER_BASE_URL": "https://blockindex.net",
                "CORECATS_ADDRESS": DUMMY_MAINNET_CORECATS_ADDRESS,
                "CORECATS_FOXAR_DIR": str(Path(self.tempdir.name) / "missing-foxar"),
                "SPARK_PATH": str(Path(self.tempdir.name) / "missing-spark"),
            }
        )

        with patch.dict(os.environ, env, clear=True):
            config = load_config()
        self.assertEqual(config.profile, "production")
        self.assertEqual(config.backend_mode, "read-only")
        self.assertTrue(config.read_only)
        self.assertFalse(config.mint_writes_enabled)
        self.assertEqual(config.shared_secret, "")

    def test_production_profile_accepts_finalizer_keystore_pair(self) -> None:
        env = self._base_env()
        env.update(
            {
                "CORECATS_BACKEND_PROFILE": "production",
                "CORECATS_BACKEND_SHARED_SECRET": "super-secret-value",
                "CORE_RPC_URL": "https://xcbapi-arch-mainnet.coreblockchain.net/",
                "CORE_CHAIN_ID": "1",
                "CORE_NETWORK_ID": "1",
                "CORE_NETWORK_NAME": "mainnet",
                "CORE_EXPLORER_BASE_URL": "https://blockindex.net",
                "CORECATS_ADDRESS": DUMMY_MAINNET_CORECATS_ADDRESS,
                "FINALIZER_ADDRESS": DUMMY_FINALIZER_ADDRESS,
                "FINALIZER_KEYSTORE_PATH": str(self.finalizer_keystore),
                "FINALIZER_PASSWORD_FILE": str(self.finalizer_password_file),
            }
        )

        with patch.dict(os.environ, env, clear=True):
            config = load_config()
        self.assertEqual(config.profile, "production")
        self.assertEqual(config.finalizer_private_key, "")
        self.assertEqual(config.finalizer_address, DUMMY_FINALIZER_ADDRESS)
        self.assertEqual(config.finalizer_keystore_path, self.finalizer_keystore)

    def test_production_profile_requires_finalizer_address_for_keystore_mode(self) -> None:
        env = self._base_env()
        env.update(
            {
                "CORECATS_BACKEND_PROFILE": "production",
                "CORECATS_BACKEND_SHARED_SECRET": "super-secret-value",
                "CORE_RPC_URL": "https://xcbapi-arch-mainnet.coreblockchain.net/",
                "CORE_CHAIN_ID": "1",
                "CORE_NETWORK_ID": "1",
                "CORE_NETWORK_NAME": "mainnet",
                "CORE_EXPLORER_BASE_URL": "https://blockindex.net",
                "CORECATS_ADDRESS": DUMMY_MAINNET_CORECATS_ADDRESS,
                "FINALIZER_KEYSTORE_PATH": str(self.finalizer_keystore),
                "FINALIZER_PASSWORD_FILE": str(self.finalizer_password_file),
            }
        )

        with patch.dict(os.environ, env, clear=True):
            with self.assertRaisesRegex(ValueError, "FINALIZER_ADDRESS must be explicitly set"):
                load_config()


class ConfigAddressNormalizationTests(unittest.TestCase):
    def test_normalize_core_address_key_accepts_cb_and_hex_forms(self) -> None:
        expected = "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416"
        self.assertEqual(normalize_core_address_key("CB36CC64595127DA8B1F7D4A03F7E0E1F4562409B416"), expected)
        self.assertEqual(normalize_core_address_key("cc64595127da8b1f7d4a03f7e0e1f4562409b416"), expected)
        self.assertEqual(normalize_core_address_key(expected), expected)

    def test_normalize_core_address_key_rejects_unsupported_values(self) -> None:
        with self.assertRaises(ValueError):
            normalize_core_address_key("not-a-core-address")

    def test_read_core_id_keys_deduplicates_and_normalizes(self) -> None:
        with patch.dict(
            os.environ,
            {
                "CORECATS_CANARY_ALLOWED_CORE_IDS": (
                    "CB36CC64595127DA8B1F7D4A03F7E0E1F4562409B416,\n"
                    "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416\n"
                    "CB751E48F322F114DE6A8C1CACBE914544ABE29DBAD2"
                )
            },
            clear=False,
        ):
            keys = _read_core_id_keys("CORECATS_CANARY_ALLOWED_CORE_IDS")

        self.assertEqual(
            keys,
            frozenset(
                {
                    "0xcc64595127da8b1f7d4a03f7e0e1f4562409b416",
                    "0x1e48f322f114de6a8c1cacbe914544abe29dbad2",
                }
            ),
        )


if __name__ == "__main__":
    unittest.main()
