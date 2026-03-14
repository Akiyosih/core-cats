import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCorePassCallback,
  createMintSession,
  readMintSession,
  resolveMintSessionHandoffMode,
} from "../lib/server/corepass-mint-sessions.js";

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

async function withFetchMock(handler, fn) {
  const previous = global.fetch;
  global.fetch = handler;
  try {
    return await fn();
  } finally {
    global.fetch = previous;
  }
}

function jsonRpcResponse(result) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

test("same-device sessions expose handoff mode for callback error redirects", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");
  await withEnv({ NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app" }, async () => {
    const session = await createMintSession(sessionRequest, { quantity: 1, handoffMode: "same-device" });
    const handoffMode = await resolveMintSessionHandoffMode(sessionRequest, session.sessionId);

    assert.equal(handoffMode, "same-device");
  });
});

test("identify callback rejects over-limit wallets before QR 2 is prepared", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app",
      CORE_RPC_URL: "https://rpc.example.com",
      CORECATS_BACKEND_MODE: "local",
      CORECATS_BACKEND_BASE_URL: undefined,
      CORECATS_INTERNAL_BACKEND_BASE_URL: undefined,
      CORECATS_BACKEND_SHARED_SECRET: undefined,
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
    },
    async () => {
      await withFetchMock(async (_url, init) => {
        const payload = JSON.parse(init?.body || "{}");
        switch (payload.method) {
          case "xcb_blockNumber":
            return jsonRpcResponse("0x64");
          case "xcb_call": {
            const data = payload?.params?.[0]?.data || "";
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(63)}3`);
            }
            if (data.startsWith("0xe64f7f28")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
            }
            if (data.startsWith("0xf622d4c8")) {
              return jsonRpcResponse(`0x${"0".repeat(64 * 4)}`);
            }
            throw new Error(`unexpected xcb_call selector: ${data}`);
          }
          default:
            throw new Error(`unexpected RPC method: ${payload.method}`);
        }
      }, async () => {
        const session = await createMintSession(sessionRequest, { quantity: 1, handoffMode: "desktop" });
        const callbackRequest = buildRequest(
          `https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=${session.sessionId}&step=identify`,
        );

        await assert.rejects(
          () =>
            applyCorePassCallback(callbackRequest, {
              sessionId: session.sessionId,
              step: "identify",
              coreID: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
            }),
          (error) => error?.code === "wallet_limit_reached",
        );

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "precheck_rejected");
        assert.equal(persisted.commit, null);
        assert.equal(persisted.walletState?.minted, 3);
        assert.equal(persisted.walletState?.availableSlots, 0);
      });
    },
  );
});
