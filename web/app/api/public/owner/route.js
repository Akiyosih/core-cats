import { getMintBackendBaseUrl, proxyMintBackendRequest } from "../../../../lib/server/mint-backend-proxy.js";

export async function GET(request) {
  if (!getMintBackendBaseUrl()) {
    return Response.json(
      {
        error: "public_owner_lookup_unavailable",
        detail: "Public owner lookup is not available for this deployment.",
      },
      {
        status: 503,
        headers: {
          "cache-control": "public, max-age=30, stale-while-revalidate=30",
        },
      },
    );
  }

  return proxyMintBackendRequest(request, "/api/public/owner");
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "content-length": "0",
    },
  });
}
