import { getCorePublicConfig } from "../../../../../../../lib/server/core-env.js";
import { applyCorePassCallback } from "../../../../../../../lib/server/corepass-mint-sessions.js";
import { readCallbackBody, redirectToMint, resolveCallbackPathParams, resolveRedirectHandoffMode } from "../../shared.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  const config = getCorePublicConfig();
  if (!config.mintSurfaceEnabled) {
    return redirectToMint(request, "", "mint_surface_closed");
  }
  const { searchParams } = new URL(request.url);
  const { sessionId, step } = await resolveCallbackPathParams(context);
  const payload = {
    ...Object.fromEntries(searchParams.entries()),
    sessionId,
    step,
  };

  try {
    const session = await applyCorePassCallback(request, payload);
    return redirectToMint(request, sessionId, "", session?.handoffMode || "");
  } catch (error) {
    const handoffMode = await resolveRedirectHandoffMode(request, sessionId);
    return redirectToMint(request, sessionId, error.code || "callback_failed", handoffMode);
  }
}

export async function POST(request, context) {
  const config = getCorePublicConfig();
  if (!config.mintSurfaceEnabled) {
    return Response.json(
      {
        error: "mint_surface_closed",
        detail: "Mint is not available on this deployment.",
      },
      { status: 404 },
    );
  }
  const { sessionId, step } = await resolveCallbackPathParams(context);

  try {
    const body = await readCallbackBody(request);
    const session = await applyCorePassCallback(request, {
      ...body,
      sessionId,
      step,
    });
    return Response.json({ ok: true, session });
  } catch (error) {
    const status = error.code === "session_not_found" ? 404 : 400;
    return Response.json(
      {
        error: error.code || "callback_failed",
        detail: error.message,
      },
      { status },
    );
  }
}
