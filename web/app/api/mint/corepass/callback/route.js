import { NextResponse } from "next/server";

import { applyCorePassCallback } from "../../../../../lib/server/corepass-mint-sessions.js";

export const runtime = "nodejs";

function redirectToMint(request, sessionId, errorCode = "") {
  const target = new URL("/mint", request.url);
  if (sessionId) {
    target.searchParams.set("sessionId", sessionId);
  }
  if (errorCode) {
    target.searchParams.set("callbackError", errorCode);
  }
  return NextResponse.redirect(target);
}

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
    const body = await request.json();
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
