import { NextResponse } from "next/server";

import { applyCorePassCallback } from "../../../../../lib/server/corepass-mint-sessions.js";

export const runtime = "nodejs";

async function readCallbackBody(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return Object.fromEntries(
      Array.from(formData.entries(), ([key, value]) => [key, typeof value === "string" ? value : String(value)]),
    );
  }

  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {}

  const searchParams = new URLSearchParams(raw);
  if (Array.from(searchParams.keys()).length > 0) {
    return Object.fromEntries(searchParams.entries());
  }

  return { raw };
}

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
