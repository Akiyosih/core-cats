import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORE_CATS_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(CORE_CATS_ROOT, "..");
const RESVG_PATH = path.join(CORE_CATS_ROOT, "web", "node_modules", "@resvg", "resvg-js", "index.js");
const DATA_SOURCE = path.join(CORE_CATS_ROOT, "foxar", "src", "CoreCatsOnchainData.sol");
const MANIFEST_PATH = path.join(CORE_CATS_ROOT, "manifests", "final_1000_manifest_v1.json");
const BEAM_PATH = path.join(CORE_CATS_ROOT, "assets", "traits", "beam.png");
const DEFAULT_OUT_ROOT = path.join(PROJECT_ROOT, ".private", "core-cats-beam-selection");
const OUTPUT_SIZE = 384;

const COLLAR_NONE = 0;
const COLLAR_CHECKERED = 1;
const COLLAR_CLASSIC_RED = 2;
const RARITY_TYPE_NONE = 0;
const LAYER_BASE = 0;
const LAYER_COLLAR_CHECKERED = 1;
const LAYER_COLLAR_CLASSIC_RED = 2;

function parseArgs(argv) {
  const opts = {
    outRoot: DEFAULT_OUT_ROOT,
    group: "rare98",
    tokenIds: [],
    outputSubdir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out-root") {
      opts.outRoot = path.resolve(argv[++i]);
    } else if (arg === "--group") {
      opts.group = argv[++i];
    } else if (arg === "--token-ids") {
      opts.tokenIds = argv[++i]
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value > 0);
    } else if (arg === "--output-subdir") {
      opts.outputSubdir = argv[++i];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!["rare98", "tokens"].includes(opts.group)) {
    throw new Error(`unsupported group: ${opts.group}`);
  }
  if (opts.group === "tokens" && opts.tokenIds.length === 0) {
    throw new Error("--token-ids is required when --group=tokens");
  }

  return opts;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function rgbaHex(r, g, b) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function parseHexConstant(sourceText, constantName) {
  const escaped = constantName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`bytes\\s+internal\\s+constant\\s+${escaped}\\s*=\\s*hex"([0-9a-fA-F]+)";`);
  const match = sourceText.match(re);
  if (!match) {
    throw new Error(`hex constant not found: ${constantName}`);
  }
  return Buffer.from(match[1], "hex");
}

async function loadDataBundle() {
  const sourceText = await fs.readFile(DATA_SOURCE, "utf8");
  return {
    tokenRecords: parseHexConstant(sourceText, "TOKEN_RECORDS"),
    colorTupleMeta: parseHexConstant(sourceText, "COLOR_TUPLE_META"),
    colorTupleColors: parseHexConstant(sourceText, "COLOR_TUPLE_COLORS"),
    patternSlotCounts: parseHexConstant(sourceText, "PATTERN_SLOT_COUNTS"),
    patternMasks: parseHexConstant(sourceText, "PATTERN_MASKS"),
    fixedLayerPixels: parseHexConstant(sourceText, "FIXED_LAYER_PIXELS"),
    fixedLayerPaletteMeta: parseHexConstant(sourceText, "FIXED_LAYER_PALETTE_META"),
    fixedLayerPalettes: parseHexConstant(sourceText, "FIXED_LAYER_PALETTES"),
  };
}

function decodeTokenRecord(tokenRecords, tokenId) {
  const off = (tokenId - 1) * 4;
  const packed = tokenRecords[off]
    | (tokenRecords[off + 1] << 8)
    | (tokenRecords[off + 2] << 16)
    | (tokenRecords[off + 3] << 24);

  return {
    patternId: packed & 0x0f,
    paletteId: (packed >> 4) & 0x0f,
    collarTypeId: (packed >> 8) & 0x03,
    rarityTierId: (packed >> 10) & 0x03,
    rarityTypeId: (packed >> 12) & 0x0f,
    colorTupleIndex: (packed >> 16) & 0x01ff,
  };
}

function tupleMeta(meta, index) {
  const pos = index * 3;
  return {
    offset: (meta[pos] << 8) | meta[pos + 1],
    len: meta[pos + 2],
  };
}

function nibbleAt(packed, index) {
  const b = packed[index >> 1];
  return (index & 1) === 0 ? (b >> 4) : (b & 0x0f);
}

function rgbHex(rgbTriples, colorIndex) {
  const off = colorIndex * 3;
  return `#${rgbTriples[off].toString(16).padStart(2, "0")}${rgbTriples[off + 1].toString(16).padStart(2, "0")}${rgbTriples[off + 2].toString(16).padStart(2, "0")}`;
}

function appendRect(parts, x, y, w, color) {
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`);
}

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) {
    return left;
  }
  return pb <= pc ? up : upLeft;
}

function decodePngRgba(pngBytes) {
  if (!pngBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("invalid PNG signature");
  }

  const width = pngBytes.readUInt32BE(16);
  const height = pngBytes.readUInt32BE(20);
  const bitDepth = pngBytes[24];
  const colorType = pngBytes[25];
  const interlace = pngBytes[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported beam PNG format: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }

  let offset = 8;
  const idatChunks = [];
  while (offset < pngBytes.length) {
    const length = pngBytes.readUInt32BE(offset);
    const type = pngBytes.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = pngBytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IDAT") {
      idatChunks.push(chunk);
    }
    if (type === "IEND") {
      break;
    }
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = [];
  let cursor = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    const scanline = raw.subarray(cursor + 1, cursor + 1 + stride);
    cursor += 1 + stride;
    const reconstructed = new Uint8Array(stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= bytesPerPixel ? reconstructed[i - bytesPerPixel] : 0;
      const up = previous[i];
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;
      let value = scanline[i];
      if (filter === 1) {
        value = (value + left) & 0xff;
      } else if (filter === 2) {
        value = (value + up) & 0xff;
      } else if (filter === 3) {
        value = (value + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        value = (value + paethPredictor(left, up, upLeft)) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`unsupported PNG filter: ${filter}`);
      }
      reconstructed[i] = value;
    }

    pixels.push(reconstructed);
    previous = reconstructed;
  }

  return { width, height, pixels };
}

function renderBeamLayer(beamPng, parts) {
  for (let y = 0; y < beamPng.height; y += 1) {
    const row = beamPng.pixels[y];
    let x = 0;
    while (x < beamPng.width) {
      const alpha = row[(x * 4) + 3];
      if (alpha === 0) {
        x += 1;
        continue;
      }

      const r = row[x * 4];
      const g = row[(x * 4) + 1];
      const b = row[(x * 4) + 2];
      const color = rgbaHex(r, g, b);
      const start = x;
      x += 1;

      while (x < beamPng.width) {
        const alpha2 = row[(x * 4) + 3];
        const r2 = row[x * 4];
        const g2 = row[(x * 4) + 1];
        const b2 = row[(x * 4) + 2];
        if (alpha2 === 0 || r2 !== r || g2 !== g || b2 !== b) {
          break;
        }
        x += 1;
      }

      appendRect(parts, start, y, x - start, color);
    }
  }
}

function renderPatternLayer(data, rec, parts) {
  const { offset: tupleOffset, len: tupleLen } = tupleMeta(data.colorTupleMeta, rec.colorTupleIndex);
  const slotCount = data.patternSlotCounts[rec.patternId];
  if (tupleLen < slotCount) {
    throw new Error(`tuple/slot mismatch for patternId=${rec.patternId}`);
  }

  const patternPixelStart = rec.patternId * 576;
  for (let y = 0; y < 24; y += 1) {
    let x = 0;
    while (x < 24) {
      const pix = nibbleAt(data.patternMasks, patternPixelStart + (y * 24) + x);
      if (pix === 0) {
        x += 1;
        continue;
      }

      const start = x;
      while (x < 24) {
        const cur = nibbleAt(data.patternMasks, patternPixelStart + (y * 24) + x);
        if (cur !== pix) {
          break;
        }
        x += 1;
      }

      appendRect(parts, start, y, x - start, rgbHex(data.colorTupleColors, tupleOffset + (pix - 1)));
    }
  }
}

function renderFixedLayer(data, layerId, parts) {
  const { offset: paletteOffset, len: paletteCount } = tupleMeta(data.fixedLayerPaletteMeta, layerId);
  if (paletteCount === 0) {
    return;
  }

  const pixelStart = layerId * 576;
  for (let y = 0; y < 24; y += 1) {
    let x = 0;
    while (x < 24) {
      const pix = nibbleAt(data.fixedLayerPixels, pixelStart + (y * 24) + x);
      if (pix === 0) {
        x += 1;
        continue;
      }

      const start = x;
      while (x < 24) {
        const cur = nibbleAt(data.fixedLayerPixels, pixelStart + (y * 24) + x);
        if (cur !== pix) {
          break;
        }
        x += 1;
      }

      appendRect(parts, start, y, x - start, rgbHex(data.fixedLayerPalettes, paletteOffset + (pix - 1)));
    }
  }
}

function buildBeamCandidateSvg(data, manifestItem, beamPng) {
  const rec = decodeTokenRecord(data.tokenRecords, manifestItem.token_id);
  const parts = [];
  renderPatternLayer(data, rec, parts);
  renderFixedLayer(data, LAYER_BASE, parts);

  if (rec.collarTypeId === COLLAR_CHECKERED) {
    renderFixedLayer(data, LAYER_COLLAR_CHECKERED, parts);
  } else if (rec.collarTypeId === COLLAR_CLASSIC_RED) {
    renderFixedLayer(data, LAYER_COLLAR_CLASSIC_RED, parts);
  }

  renderBeamLayer(beamPng, parts);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">${parts.join("")}</svg>`;
}

function buildCandidateFileStem(item) {
  return [
    String(item.token_id).padStart(4, "0"),
    item.pattern,
    item.palette_id,
    item.collar_type,
    `from_${item.rarity_type}`,
    "beam",
  ].join("__");
}

function uniqueSortedIntegers(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { Resvg } = await import(pathToFileURL(RESVG_PATH).href);
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const data = await loadDataBundle();
  const beamBytes = await fs.readFile(BEAM_PATH);
  const beamPng = decodePngRgba(beamBytes);

  const groupRoot = opts.group === "rare98"
    ? path.join(opts.outRoot, "rare98_candidates")
    : path.join(opts.outRoot, "token_candidates");
  const pngDir = opts.outputSubdir
    ? path.join(opts.outRoot, opts.outputSubdir)
    : path.join(groupRoot, "png");
  const selectedDir = path.join(opts.outRoot, "rare98_selected", "png");
  await ensureDir(pngDir);
  await ensureDir(selectedDir);

  const sourceItems = opts.group === "rare98"
    ? manifest.items.filter((item) => item.rarity_tier === "rare")
    : uniqueSortedIntegers(opts.tokenIds).map((tokenId) => {
        const item = manifest.items.find((entry) => entry.token_id === tokenId);
        if (!item) {
          throw new Error(`token not found in manifest: ${tokenId}`);
        }
        return item;
      });
  const candidateItems = sourceItems.sort((a, b) => a.token_id - b.token_id);

  const index = [];
  for (let i = 0; i < candidateItems.length; i += 1) {
    const item = candidateItems[i];
    const stem = buildCandidateFileStem(item);
    const outPath = path.join(pngDir, `${stem}.png`);
    const svg = buildBeamCandidateSvg(data, item, beamPng);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: OUTPUT_SIZE } });
    await fs.writeFile(outPath, resvg.render().asPng());
    index.push({
      token_id: item.token_id,
      pattern: item.pattern,
      palette_id: item.palette_id,
      category: item.category,
      collar_type: item.collar_type,
      source_rarity_type: item.rarity_type,
      target_rarity_tier: "superrare",
      target_rarity_type: "beam",
      output_png: path.relative(opts.outRoot, outPath).split(path.sep).join("/"),
    });
    if ((i + 1) % 20 === 0 || i + 1 === candidateItems.length) {
      console.log(`[beam-candidates] rendered ${i + 1}/${candidateItems.length}`);
    }
  }

  if (opts.outputSubdir) {
    console.log(`[beam-candidates] PASS: wrote ${index.length} token candidates to ${pngDir}`);
    return;
  }

  const indexPath = path.join(groupRoot, "index.json");
  const readmePath = path.join(groupRoot, "README.txt");
  await fs.writeFile(indexPath, `${JSON.stringify({
    version: "beam_selection_candidates_v1",
    group: opts.group,
    total: index.length,
    beam_asset: path.relative(PROJECT_ROOT, BEAM_PATH).split(path.sep).join("/"),
    items: index,
  }, null, 2)}\n`);
  await fs.writeFile(
    readmePath,
    [
      "rare98 beam candidate previews",
      "",
      "1. review PNG files under png/",
      "2. move the chosen 8 files into ../rare98_selected/png/",
      "3. report the selected file names or token ids",
      "",
      "index.json maps every output file back to its source token and trait values.",
      "",
    ].join("\n"),
  );

  console.log(`[beam-candidates] PASS: wrote ${index.length} candidates to ${pngDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
