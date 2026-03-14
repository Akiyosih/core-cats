import test from "node:test";
import assert from "node:assert/strict";

import {
  CORECATS_METHOD_SELECTORS,
  encodeCoreCatsCommitMintData,
  encodeCoreCatsFinalizeMintData,
  normalizeCoreAddressToAbiWord,
} from "../lib/server/core-calldata.js";
import {
  buildCorePassUri,
  createFinalizeState,
  createMintSession,
  tryEncodeFinalizeMintData,
} from "../lib/server/corepass-mint-sessions.js";

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

test("mint session uses callback for both desktop QR and same-device identify", async () => {
  const request = new Request("https://core-cats.vercel.app/api/mint/corepass/session", {
    headers: {
      host: "core-cats.vercel.app",
      "x-forwarded-proto": "https",
    },
  });

  const session = await createMintSession(request, { quantity: 1 });
  const uri = session.identify.desktopUri;
  const query = uri.slice(uri.indexOf("?") + 1);
  const conn = new URL(new URLSearchParams(query).get("conn"));

  assert.equal(session.handoffMode, "desktop");
  assert.match(uri, /type=callback/);
  assert.match(session.identify.mobileUri, /type=callback/);
  assert.equal(uri, session.identify.mobileUri);
  assert.match(conn.pathname, /^\/api\/mint\/corepass\/callback\/[0-9a-f-]+\/identify$/);
  assert.equal(conn.search, "");
});

test("mint session stores same-device handoff mode when requested", async () => {
  const request = new Request("https://core-cats.vercel.app/api/mint/corepass/session", {
    headers: {
      host: "core-cats.vercel.app",
      "x-forwarded-proto": "https",
    },
  });

  const session = await createMintSession(request, { quantity: 1, handoffMode: "same-device" });

  assert.equal(session.handoffMode, "same-device");
  assert.match(session.identify.mobileUri, /type=callback/);
});

test("finalize calldata builder supports Core cb addresses for manual fallback", () => {
  const encoded = tryEncodeFinalizeMintData("cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416");

  assert.equal(encoded.manualAvailable, true);
  assert.equal(encoded.error, "");
  assert.match(encoded.data, /^0x11709128/);
});

test("Core address normalization keeps the full ICAN body for ABI words", () => {
  assert.equal(
    normalizeCoreAddressToAbiWord("cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416"),
    "0xcb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
  );
});

test("finalize calldata uses the Core/ylm selector and normalized address body", () => {
  const data = encodeCoreCatsFinalizeMintData({ minter: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416" });

  assert.equal(data.slice(0, 10), CORECATS_METHOD_SELECTORS.finalizeMint);
  assert.equal(
    data,
    "0x1170912800000000000000000000cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
  );
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
  });

  assert.match(data, /^0x9bf2435b/);
  assert.equal(data.slice(0, 10), CORECATS_METHOD_SELECTORS.commitMint);
  assert.equal(
    data,
    "0x9bf2435b0000000000000000000000000000000000000000000000000000000000000001050ec83c4a49e42141ab71c07b29ddd812ceb9d441c0d23b6ecd52a2550da575",
  );
});
