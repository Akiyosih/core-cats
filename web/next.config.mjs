import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
    cpus: 1,
    externalDir: true,
    staticGenerationMinPagesPerWorker: 2000,
  },
  turbopack: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: path.resolve(process.cwd(), ".."),
  },
  async headers() {
    return [
      {
        source: "/viewer/png/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/viewer/png-white/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/viewer/svg/:path*",
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
        source: "/viewer/collection-index.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
