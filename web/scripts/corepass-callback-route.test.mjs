import test from "node:test";
import assert from "node:assert/strict";

import { createMintSession, resolveMintSessionHandoffMode } from "../lib/server/corepass-mint-sessions.js";

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
  const session = await createMintSession(sessionRequest, { quantity: 1, handoffMode: "same-device" });
  const handoffMode = await resolveMintSessionHandoffMode(sessionRequest, session.sessionId);

  assert.equal(handoffMode, "same-device");
});
