import { NextResponse } from "next/server";
import { normalizeCallbackBodyPayload } from "../../../../../lib/server/corepass-callback-body.js";
import { getCorePublicConfig } from "../../../../../lib/server/core-env.js";
import { resolveMintSessionHandoffMode } from "../../../../../lib/server/corepass-mint-sessions.js";

export async function readCallbackBody(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return normalizeCallbackBodyPayload(await request.json());
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
    return normalizeCallbackBodyPayload(JSON.parse(raw));
  } catch {}

  const searchParams = new URLSearchParams(raw);
  if (Array.from(searchParams.keys()).length > 0) {
    return Object.fromEntries(searchParams.entries());
  }

  return { raw };
}

export function redirectToMint(request, sessionId, errorCode = "", handoffMode = "") {
  const config = getCorePublicConfig();
  const target = new URL("/mint", config.siteBaseUrl || request.url);
  if (sessionId) {
    target.searchParams.set("sessionId", sessionId);
  }
  if (String(handoffMode || "").trim().toLowerCase() === "same-device") {
    target.searchParams.set("mode", "same-device");
  }
  if (errorCode) {
    target.searchParams.set("callbackError", errorCode);
  }
  return NextResponse.redirect(target);
}

export async function resolveRedirectHandoffMode(request, sessionId, fallback = "") {
  const normalizedFallback = String(fallback || "").trim().toLowerCase();
  if (normalizedFallback === "same-device") {
    return "same-device";
  }
  return resolveMintSessionHandoffMode(request, sessionId);
}

export async function resolveCallbackPathParams(context) {
  const params = await Promise.resolve(context?.params || {});
  return {
    sessionId: String(params.sessionId || "").trim(),
    step: String(params.step || "").trim(),
  };
}
