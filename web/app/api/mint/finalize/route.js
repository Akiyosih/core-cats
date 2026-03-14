import { getCorePublicConfig } from "../../../../lib/server/core-env.js";
import { mintRuntimeMisconfiguredResponse, mintSurfaceClosedResponse } from "../../../../lib/server/mint-surface.js";
import { relayFinalizeMint } from "../../../../lib/server/core-spark.js";
import { isExternalMintBackendEnabled, proxyMintBackendRequest } from "../../../../lib/server/mint-backend-proxy.js";

export const runtime = "nodejs";

function classifyFinalizeError(message) {
  if (!message) return "finalize_failed";
  if (message.includes("finalize too early")) return "too_early";
  if (message.includes("no pending commit")) return "no_pending_commit";
  if (message.includes("finalize expired")) return "finalize_expired";
  if (message.includes("Finalizer key is not configured")) return "relayer_not_configured";
  return "finalize_failed";
}

export async function POST(request) {
  const config = getCorePublicConfig();
  if (!config.mintSurfaceEnabled) {
    return mintSurfaceClosedResponse(config);
  }
  if (!config.mintRuntimeReady) {
    return mintRuntimeMisconfiguredResponse(config);
  }
  if (isExternalMintBackendEnabled()) {
    return proxyMintBackendRequest(request, "/api/mint/finalize");
  }

  try {
    const body = await request.json();
    const minter = String(body?.minter || "").trim();
    if (!minter) {
      return Response.json({ error: "minter is required" }, { status: 400 });
    }

    const result = await relayFinalizeMint({ minter });
    return Response.json({
      txHash: result.txHash,
      relayerEnabled: config.relayerEnabled,
    });
  } catch (error) {
    const code = classifyFinalizeError(error.message || "");
    const status =
      code === "relayer_not_configured" ? 501 : code === "too_early" || code === "no_pending_commit" ? 409 : 500;

    return Response.json(
      {
        error: code,
        detail: error.message,
      },
      { status },
    );
  }
}
