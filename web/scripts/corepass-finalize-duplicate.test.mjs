import test from "node:test";
import assert from "node:assert/strict";

import { applyFinalizeCallbackState } from "../lib/server/corepass-mint-sessions.js";

function buildSession(overrides = {}) {
  return {
    status: "finalize_submitted",
    updatedAt: "2026-03-14T00:00:00.000Z",
    expiresAtMs: Date.now() + 60_000,
    history: [],
    error: {
      code: "old_error",
      message: "old error",
    },
    finalize: {
      txHash: "",
      confirmedAt: "",
      status: "submitted",
      mode: "relayer",
      lastError: "stuck",
      lastErrorCode: "stuck_error",
      stuck: true,
      stuckSince: "2026-03-14T00:00:00.000Z",
      confirmedBlockNumber: 123,
      ...overrides.finalize,
    },
    ...overrides,
  };
}

test("applyFinalizeCallbackState ignores duplicate finalize callbacks with the same tx hash", () => {
  const session = buildSession({
    status: "finalized",
    error: null,
    finalize: {
      txHash: "0xabc",
      confirmedAt: "2026-03-14T01:00:00.000Z",
      status: "confirmed",
      mode: "relayer",
      lastError: "",
      lastErrorCode: "",
      stuck: false,
      stuckSince: "",
    },
  });

  const result = applyFinalizeCallbackState(session, "0xAbC");

  assert.equal(result.duplicate, true);
  assert.equal(session.status, "finalized");
  assert.equal(session.finalize.txHash, "0xabc");
  assert.equal(session.finalize.confirmedAt, "2026-03-14T01:00:00.000Z");
  assert.equal(session.finalize.mode, "relayer");
  assert.equal(session.history.at(-1)?.event, "duplicate_callback_ignored");
});

test("applyFinalizeCallbackState confirms a new finalize callback and clears stale finalize errors", () => {
  const session = buildSession();

  const result = applyFinalizeCallbackState(session, "0xdef");

  assert.equal(result.duplicate, false);
  assert.equal(session.status, "finalized");
  assert.equal(session.error, null);
  assert.equal(session.finalize.txHash, "0xdef");
  assert.equal(session.finalize.status, "confirmed");
  assert.equal(session.finalize.mode, "corepass");
  assert.equal(session.finalize.lastError, "");
  assert.equal(session.finalize.lastErrorCode, "");
  assert.equal(session.finalize.stuck, false);
  assert.equal(session.finalize.stuckSince, "");
  assert.equal(session.history.at(-1)?.event, "confirmed");
});
