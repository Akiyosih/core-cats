from __future__ import annotations

import json
import unittest
import urllib.error

from corecats_mint_backend.contabo_origin_check import run_origin_check


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


class ContaboOriginCheckTests(unittest.TestCase):
    def test_origin_check_accepts_https_mainnet_healthz(self) -> None:
        def fake_urlopen(request, timeout=10):  # noqa: ARG001, ARG002
            self.assertEqual(request.full_url, "https://backend.example.com/healthz")
            return _FakeResponse({"ok": True, "networkName": "mainnet", "chainId": 1})

        result = run_origin_check("https://backend.example.com", opener=fake_urlopen)

        self.assertEqual(result["network"], "mainnet")
        self.assertEqual(result["chain_id"], 1)

    def test_origin_check_rejects_non_https_origin(self) -> None:
        with self.assertRaisesRegex(ValueError, "must start with https://"):
            run_origin_check("http://backend.example.com")

    def test_origin_check_rejects_unexpected_chain(self) -> None:
        def fake_urlopen(request, timeout=10):  # noqa: ARG001, ARG002
            return _FakeResponse({"ok": True, "networkName": "mainnet", "chainId": 3})

        with self.assertRaisesRegex(RuntimeError, "unexpected chainId"):
            run_origin_check("https://backend.example.com", opener=fake_urlopen)

    def test_origin_check_surfaces_http_error(self) -> None:
        def fake_urlopen(request, timeout=10):  # noqa: ARG001, ARG002
            raise urllib.error.HTTPError(
                request.full_url,
                502,
                "Bad Gateway",
                hdrs=None,
                fp=_FakeResponse({"error": "bad_gateway"}),
            )

        with self.assertRaisesRegex(RuntimeError, "HTTP 502"):
            run_origin_check("https://backend.example.com", opener=fake_urlopen)


if __name__ == "__main__":
    unittest.main()
