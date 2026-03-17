import { NextResponse } from "next/server";

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function normalizeBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldBypass(request) {
  const { pathname } = request.nextUrl;
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export function proxy(request) {
  if (shouldBypass(request)) {
    return NextResponse.next();
  }

  const siteSurface = String(process.env.NEXT_PUBLIC_SITE_SURFACE || process.env.CORECATS_SITE_SURFACE || "").trim();
  const canonicalBaseUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_BASE_URL || process.env.CORECATS_SITE_BASE_URL || "",
  );
  const enforceCanonicalHost = normalizeBoolean(
    process.env.NEXT_PUBLIC_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST ||
      process.env.CORECATS_PRIVATE_CANARY_ENFORCE_CANONICAL_HOST,
  );

  if (siteSurface !== "private-canary" || !canonicalBaseUrl || !enforceCanonicalHost) {
    return NextResponse.next();
  }

  const requestOrigin = normalizeUrl(request.nextUrl.origin);
  if (requestOrigin === canonicalBaseUrl) {
    return NextResponse.next();
  }

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalBaseUrl);
  return NextResponse.redirect(target, 307);
}
