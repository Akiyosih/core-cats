import { applyCorePassCallback } from "../../../../../../../lib/server/corepass-mint-sessions.js";
import { readCallbackBody, redirectToMint, resolveCallbackPathParams } from "../../shared.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  const { searchParams } = new URL(request.url);
  const { sessionId, step } = await resolveCallbackPathParams(context);
  const payload = {
    ...Object.fromEntries(searchParams.entries()),
    sessionId,
    step,
  };

  try {
    await applyCorePassCallback(request, payload);
    return redirectToMint(request, sessionId);
  } catch (error) {
    return redirectToMint(request, sessionId, error.code || "callback_failed");
  }
}

export async function POST(request, context) {
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
