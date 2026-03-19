import test from "node:test";
import assert from "node:assert/strict";

import { Wallet, getBytes } from "ethers";

import {
  coreHexAddressToCoreId,
  recoverIdentifyCoreIdFromSignature,
  resolveIdentifyCoreId,
} from "../lib/server/corepass-mint-sessions.js";

test("resolveIdentifyCoreId prefers callback coreId when present", () => {
  assert.equal(resolveIdentifyCoreId("cb123", "cb999"), "cb123");
});

test("resolveIdentifyCoreId falls back to expected coreId for self-only pilot sessions", () => {
  assert.equal(resolveIdentifyCoreId("", "cb999"), "cb999");
});

test("resolveIdentifyCoreId can prefer the recovered signer when the experiment is enabled", () => {
  assert.equal(
    resolveIdentifyCoreId("cb123", "cb999", {
      recoveredCoreId: "cb456",
      preferRecoveredSignature: true,
    }),
    "cb456",
  );
});

test("coreHexAddressToCoreId converts a recovered 20-byte signer into a Core mainnet address", () => {
  assert.equal(
    coreHexAddressToCoreId("0xc2c7abcdd3a71cb2b811b7cf817478dbe0f94a17", 1),
    "cb68c2c7abcdd3a71cb2b811b7cf817478dbe0f94a17",
  );
});

test("recoverIdentifyCoreIdFromSignature recovers the signer from the QR1 challenge", async () => {
  const wallet = new Wallet("0x59c6995e998f97a5a0044966f0945382d7f4f0b5fb4d7f112544112d4b6d8f38");
  const challengeHex = `0x${"11".repeat(32)}`;
  const signature = await wallet.signMessage(getBytes(challengeHex));

  assert.equal(
    recoverIdentifyCoreIdFromSignature(challengeHex, signature, 1),
    "cb68c2c7abcdd3a71cb2b811b7cf817478dbe0f94a17",
  );
});
