function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function hasBrowseOrigin(config) {
  return Boolean(config?.mintOnlyHost && normalizeBaseUrl(config?.browseBaseUrl));
}

export function buildSiteHref(baseUrl, pathname = "/") {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPathname = String(pathname || "").startsWith("/") ? String(pathname || "") : `/${String(pathname || "")}`;
  if (!normalizedBaseUrl) {
    return normalizedPathname;
  }
  return `${normalizedBaseUrl}${normalizedPathname}`;
}

export function buildBrowseHref(config, pathname = "/") {
  const normalizedPathname = String(pathname || "").startsWith("/") ? String(pathname || "") : `/${String(pathname || "")}`;
  if (!hasBrowseOrigin(config)) {
    return normalizedPathname;
  }
  return buildSiteHref(config.browseBaseUrl, normalizedPathname);
}

export function isAbsoluteHref(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
