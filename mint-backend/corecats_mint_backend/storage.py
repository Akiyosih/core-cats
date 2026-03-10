from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any


SCHEMA = """
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS mint_sessions (
    session_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    minter TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at_ms INTEGER NOT NULL,
    payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mint_sessions_expires_idx ON mint_sessions (expires_at_ms);
CREATE INDEX IF NOT EXISTS mint_sessions_status_idx ON mint_sessions (status);

CREATE TABLE IF NOT EXISTS mint_authorizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    minter TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    nonce TEXT NOT NULL,
    expiry INTEGER NOT NULL,
    message_hash TEXT NOT NULL,
    signature TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finalize_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    minter TEXT NOT NULL,
    status TEXT NOT NULL,
    tx_hash TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
);
"""


class SessionStore:
    def __init__(self, db_path: Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    def cleanup_expired(self, now_ms: int | None = None) -> None:
        cutoff = int(now_ms or time.time() * 1000)
        with self._connect() as conn:
            conn.execute("DELETE FROM mint_sessions WHERE expires_at_ms <= ?", (cutoff,))

    def upsert_session(self, session: dict[str, Any]) -> dict[str, Any]:
        self.cleanup_expired()
        payload_json = json.dumps(session, ensure_ascii=True, separators=(",", ":"))
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO mint_sessions (
                    session_id, status, quantity, minter, created_at, updated_at, expires_at_ms, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    status=excluded.status,
                    quantity=excluded.quantity,
                    minter=excluded.minter,
                    created_at=excluded.created_at,
                    updated_at=excluded.updated_at,
                    expires_at_ms=excluded.expires_at_ms,
                    payload_json=excluded.payload_json
                """,
                (
                    session["id"],
                    session["status"],
                    int(session["quantity"]),
                    str(session.get("minter") or ""),
                    session["createdAt"],
                    session["updatedAt"],
                    int(session["expiresAtMs"]),
                    payload_json,
                ),
            )
        return session

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        self.cleanup_expired()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload_json FROM mint_sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if not row:
            return None
        return json.loads(row["payload_json"])

    def list_finalize_candidates(self, limit: int = 100) -> list[dict[str, Any]]:
        self.cleanup_expired()
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT payload_json
                FROM mint_sessions
                WHERE status IN ('commit_confirmed', 'finalize_submitted')
                ORDER BY updated_at ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [json.loads(row["payload_json"]) for row in rows]

    def delete_session(self, session_id: str) -> bool:
        with self._connect() as conn:
            result = conn.execute("DELETE FROM mint_sessions WHERE session_id = ?", (session_id,))
        return result.rowcount > 0

    def record_authorization(self, *, created_at: str, minter: str, quantity: int, nonce: str, expiry: int, message_hash: str, signature: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO mint_authorizations (created_at, minter, quantity, nonce, expiry, message_hash, signature)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (created_at, minter, quantity, nonce, expiry, message_hash, signature),
            )

    def record_finalize_attempt(self, *, created_at: str, minter: str, status: str, tx_hash: str = "", detail: str = "") -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO finalize_attempts (created_at, minter, status, tx_hash, detail)
                VALUES (?, ?, ?, ?, ?)
                """,
                (created_at, minter, status, tx_hash, detail),
            )
