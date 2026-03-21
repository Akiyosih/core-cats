import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORE_CATS_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(CORE_CATS_ROOT, "..");
const RESVG_PATH = path.join(CORE_CATS_ROOT, "web", "node_modules", "@resvg", "resvg-js", "index.js");
const VIEWER_COLLECTION_PATH = path.join(CORE_CATS_ROOT, "manifests", "viewer", "collection.json");
const PREVIEW_PNG_DIR = path.join(CORE_CATS_ROOT, "web", "public", "viewer", "png");
const OUTPUTS = [
  path.join(CORE_CATS_ROOT, "docs", "assets", "core_cats_preview_grid_teaser.png"),
  path.join(PROJECT_ROOT, "core-cats-eth", "docs", "assets", "core_cats_preview_grid_teaser.png"),
];

const WIDTH = 958;
const HEIGHT = 646;
const COLUMNS = 13;
const ROWS = 8;
const CELL = 64;
const GAP = 8;
const PAD_X = 15;
const PAD_Y = 39;
const SEED = 20260307;

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, seed) {
  const next = mulberry32(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSvg(tiles) {
  const background = "#0f141b";
  const frame = "#18222e";
  const stroke = "#31485d";

  const images = tiles.map((tile, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const x = PAD_X + col * (CELL + GAP);
    const y = PAD_Y + row * (CELL + GAP);
    return [
      `<rect x="${x - 2}" y="${y - 2}" width="${CELL + 4}" height="${CELL + 4}" rx="6" fill="${frame}" stroke="${stroke}" stroke-width="2"/>`,
      `<image href="${tile.dataUri}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" preserveAspectRatio="none" image-rendering="pixelated"/>`,
    ].join("");
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" shape-rendering="crispEdges">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>`,
    `<rect x="8" y="8" width="${WIDTH - 16}" height="${HEIGHT - 16}" rx="20" fill="none" stroke="${stroke}" stroke-width="2"/>`,
    images,
    "</svg>",
  ].join("");
}

async function main() {
  const { Resvg } = await import(pathToFileURL(RESVG_PATH).href);
  const collection = JSON.parse(await fs.readFile(VIEWER_COLLECTION_PATH, "utf8"));
  const sourceItems = collection.items.filter((item) => item.trait_values.rarity_tier !== "superrare");
  const shuffled = shuffle(sourceItems, SEED).slice(0, COLUMNS * ROWS);

  const tiles = await Promise.all(shuffled.map(async (item) => {
    const fileName = path.basename(item.image_preview_src || item.image_preview_file || "");
    const pngPath = path.join(PREVIEW_PNG_DIR, fileName);
    const bytes = await fs.readFile(pngPath);
    return {
      tokenId: item.token_id,
      dataUri: `data:image/png;base64,${bytes.toString("base64")}`,
    };
  }));

  const svg = buildSvg(tiles);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  const png = resvg.render().asPng();

  await Promise.all(OUTPUTS.map(async (outputPath) => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, png);
  }));

  console.log(`seed=${SEED}`);
  console.log(`tiles=${tiles.length}`);
  for (const outputPath of OUTPUTS) {
    console.log(`wrote ${path.relative(PROJECT_ROOT, outputPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
