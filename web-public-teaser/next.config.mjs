/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: process.cwd(),
  },
  experimental: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
    externalDir: true,
    cpus: 1,
    staticGenerationMinPagesPerWorker: 2000,
  },
};

export default nextConfig;
