from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
import urllib.error
from pathlib import Path

from corecats_mint_backend.contabo_smoke import run_smoke_check


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


class ContaboSmokeScriptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.tempdir.name)
        self.script_path = Path(__file__).resolve().parents[1] / "systemd" / "contabo-mainnet-smoke.sh"
        self.saved_sessions: dict[str, dict] = {}

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _write_env_file(self, body: str) -> Path:
        env_file = self.temp_path / "corecats-mint-backend.env"
        env_file.write_text(body, encoding="utf-8")
        env_file.chmod(0o600)
        return env_file

    def _fake_urlopen(self, request, timeout=10):  # noqa: ARG002
        method = request.get_method()
        path = request.full_url.removeprefix("http://127.0.0.1:8787")
        headers = {key.lower(): value for key, value in request.header_items()}
        auth = headers.get("x-corecats-backend-shared-secret", "")

        if path == "/healthz" and method == "GET":
            return _FakeResponse({"ok": True, "networkName": "mainnet", "chainId": 1})

        if not auth:
            raise urllib.error.HTTPError(request.full_url, 403, "Forbidden", hdrs=None, fp=_FakeResponse({"error": "forbidden"}))

        prefix = "/api/internal/sessions/"
        if not path.startswith(prefix):
            raise urllib.error.HTTPError(request.full_url, 404, "Not Found", hdrs=None, fp=_FakeResponse({"error": "not_found"}))

        session_id = path[len(prefix) :]
        if method == "PUT":
            body = json.loads((request.data or b"{}").decode("utf-8"))
            self.saved_sessions[session_id] = body
            return _FakeResponse(body)
        if method == "GET":
            session = self.saved_sessions.get(session_id)
            if not session:
                raise urllib.error.HTTPError(request.full_url, 404, "Not Found", hdrs=None, fp=_FakeResponse({"error": "session_not_found"}))
            return _FakeResponse(session)
        if method == "DELETE":
            deleted = session_id in self.saved_sessions
            self.saved_sessions.pop(session_id, None)
            return _FakeResponse({"ok": True, "deleted": deleted})

        raise urllib.error.HTTPError(request.full_url, 405, "Method Not Allowed", hdrs=None, fp=_FakeResponse({"error": "method_not_allowed"}))

    def test_smoke_check_passes_with_mock_backend(self) -> None:
        result = run_smoke_check(
            "http://127.0.0.1:8787",
            "super-secret-value",
            opener=self._fake_urlopen,
        )

        self.assertEqual(result["network"], "mainnet")
        self.assertEqual(result["chain_id"], 1)
        self.assertEqual(result["session_crud"], "ok")

    def test_smoke_check_rejects_unexpected_network(self) -> None:
        def fake_wrong_network(request, timeout=10):  # noqa: ARG001, ARG002
            return _FakeResponse({"ok": True, "networkName": "devin", "chainId": 3})

        with self.assertRaisesRegex(RuntimeError, "unexpected networkName"):
            run_smoke_check("http://127.0.0.1:8787", "super-secret-value", opener=fake_wrong_network)

    def test_smoke_script_rejects_missing_shared_secret(self) -> None:
        env_file = self._write_env_file("")
        env = os.environ.copy()
        env.update(
            {
                "ENV_FILE": str(env_file),
                "BASE_URL": "http://127.0.0.1:8787",
            }
        )

        result = subprocess.run(
            ["bash", str(self.script_path)],
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CORECATS_BACKEND_SHARED_SECRET is not set", result.stderr)


if __name__ == "__main__":
    unittest.main()
