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

test("parseCallbackPayload unwraps stringified JSON callback envelopes", () => {
  const searchParams = new URLSearchParams("sessionId=session-3&step=identify");
  const parsed = parseCallbackPayload(
    "https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=session-3&step=identify",
    {
      result: "{\"coreID\":\"cb9abc\",\"signature\":\"0xsig\"}",
    },
    searchParams,
  );

  assert.equal(parsed.coreId, "cb9abc");
  assert.equal(parsed.signature, "0xsig");
});

test("parseCallbackPayload unwraps nested urlencoded callback envelopes", () => {
  const searchParams = new URLSearchParams(
    "sessionId=session-4&step=identify&payload=coreID%3Dcbdef0%26signature%3D0xform",
  );
  const parsed = parseCallbackPayload(
    "https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=session-4&step=identify&payload=coreID%3Dcbdef0%26signature%3D0xform",
    {},
    searchParams,
  );

  assert.equal(parsed.coreId, "cbdef0");
  assert.equal(parsed.signature, "0xform");
});

test("parseCallbackPayload preserves the login protocol session alongside the route session id", () => {
  const searchParams = new URLSearchParams("sessionId=session-5&step=identify");
  const parsed = parseCallbackPayload(
    "https://core-cats.vercel.app/api/mint/corepass/callback/session-5/identify",
    {
      sessionId: "session-5",
      step: "identify",
      session: "protocol-session-5",
      coreID: "cb1234",
    },
    searchParams,
  );

  assert.equal(parsed.sessionId, "session-5");
  assert.equal(parsed.protocolSession, "protocol-session-5");
  assert.equal(parsed.coreId, "cb1234");
});
