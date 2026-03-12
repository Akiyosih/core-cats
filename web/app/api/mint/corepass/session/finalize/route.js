import { attemptSessionFinalize } from "../../../../../../lib/server/corepass-mint-sessions.js";
import { getCorePublicConfig } from "../../../../../../lib/server/core-env.js";
import { mintSurfaceClosedResponse } from "../../../../../../lib/server/mint-surface.js";

export const runtime = "nodejs";

function classifyFinalizeError(error) {
  const message = error?.message || "";
  if (message.includes("finalize too early")) return { code: "too_early", status: 409 };
  if (message.includes("no pending commit")) return { code: "no_pending_commit", status: 409 };
  if (message.includes("finalize expired")) return { code: "finalize_expired", status: 409 };
  if (message.includes("Finalizer key is not configured")) return { code: "relayer_not_configured", status: 501 };
  if (error?.code === "session_not_found") return { code: "session_not_found", status: 404 };
  return { code: error?.code || "finalize_failed", status: 500 };
}

export async function POST(request) {
  const config = getCorePublicConfig();
  if (!config.mintSurfaceEnabled) {
    return mintSurfaceClosedResponse(config);
  }
  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || "").trim();
    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await attemptSessionFinalize(sessionId);
    return Response.json(session);
  } catch (error) {
    const classified = classifyFinalizeError(error);
    return Response.json(
      {
        error: classified.code,
        detail: error.message,
      },
      { status: classified.status },
    );
  }
}
