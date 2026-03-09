import test from "node:test";
import assert from "node:assert/strict";

import { buildCorePassUri, tryEncodeFinalizeMintData } from "../lib/server/corepass-mint-sessions.js";

test("sign URI keeps a slash when coreId is omitted", () => {
  const uri = buildCorePassUri("sign", "", {
    data: "0xabc",
    conn: "https://example.com/callback",
    type: "callback",
  });

  assert.match(uri, /^corepass:sign\/\?/);
  assert.match(uri, /data=0xabc/);
  assert.match(uri, /type=callback/);
});

test("tx URI keeps the provided coreId path", () => {
  const uri = buildCorePassUri("tx", "cb123", {
    to: "cb999",
    type: "app-link",
  });

  assert.match(uri, /^corepass:tx\/cb123\?/);
  assert.match(uri, /to=cb999/);
  assert.match(uri, /type=app-link/);
});

test("finalize calldata builder leaves manual finalize unavailable for Core cb addresses", () => {
  const encoded = tryEncodeFinalizeMintData("cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416");

  assert.equal(encoded.manualAvailable, false);
  assert.equal(encoded.data, "");
  assert.match(encoded.error, /invalid address/i);
});
