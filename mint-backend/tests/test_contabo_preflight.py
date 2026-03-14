from __future__ import annotations

import os
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

DUMMY_MAINNET_CORECATS_ADDRESS = "cb111111111111111111111111111111111111111111"
DUMMY_FINALIZER_ADDRESS = "cb222222222222222222222222222222222222222222"


class ContaboPreflightTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.tempdir.name)
        self.backend_dir = Path(__file__).resolve().parents[1]
        self.script_path = self.backend_dir / "systemd" / "contabo-mainnet-preflight.sh"

        self.spark_path = self.temp_path / "spark"
        self.spark_path.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        self.spark_path.chmod(0o755)

        self.foxar_dir = self.temp_path / "foxar"
        self.foxar_dir.mkdir()

        self.db_dir = self.temp_path / "db"
        self.db_dir.mkdir()

        self.service_file = self.temp_path / "corecats-mint-backend.service"
        self.service_file.write_text("[Service]\nExecStart=/usr/bin/python3 -m corecats_mint_backend.server\n", encoding="utf-8")

        self.keystore_path = self.temp_path / "wallet4.json"
        self.keystore_path.write_text("{}", encoding="utf-8")
        self.keystore_path.chmod(0o600)

        self.password_file = self.temp_path / "wallet4.password"
        self.password_file.write_text("super-secret\n", encoding="utf-8")
        self.password_file.chmod(0o600)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _write_env_file(self, *, include_finalizer_keystore: bool = True) -> Path:
        env_file = self.temp_path / "corecats-mint-backend.env"
        body = textwrap.dedent(
            f"""\
            CORECATS_BACKEND_PROFILE=production
            CORECATS_BACKEND_BIND=127.0.0.1
            CORECATS_BACKEND_PORT=8787
            CORECATS_BACKEND_DB_PATH={self.db_dir / "corecats-mint.db"}
            CORECATS_BACKEND_SHARED_SECRET=super-secret-value
            CORE_RPC_URL=https://xcbapi-arch-mainnet.coreblockchain.net/
            CORE_CHAIN_ID=1
            CORE_NETWORK_ID=1
            CORE_NETWORK_NAME=mainnet
            CORE_EXPLORER_BASE_URL=https://blockindex.net
            CORECATS_ADDRESS={DUMMY_MAINNET_CORECATS_ADDRESS}
            CORECATS_FOXAR_DIR={self.foxar_dir}
            SPARK_PATH={self.spark_path}
            """
        )
        if include_finalizer_keystore:
            body += textwrap.dedent(
                f"""\
                FINALIZER_ADDRESS={DUMMY_FINALIZER_ADDRESS}
                FINALIZER_KEYSTORE_PATH={self.keystore_path}
                FINALIZER_PASSWORD_FILE={self.password_file}
                """
            )
        env_file.write_text(body, encoding="utf-8")
        env_file.chmod(0o600)
        return env_file

    def _run_preflight(self, env_file: Path) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env.update(
            {
                "ALLOW_NON_ROOT_FOR_TESTS": "1",
                "ENV_FILE": str(env_file),
                "SERVICE_FILE": str(self.service_file),
                "EXPECTED_WALLET4_KEYSTORE_PATH": str(self.keystore_path),
                "EXPECTED_WALLET4_PASSWORD_PATH": str(self.password_file),
            }
        )
        return subprocess.run(
            ["bash", str(self.script_path)],
            cwd=self.backend_dir,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_preflight_accepts_valid_mainnet_keystore_config(self) -> None:
        env_file = self._write_env_file()

        result = self._run_preflight(env_file)

        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Preflight OK", result.stdout)
        self.assertIn("finalizer_mode=keystore", result.stdout)
        self.assertNotIn("super-secret-value", result.stdout)
        self.assertNotIn("super-secret-value", result.stderr)

    def test_preflight_rejects_non_600_env_file(self) -> None:
        env_file = self._write_env_file()
        env_file.chmod(0o644)

        result = self._run_preflight(env_file)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("File permission must be 600", result.stderr)

    def test_preflight_requires_finalizer_configuration(self) -> None:
        env_file = self._write_env_file(include_finalizer_keystore=False)

        result = self._run_preflight(env_file)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn(
            "Set FINALIZER_PRIVATE_KEY or FINALIZER_KEYSTORE_PATH + FINALIZER_PASSWORD_FILE",
            result.stderr,
        )

    def test_preflight_requires_finalizer_address_in_keystore_mode(self) -> None:
        env_file = self._write_env_file()
        body = env_file.read_text(encoding="utf-8").replace(f"FINALIZER_ADDRESS={DUMMY_FINALIZER_ADDRESS}\n", "")
        env_file.write_text(body, encoding="utf-8")

        result = self._run_preflight(env_file)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FINALIZER_ADDRESS must be set when FINALIZER_KEYSTORE_PATH is used", result.stderr)


if __name__ == "__main__":
    unittest.main()
