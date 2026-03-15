import { getCorePublicConfig } from "../lib/server/core-env";

export default function robots() {
  const { siteBaseUrl, privateCanarySite, publicMintSite, mintOnlyHost } = getCorePublicConfig();

  if (mintOnlyHost) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/", "/mint"],
          disallow: ["/api/", "/about", "/collection", "/my-cats", "/transparency", "/cats/"],
        },
      ],
      host: siteBaseUrl || undefined,
    };
  }

  if (privateCanarySite) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      host: siteBaseUrl || undefined,
    };
  }

  if (publicMintSite) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/"],
        },
      ],
      host: siteBaseUrl || undefined,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/mint", "/api/"],
      },
    ],
    host: siteBaseUrl || undefined,
  };
}
