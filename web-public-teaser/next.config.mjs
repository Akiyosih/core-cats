import path from "node:path";
import fs from "node:fs";

const repoRoot = path.resolve(process.cwd(), "..");
const sourcePublicDir = path.join(repoRoot, "web", "public");
const targetPublicDir = path.join(process.cwd(), "public");

function copyDir(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function syncSharedPublicAssets() {
  copyDir(path.join(sourcePublicDir, "viewer_v3"), path.join(targetPublicDir, "viewer_v3"));
  copyDir(path.join(sourcePublicDir, "teaser"), path.join(targetPublicDir, "teaser"));
  console.log("[public-teaser] synced shared public assets from web/public");
}

syncSharedPublicAssets();

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
    root: repoRoot,
  },
  experimental: {
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
    externalDir: true,
    cpus: 1,
    staticGenerationMinPagesPerWorker: 2000,
  },
};

export default nextConfig;
