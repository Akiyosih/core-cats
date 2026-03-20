import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    // Cloudflare Pages builds this app from the web-public-teaser root, but the teaser
    // still intentionally imports shared code from sibling directories in the repo.
    // Point Turbopack at the repository root so npx next build can resolve ../web imports.
    root: path.resolve(process.cwd(), ".."),
  },
  experimental: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
    externalDir: true,
    cpus: 1,
    staticGenerationMinPagesPerWorker: 2000,
  },
};

export default nextConfig;
