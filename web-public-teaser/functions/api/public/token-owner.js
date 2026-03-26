const DEFAULT_SUCCESS_TTL_SECONDS = 30;
const DEFAULT_ERROR_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 300;
const STALE_WHILE_REVALIDATE_SECONDS = 600;

function clampTtl(value, fallbackSeconds) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallbackSeconds;
  }
  return Math.max(DEFAULT_ERROR_TTL_SECONDS, Math.min(Math.round(numeric), MAX_TTL_SECONDS));
}

function cacheControlFor(ttlSeconds) {
  return `public, max-age=${ttlSeconds}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`;
}

function jsonResponse(payload, status, cacheControl, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "Cloudflare-CDN-Cache-Control": cacheControl,
      "access-control-allow-origin": "*",
      "x-corecats-public-api-source": "cloudflare-public-teaser-token-owner",
      ...extraHeaders,
    },
  });
}

function buildTokenOwnerUpstream(apiUpstream, tokenId) {
  const upstream = String(apiUpstream || "").trim();
  if (!upstream) {
    return "";
  }
  const url = new URL(upstream);
  url.pathname = `${url.pathname.replace(/\/$/, "").replace(/\/status$/i, "")}/token-owner`;
  url.search = "";
  url.searchParams.set("tokenId", tokenId);
  return url.toString();
}

export async function onRequestGet(context) {
  const tokenId = String(new URL(context.request.url).searchParams.get("tokenId") || "").trim();
  if (!tokenId) {
    return jsonResponse(
      {
        error: "token_id_required",
        detail: "token id is required",
      },
      400,
      cacheControlFor(DEFAULT_ERROR_TTL_SECONDS),
    );
  }

  const upstream = buildTokenOwnerUpstream(
    context.env.CORECATS_PUBLIC_API_UPSTREAM || context.env.CORECATS_PUBLIC_STATUS_UPSTREAM,
    tokenId,
  );
  if (!upstream) {
    return jsonResponse(
      {
        error: "public_api_upstream_not_configured",
        detail: "Public token owner upstream is not configured for this deployment.",
      },
      500,
      "no-store",
    );
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).toString(), {
    method: "GET",
  });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const upstreamResponse = await fetch(upstream, {
      headers: {
        accept: "application/json",
      },
    });
    const rawBody = await upstreamResponse.text();

    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = {
        error: "invalid_upstream_payload",
        detail: "Public token owner upstream returned invalid JSON.",
      };
    }

    const ttlSeconds = clampTtl(
      payload?.cacheTtlSeconds,
      upstreamResponse.ok ? DEFAULT_SUCCESS_TTL_SECONDS : DEFAULT_ERROR_TTL_SECONDS,
    );
    const cacheControl = cacheControlFor(ttlSeconds);
    const responsePayload = upstreamResponse.ok
      ? payload
      : {
          ...payload,
          error: payload.error || "public_token_owner_lookup_unavailable",
          detail: payload.detail || "Public token owner lookup is temporarily unavailable.",
        };

    const response = jsonResponse(responsePayload, upstreamResponse.status, cacheControl);
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    const response = jsonResponse(
      {
        error: "public_token_owner_lookup_failed",
        detail: "Public token owner lookup is temporarily unavailable.",
      },
      502,
      cacheControlFor(DEFAULT_ERROR_TTL_SECONDS),
    );
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
}
