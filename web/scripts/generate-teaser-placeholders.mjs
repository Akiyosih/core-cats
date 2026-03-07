import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const teaserDir = path.resolve(__dirname, "../public/teaser");

const entries = [
  { svg: "super-rare-i.svg", png: "super-rare-i.png" },
  { svg: "super-rare-ii.svg", png: "super-rare-ii.png" },
];

for (const entry of entries) {
  const svgPath = path.join(teaserDir, entry.svg);
  const pngPath = path.join(teaserDir, entry.png);
  const svg = await fs.readFile(svgPath, "utf8");
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 384 } });
  const png = resvg.render().asPng();
  await fs.writeFile(pngPath, png);
  console.log(`wrote ${path.relative(process.cwd(), pngPath)}`);
}
