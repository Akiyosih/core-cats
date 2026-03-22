import test from "node:test";
import assert from "node:assert/strict";

import { Wallet, getBytes } from "ethers";

import { GET as callbackRootGet } from "../app/api/mint/corepass/callback/route.js";
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

test("GET callback acknowledges precheck rejections without redirecting into a browser page", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "http://127.0.0.1:8787",
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
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
        const response = await callbackRootGet(
          buildRequest(
            `https://core-cats.vercel.app/api/mint/corepass/callback?sessionId=${session.sessionId}&step=identify&coreID=cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416`,
          ),
        );

        assert.equal(response.status, 204);
        assert.equal(response.headers.get("location"), null);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(response.headers.get("x-corecats-session-id"), session.sessionId);
        assert.equal(response.headers.get("x-corecats-callback-error"), "wallet_limit_reached");
        assert.equal(await response.text(), "");

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "precheck_rejected");
        assert.equal(persisted.commit, null);
      });
    },
  );
});

test("login identify mode keeps the two-step mint flow while changing only QR1", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app",
      COREPASS_IDENTIFY_METHOD: "login",
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        assert.equal(session.identify.method, "login");
        const loginSession = session.sessionId.replaceAll("-", "");
        assert.match(session.identify.desktopUri, /^corepass:login\/\?/);
        assert.match(session.identify.desktopUri, new RegExp(`sess=${loginSession}`));
        assert.match(
          session.identify.desktopUri,
          new RegExp(encodeURIComponent("/api/mint/corepass/callback")),
        );

        const callbackRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/callback");

        await applyCorePassCallback(callbackRequest, {
          step: "identify",
          session: loginSession,
          coreID: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
        });

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "awaiting_commit");
        assert.equal(persisted.minter, "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416");
        assert.ok(persisted.commit?.desktopUri.includes("corepass:tx/cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416?"));
      });
    },
  );
});

test("official mint host forces login identify mode even if stale env says sign", async () => {
  const sessionRequest = new Request("https://core-cats-mint.vercel.app/api/mint/corepass/session", {
    headers: {
      host: "core-cats-mint.vercel.app",
      "x-forwarded-proto": "https",
    },
  });

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats-mint.vercel.app",
      COREPASS_IDENTIFY_METHOD: "sign",
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
      CORE_NETWORK_NAME: "mainnet",
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        assert.equal(session.identify.method, "login");
        assert.match(session.identify.desktopUri, /^corepass:login\/\?/);
      });
    },
  );
});

test("official mint request host overrides stale site base env for QR1 login and callback origin", async () => {
  const sessionRequest = new Request("https://core-cats-mint.vercel.app/api/mint/corepass/session", {
    headers: {
      host: "core-cats-mint.vercel.app",
      "x-forwarded-proto": "https",
    },
  });

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://quiet-canary-b8q6ja3s-projects.vercel.app",
      COREPASS_IDENTIFY_METHOD: "sign",
      NEXT_PUBLIC_LAUNCH_STATE: "canary",
      NEXT_PUBLIC_SITE_SURFACE: "private-canary",
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        assert.equal(session.identify.method, "login");
        assert.match(session.identify.desktopUri, /^corepass:login\/\?/);
        assert.match(
          session.identify.desktopUri,
          /conn=https%3A%2F%2Fcore-cats-mint\.vercel\.app%2Fapi%2Fmint%2Fcorepass%2Fcallback/,
        );
      });
    },
  );
});

test("official CCAT address forces login identify mode even if env still says sign", async () => {
  const sessionRequest = buildRequest("https://quiet-canary-b8q6ja3s-projects.vercel.app/api/mint/corepass/session");

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://quiet-canary-b8q6ja3s-projects.vercel.app",
      COREPASS_IDENTIFY_METHOD: "sign",
      NEXT_PUBLIC_LAUNCH_STATE: "public",
      NEXT_PUBLIC_SITE_SURFACE: "public-mint",
      CORE_NETWORK_NAME: "mainnet",
      CORE_RPC_URL: "https://rpc.example.com",
      CORECATS_BACKEND_MODE: "local",
      CORECATS_BACKEND_BASE_URL: undefined,
      CORECATS_INTERNAL_BACKEND_BASE_URL: undefined,
      CORECATS_BACKEND_SHARED_SECRET: undefined,
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3",
      CORECATS_ADDRESS: "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3",
    },
    async () => {
      await withFetchMock(async (_url, init) => {
        const payload = JSON.parse(init?.body || "{}");
        switch (payload.method) {
          case "xcb_blockNumber":
            return jsonRpcResponse("0x64");
          case "xcb_call": {
            const data = payload?.params?.[0]?.data || "";
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        assert.equal(session.identify.method, "login");
        assert.match(session.identify.desktopUri, /^corepass:login\/\?/);
      });
    },
  );
});

test("login identify mode records protocol-session mismatches but still binds the route-addressed mint session", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app",
      COREPASS_IDENTIFY_METHOD: "login",
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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

        await applyCorePassCallback(callbackRequest, {
          sessionId: session.sessionId,
          step: "identify",
          session: "wrong-session-token",
          coreID: "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416",
        });

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "awaiting_commit");
        assert.equal(persisted.error, null);
        assert.ok(persisted.history.some((entry) => entry.event === "callback_session_mismatch"));
      });
    },
  );
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
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

test("identify callback rejects sold-out quantities before QR 2 is prepared", async () => {
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
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(63)}1`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        const session = await createMintSession(sessionRequest, { quantity: 2, handoffMode: "desktop" });
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
          (error) => error?.code === "sold_out",
        );

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "precheck_rejected");
        assert.equal(persisted.commit, null);
        assert.equal(persisted.walletState?.availableSupply, 1);
      });
    },
  );
});

test("identify callback can prefer the recovered signer over callback coreID during the canary experiment", async () => {
  const sessionRequest = buildRequest("https://core-cats.vercel.app/api/mint/corepass/session");
  const walletB = new Wallet("0x59c6995e998f97a5a0044966f0945382d7f4f0b5fb4d7f112544112d4b6d8f38");
  const walletBCoreId = "cb68c2c7abcdd3a71cb2b811b7cf817478dbe0f94a17";
  const walletACoreId = "cb36cc64595127da8b1f7d4a03f7e0e1f4562409b416";

  await withEnv(
    {
      NEXT_PUBLIC_SITE_BASE_URL: "https://core-cats.vercel.app",
      NEXT_PUBLIC_CORE_CHAIN_ID: "1",
      CORE_RPC_URL: "https://rpc.example.com",
      CORECATS_BACKEND_MODE: "local",
      CORECATS_BACKEND_BASE_URL: undefined,
      CORECATS_INTERNAL_BACKEND_BASE_URL: undefined,
      CORECATS_BACKEND_SHARED_SECRET: undefined,
      NEXT_PUBLIC_CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      CORECATS_ADDRESS: "cb111111111111111111111111111111111111111111",
      COREPASS_IDENTIFY_USE_SIGNATURE_RECOVERY: "1",
    },
    async () => {
      await withFetchMock(async (_url, init) => {
        const payload = JSON.parse(init?.body || "{}");
        switch (payload.method) {
          case "xcb_blockNumber":
            return jsonRpcResponse("0x64");
          case "xcb_call": {
            const data = payload?.params?.[0]?.data || "";
            if (data === "0x1c34eb83") {
              return jsonRpcResponse(`0x${"0".repeat(62)}64`);
            }
            if (data.startsWith("0x5539b96a")) {
              return jsonRpcResponse(`0x${"0".repeat(64)}`);
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
        const signature = await walletB.signMessage(getBytes(session.identify.challengeHex));

        await applyCorePassCallback(callbackRequest, {
          sessionId: session.sessionId,
          step: "identify",
          coreID: walletACoreId,
          signature,
        });

        const persisted = await readMintSession(sessionRequest, session.sessionId, { force: true });
        assert.equal(persisted.status, "awaiting_commit");
        assert.equal(persisted.minter, walletBCoreId);
        assert.equal(persisted.identify.coreId, walletBCoreId);
        assert.equal(persisted.identify.callbackCoreId, walletACoreId);
        assert.equal(persisted.identify.recoveredCoreId, walletBCoreId);
        assert.equal(persisted.identify.resolutionSource, "recovered_signature");
        assert.ok(persisted.commit?.desktopUri.includes(`corepass:tx/${walletBCoreId}?`));
        assert.ok(persisted.history.some((entry) => entry.event === "callback_signature_mismatch"));
      });
    },
  );
});
