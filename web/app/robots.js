import { getCorePublicConfig } from "../lib/server/core-env";

export default function robots() {
  const { siteBaseUrl, privateCanarySite, publicMintSite } = getCorePublicConfig();

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
