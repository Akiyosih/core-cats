import test from "node:test";
import assert from "node:assert/strict";

import { createMintSession, resolveMintSessionHandoffMode } from "../lib/server/corepass-mint-sessions.js";

async function withEnv(overrides, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function buildRequest(url) {
  return new Request(url, {
    headers: {
      host: "core-cats.vercel.app",
      "x-forwarded-proto": "https",
    },
  });
}

test("same-device sessions expose handoff mode for callback error redirects", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");
  await withEnv({ NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app" }, async () => {
    const session = await createMintSession(sessionRequest, { quantity: 1, handoffMode: "same-device" });
    const handoffMode = await resolveMintSessionHandoffMode(sessionRequest, session.sessionId);

    assert.equal(handoffMode, "same-device");
  });
});
