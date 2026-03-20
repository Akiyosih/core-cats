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

function describeCorePassCallbackError(errorCode = "") {
  switch (String(errorCode || "").trim()) {
    case "wallet_limit_reached":
      return "A single wallet can mint up to 3 cats through the standard mint path. This request would exceed that cumulative limit, so QR 2 of 2 was not prepared.";
    case "sold_out":
      return "The remaining unreserved supply is lower than this requested quantity, so QR 2 of 2 was not prepared.";
    case "pending_commit_exists":
      return "This wallet already has a pending commit waiting for finalize. Finish that mint before starting another one.";
    case "canary_wallet_not_allowed":
      return "This deployment still has a legacy rehearsal allowlist restriction enabled.";
    case "invalid_minter":
      return "CorePass returned an unsupported wallet address format for this session.";
    case "wallet_state_unavailable":
      return "Wallet precheck is temporarily unavailable because the backend could not confirm current on-chain wallet state.";
    case "precheck_failed":
    case "authorize_failed":
      return "Wallet checks failed after the wallet was identified, so QR 2 of 2 was not prepared.";
    case "mint_surface_closed":
      return "Mint is not available on this deployment.";
    case "mint_runtime_misconfigured":
      return "Mint is temporarily unavailable because this deployment is missing required runtime configuration.";
    case "callback_failed":
      return "CorePass callback handling failed for this mint session.";
    default:
      return errorCode ? `CorePass callback returned ${errorCode}.` : "";
  }
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
  if (errorCode) {
    return new Response(describeCorePassCallbackError(errorCode), {
      status: 200,
      headers: {
        ...Object.fromEntries(headers.entries()),
        "content-type": "text/plain; charset=utf-8",
      },
    });
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
