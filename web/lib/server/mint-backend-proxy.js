import { getCoreServerEnv } from "./core-env.js";

function shouldCopyHeader(name) {
  const lower = name.toLowerCase();
  return !["connection", "content-length", "content-encoding", "host", "transfer-encoding"].includes(lower);
}

function buildForwardHeaders(request, extras = {}) {
  const env = getCoreServerEnv();
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const xff = request.headers.get("x-forwarded-for");
  const xfproto = request.headers.get("x-forwarded-proto");
  const xfhost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  if (xff) headers.set("x-forwarded-for", xff);
  if (xfproto) headers.set("x-forwarded-proto", xfproto);
  if (xfhost || host) headers.set("x-forwarded-host", xfhost || host);

  if (env.backendSharedSecret) {
    headers.set("x-corecats-backend-shared-secret", env.backendSharedSecret);
  }

  for (const [key, value] of Object.entries(extras)) {
    if (value == null || value === "") continue;
    headers.set(key, String(value));
  }

  headers.set("x-corecats-proxy", "vercel");
  return headers;
}

export function getMintBackendBaseUrl() {
  const env = getCoreServerEnv();
  if (env.backendMode !== "proxy") {
    return "";
  }
  return env.internalBackendBaseUrl || env.backendBaseUrl;
}

export function isExternalMintBackendEnabled() {
  return Boolean(getMintBackendBaseUrl());
}

function buildTargetUrl(pathname, requestUrl = "https://placeholder.local/") {
  const baseUrl = getMintBackendBaseUrl();
  if (!baseUrl) {
    throw new Error("external mint backend is not configured");
  }
  const sourceUrl = new URL(requestUrl);
  return new URL(`${pathname}${sourceUrl.search}`, `${baseUrl}/`);
}

export async function proxyMintBackendRequest(request, pathname, init = {}) {
  const targetUrl = buildTargetUrl(pathname, request.url);
  const method = init.method || request.method;
  const body = init.body !== undefined ? init.body : method === "GET" || method === "HEAD" ? undefined : await request.text();

  const response = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(request, init.headers),
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (shouldCopyHeader(key)) {
      responseHeaders.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function fetchMintBackendJson(pathname, request, init = {}) {
  const targetUrl = buildTargetUrl(pathname, request?.url);
  const response = await fetch(targetUrl, {
    ...init,
    headers: buildForwardHeaders(request || new Request("https://placeholder.local/"), init.headers),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.detail || payload.error || "backend request failed");
    error.code = payload.error || "backend_request_failed";
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function fetchMintPrecheck(request, body) {
  return fetchMintBackendJson("/api/mint/precheck", request, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function fetchMintAuthorization(request, body) {
  return fetchMintBackendJson("/api/mint/authorize", request, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function fetchFinalizeRelay(request, body) {
  return fetchMintBackendJson("/api/mint/finalize", request, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function readRemoteMintSession(request, sessionId) {
  return fetchMintBackendJson(`/api/internal/sessions/${encodeURIComponent(sessionId)}`, request, {
    method: "GET",
  });
}

export async function writeRemoteMintSession(request, session) {
  return fetchMintBackendJson(`/api/internal/sessions/${encodeURIComponent(session.id)}`, request, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(session),
  });
}

export async function deleteRemoteMintSession(request, sessionId) {
  return fetchMintBackendJson(`/api/internal/sessions/${encodeURIComponent(sessionId)}`, request, {
    method: "DELETE",
  });
}
