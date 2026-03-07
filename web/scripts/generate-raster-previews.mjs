import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..");
const SVG_DIR = path.join(WEB_ROOT, "public", "viewer_v1", "svg");
const PNG_DIR = path.join(WEB_ROOT, "public", "viewer_v1", "png");
const OUTPUT_SIZE = 384;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  await ensureDir(PNG_DIR);
  const svgEntries = (await fs.readdir(SVG_DIR))
    .filter((entry) => entry.endsWith(".svg"))
    .sort((a, b) => a.localeCompare(b));

  if (svgEntries.length === 0) {
    throw new Error(`No SVG previews found in ${SVG_DIR}`);
  }

  const started = Date.now();
  for (let i = 0; i < svgEntries.length; i++) {
    const svgFile = svgEntries[i];
    const svgPath = path.join(SVG_DIR, svgFile);
    const pngPath = path.join(PNG_DIR, svgFile.replace(/\.svg$/i, ".png"));
    const svg = await fs.readFile(svgPath, "utf8");
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: OUTPUT_SIZE,
      },
    });
    const pngData = resvg.render();
    await fs.writeFile(pngPath, pngData.asPng());

    const index = i + 1;
    if (index % 100 === 0 || index === svgEntries.length) {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[viewer-previews] rendered ${index}/${svgEntries.length} (${seconds}s)`);
    }
  }

  console.log(`[viewer-previews] PASS: wrote PNG previews to ${PNG_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
