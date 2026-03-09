import test from "node:test";
import assert from "node:assert/strict";

import { parseCallbackPayload } from "../lib/server/corepass-mint-sessions.js";

test("parseCallbackPayload accepts lowercase coreid in nested callback payloads", () => {
  const searchParams = new URLSearchParams("sessionId=session-1&step=identify");
  const parsed = parseCallbackPayload(
    "https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=session-1&step=identify",
    {
      result: {
        coreid: "cb1234",
        signature: "0xsig",
      },
    },
    searchParams,
  );

  assert.equal(parsed.sessionId, "session-1");
  assert.equal(parsed.step, "identify");
  assert.equal(parsed.coreId, "cb1234");
  assert.equal(parsed.signature, "0xsig");
});

test("parseCallbackPayload falls back to user for identify callbacks", () => {
  const searchParams = new URLSearchParams("sessionId=session-2&step=identify");
  const parsed = parseCallbackPayload(
    "https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=session-2&step=identify",
    {
      user: "cb5678",
    },
    searchParams,
  );

  assert.equal(parsed.coreId, "cb5678");
});
