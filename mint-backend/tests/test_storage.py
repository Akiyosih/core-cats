from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from corecats_mint_backend.storage import SessionStore


class SessionStoreFinalizeAttemptTests(unittest.TestCase):
    def test_finalize_attempt_records_session_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "corecats-mint.db"
            store = SessionStore(db_path)
            store.record_finalize_attempt(
                created_at="2026-03-23T00:00:00Z",
                session_id="session-123",
                minter="cb123",
                status="stuck",
                tx_hash="0xabc",
                detail="test detail",
            )

            conn = sqlite3.connect(db_path)
            row = conn.execute(
                "SELECT session_id, minter, status, tx_hash, detail FROM finalize_attempts"
            ).fetchone()
            self.assertEqual(row, ("session-123", "cb123", "stuck", "0xabc", "test detail"))

    def test_finalize_attempt_migrates_existing_table(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = Path(tmp_dir) / "corecats-mint.db"
            conn = sqlite3.connect(db_path)
            conn.executescript(
                """
                CREATE TABLE finalize_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    minter TEXT NOT NULL,
                    status TEXT NOT NULL,
                    tx_hash TEXT NOT NULL DEFAULT '',
                    detail TEXT NOT NULL DEFAULT ''
                );
                """
            )
            conn.close()

            store = SessionStore(db_path)
            store.record_finalize_attempt(
                created_at="2026-03-23T00:00:00Z",
                session_id="session-legacy",
                minter="cb456",
                status="confirmed",
                tx_hash="0xdef",
            )

            conn = sqlite3.connect(db_path)
            columns = [row[1] for row in conn.execute("PRAGMA table_info(finalize_attempts)").fetchall()]
            self.assertIn("session_id", columns)
            row = conn.execute(
                "SELECT session_id, minter, status, tx_hash FROM finalize_attempts"
            ).fetchone()
            self.assertEqual(row, ("session-legacy", "cb456", "confirmed", "0xdef"))


if __name__ == "__main__":
    unittest.main()
