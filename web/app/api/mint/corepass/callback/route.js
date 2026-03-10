import { applyCorePassCallback } from "../../../../../lib/server/corepass-mint-sessions.js";
import { readCallbackBody, redirectToMint } from "./shared.js";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("sessionId") || "").trim();
  try {
    await applyCorePassCallback(request, Object.fromEntries(searchParams.entries()));
    return redirectToMint(request, sessionId);
  } catch (error) {
    return redirectToMint(request, sessionId, error.code || "callback_failed");
  }
}

export async function POST(request) {
  try {
    const body = await readCallbackBody(request);
    const session = await applyCorePassCallback(request, body);
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
