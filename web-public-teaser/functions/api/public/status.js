const RETIRED_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

function jsonResponse(payload, status, cacheControl, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "Cloudflare-CDN-Cache-Control": cacheControl,
      "access-control-allow-origin": "*",
      "x-corecats-status-source": "cloudflare-public-teaser",
      ...extraHeaders,
    },
  });
}

export async function onRequestGet(context) {
  return jsonResponse(
    {
      error: "public_status_retired",
      detail: "The global public status snapshot has been retired after sell-out. Use /api/public/owner or /api/public/token-owner instead.",
      cacheTtlSeconds: 300,
    },
    410,
    RETIRED_CACHE_CONTROL,
  );
}
