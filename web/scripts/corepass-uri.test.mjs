import test from "node:test";
import assert from "node:assert/strict";

import { CORECATS_METHOD_SELECTORS, encodeCoreCatsCommitMintData } from "../lib/server/core-calldata.js";
import { buildCorePassUri, createFinalizeState, tryEncodeFinalizeMintData } from "../lib/server/corepass-mint-sessions.js";

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

test("createFinalizeState tolerates a null prior finalize state", () => {
  const state = createFinalizeState(null);

  assert.equal(state.status, "awaiting_finalize");
  assert.equal(state.desktopUri, "");
  assert.equal(state.txHash, "");
});

test("commit calldata uses the Core/ylm selector instead of the Ethereum selector", () => {
  const data = encodeCoreCatsCommitMintData({
    quantity: 1,
    commitHash: "0x050ec83c4a49e42141ab71c07b29ddd812ceb9d441c0d23b6ecd52a2550da575",
    nonce: "91123666447625726472099886318068838730072134615985693224907450136323691491889",
    expiry: 1773058393,
    signature:
      "0x818930879c421c1d1e79e06f9c749087a4531bc243cadeb4de663d1d57ed5ed78b446739308d166dc73fb82be9fe6733d7e077a7828f296080c4d0a057a28a2cc5be649d77591482444fd413fc96bad2d18ba756ddbc3441d1a32162419e9e325c196be905b2713eab554776db00c8502100ca4d2d7af76a11fbdd8dd318aabcc69cb005789ac59d794922b174b0bb8c76311e8148ee350a2535b47911bdcc2e5ee7333341aea924dbb680",
  });

  assert.match(data, /^0xf634ddd1/);
  assert.equal(data.slice(0, 10), CORECATS_METHOD_SELECTORS.commitMint);
  assert.equal(
    data,
    "0xf634ddd10000000000000000000000000000000000000000000000000000000000000001050ec83c4a49e42141ab71c07b29ddd812ceb9d441c0d23b6ecd52a2550da575c9762ae09b7300970a7928ebb300d0b87cd46c48997e956ef1282c58126db2310000000000000000000000000000000000000000000000000000000069aeb95900000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000ab818930879c421c1d1e79e06f9c749087a4531bc243cadeb4de663d1d57ed5ed78b446739308d166dc73fb82be9fe6733d7e077a7828f296080c4d0a057a28a2cc5be649d77591482444fd413fc96bad2d18ba756ddbc3441d1a32162419e9e325c196be905b2713eab554776db00c8502100ca4d2d7af76a11fbdd8dd318aabcc69cb005789ac59d794922b174b0bb8c76311e8148ee350a2535b47911bdcc2e5ee7333341aea924dbb680000000000000000000000000000000000000000000",
  );
});
