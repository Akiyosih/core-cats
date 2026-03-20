import { normalizeCallbackBodyPayload } from "../../../../../lib/server/corepass-callback-body.js";
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

export function completeCorePassCallback(sessionId = "", errorCode = "", handoffMode = "") {
  const headers = new Headers({
    "cache-control": "no-store",
  });
  if (sessionId) {
    headers.set("x-corecats-session-id", sessionId);
  }
  if (errorCode) {
    headers.set("x-corecats-callback-error", errorCode);
  }
  if (String(handoffMode || "").trim().toLowerCase() === "same-device") {
    headers.set("x-corecats-handoff-mode", "same-device");
  }
  return new Response(null, { status: 204, headers });
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
