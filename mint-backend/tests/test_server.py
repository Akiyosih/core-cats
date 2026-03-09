from __future__ import annotations

import unittest

from corecats_mint_backend.server import normalized_path


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


if __name__ == "__main__":
    unittest.main()
