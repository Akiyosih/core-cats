import crypto from "node:crypto";

import { getCorePublicConfig } from "../../../../lib/server/core-env.js";
import { issueMintAuthorization } from "../../../../lib/server/core-spark.js";

export const runtime = "nodejs";

function buildNonce() {
  return BigInt(`0x${crypto.randomBytes(32).toString("hex")}`).toString(10);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const minter = String(body?.minter || "").trim();
    const quantity = Number(body?.quantity || 0);

    if (!minter) {
      return Response.json({ error: "minter is required" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      return Response.json({ error: "quantity must be 1, 2, or 3" }, { status: 400 });
    }

    const nonce = buildNonce();
    const expiry = Math.floor(Date.now() / 1000) + 10 * 60;
    const authorization = await issueMintAuthorization({ minter, quantity, nonce, expiry });
    const config = getCorePublicConfig();

    return Response.json({
      minter: authorization.minter,
      quantity: authorization.quantity,
      nonce: authorization.nonce,
      expiry: authorization.expiry,
      chainId: authorization.chainId,
      messageHash: authorization.messageHash,
      signature: authorization.signature,
      coreCatsAddress: config.coreCatsAddress,
      networkName: config.networkName,
      relayerEnabled: config.relayerEnabled,
    });
  } catch (error) {
    return Response.json(
      {
        error: "failed to issue mint authorization",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
