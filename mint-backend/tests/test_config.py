from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from corecats_mint_backend.config import load_config

DUMMY_MAINNET_CORECATS_ADDRESS = "cb111111111111111111111111111111111111111111"


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
        env["MINT_SIGNER_PRIVATE_KEY"] = "0" * 114
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
                "MINT_SIGNER_PRIVATE_KEY": "2" * 114,
                "FINALIZER_PRIVATE_KEY": "3" * 114,
            }
        )

        with patch.dict(os.environ, env, clear=True):
            config = load_config()
        self.assertEqual(config.profile, "production")
        self.assertEqual(config.network_name, "mainnet")

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
                "MINT_SIGNER_PRIVATE_KEY": "2" * 114,
                "FINALIZER_KEYSTORE_PATH": str(self.finalizer_keystore),
                "FINALIZER_PASSWORD_FILE": str(self.finalizer_password_file),
            }
        )

        with patch.dict(os.environ, env, clear=True):
            config = load_config()
        self.assertEqual(config.profile, "production")
        self.assertEqual(config.finalizer_private_key, "")
        self.assertEqual(config.finalizer_keystore_path, self.finalizer_keystore)


if __name__ == "__main__":
    unittest.main()
