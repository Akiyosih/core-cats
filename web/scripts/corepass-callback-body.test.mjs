import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCallbackBodyPayload } from "../lib/server/corepass-callback-body.js";

test("normalizeCallbackBodyPayload wraps a JSON string callback payload in raw", () => {
  const payload = normalizeCallbackBodyPayload('{"coreID":"cb1234","signature":"0xsig"}');
  assert.deepEqual(payload, {
    raw: '{"coreID":"cb1234","signature":"0xsig"}',
  });
});

test("normalizeCallbackBodyPayload preserves plain object JSON bodies", () => {
  const payload = normalizeCallbackBodyPayload({ coreID: "cb5678", signature: "0xsig" });

  assert.deepEqual(payload, {
    coreID: "cb5678",
    signature: "0xsig",
  });
});
