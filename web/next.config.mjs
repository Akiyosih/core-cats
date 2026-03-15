const mintOnlyHost = /^(1|true|yes|on)$/i.test(
  String(process.env.NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST || process.env.CORECATS_MINT_ONLY_HOST || "").trim(),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
    cpus: 1,
    staticGenerationMinPagesPerWorker: 2000,
  },
  async headers() {
    return [
      {
        source: "/viewer_v1/png/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/viewer_v1/png-white/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/viewer_v1/svg/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/teaser/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/viewer_v1/collection-index.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (!mintOnlyHost) {
      return [];
    }

    return [
      {
        source: "/",
        destination: "/mint",
      },
    ];
  },
};

export default nextConfig;
