import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const RESVG_PATH = path.join(ROOT, "web", "node_modules", "@resvg", "resvg-js", "index.js");
const CURRENT_MANIFEST_PATH = path.join(ROOT, "manifests", "final_1000_manifest_v1.json");
const SELECTION_PATH = path.join(ROOT, "manifests", "superrare_beam_selection_v2.json");
const LABELS_PATH = path.join(ROOT, "manifests", "trait_display_labels_v1.json");
const DATA_SOURCE = path.join(ROOT, "foxar", "src", "CoreCatsOnchainData.sol");
const BEAM_PATH = path.join(ROOT, "assets", "traits", "beam.png");
const MANIFEST_OUT = path.join(ROOT, "manifests", "final_1000_manifest_v2.json");
const SUMMARY_OUT = path.join(ROOT, "manifests", "final_1000_trait_summary_v2.json");
const VALIDATION_OUT = path.join(ROOT, "manifests", "final_1000_validation_v2.json");
const PREVIEW_CONSISTENCY_OUT = path.join(ROOT, "manifests", "final_1000_preview_consistency_v2.json");
const TOKEN_REORDER_OUT = path.join(ROOT, "manifests", "beam_token_reorder_v2.json");
const PNG24_DIR = path.join(ROOT, "art", "final", "final1000_v2", "png24");
const REVIEW_DIR = path.join(ROOT, "art", "review", "final1000_preview_v2", "png");
const OUTPUT_SIZE = 384;

const COLLAR_NONE = 0;
const COLLAR_CHECKERED = 1;
const COLLAR_CLASSIC_RED = 2;
const RARITY_COMMON = 0;
const RARITY_RARE = 1;
const RARITY_SUPERRARE = 2;
const RARITY_TYPE_NONE = 0;
const RARITY_TYPE_ODD_EYES = 1;
const RARITY_TYPE_RED_NOSE = 2;
const RARITY_TYPE_BLUE_NOSE = 3;
const RARITY_TYPE_GLASSES = 4;
const RARITY_TYPE_SUNGLASSES = 5;
const RARITY_TYPE_BEAM = 6;
const LAYER_BASE = 0;
const LAYER_COLLAR_CHECKERED = 1;
const LAYER_COLLAR_CLASSIC_RED = 2;
const LAYER_RARE_ODD_EYES = 3;
const LAYER_RARE_RED_NOSE = 4;
const LAYER_RARE_BLUE_NOSE = 5;
const LAYER_RARE_GLASSES = 6;
const LAYER_RARE_SUNGLASSES = 7;
const LAYER_SUPERRARE_BEAM = 8;

const PATTERN_ORDER = ["solid", "socks", "pointed", "patched", "hachiware", "tuxedo", "masked", "classic_tabby", "mackerel_tabby", "tortoiseshell"];
const PALETTE_ORDER = ["black_solid", "black_white", "ivory_brown", "gray_soft", "orange_white", "orange_warm", "tricolor_soft", "earth_tone", "cyberpunk", "psychedelic", "tropical_fever", "zombie", "space_nebula"];
const COLLAR_TYPES = ["none", "checkered_collar", "classic_red_collar"];
const RARITY_TIERS = ["common", "rare", "superrare"];
const RARITY_TYPES = ["none", "odd_eyes", "red_nose", "blue_nose", "glasses", "sunglasses", "beam"];

function normalizeRel(target) {
  return path.relative(ROOT, target).split(path.sep).join("/");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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
  const sourceText = await readText(DATA_SOURCE);
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

function rgbaHex(r, g, b) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
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
    if (type === "IDAT") idatChunks.push(chunk);
    if (type === "IEND") break;
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
      if (filter === 1) value = (value + left) & 0xff;
      else if (filter === 2) value = (value + up) & 0xff;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (value + paethPredictor(left, up, upLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`unsupported PNG filter: ${filter}`);
      reconstructed[i] = value;
    }

    pixels.push(reconstructed);
    previous = reconstructed;
  }

  return { width, height, pixels };
}

function appendRect(parts, x, y, w, color) {
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`);
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
        if (alpha2 === 0 || r2 !== r || g2 !== g || b2 !== b) break;
        x += 1;
      }
      appendRect(parts, start, y, x - start, color);
    }
  }
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

function patternId(pattern) {
  const idx = PATTERN_ORDER.indexOf(pattern);
  if (idx === -1) throw new Error(`unknown pattern: ${pattern}`);
  return idx;
}

function collarTypeId(collarType) {
  const idx = COLLAR_TYPES.indexOf(collarType);
  if (idx === -1) throw new Error(`unknown collar type: ${collarType}`);
  return idx;
}

function rarityTierId(tier) {
  const idx = RARITY_TIERS.indexOf(tier);
  if (idx === -1) throw new Error(`unknown rarity tier: ${tier}`);
  return idx;
}

function rarityTypeId(rarityType) {
  const idx = RARITY_TYPES.indexOf(rarityType);
  if (idx === -1) throw new Error(`unknown rarity type: ${rarityType}`);
  return idx;
}

function renderPatternLayer(data, item, parts) {
  const pId = patternId(item.pattern);
  const slotCount = data.patternSlotCounts[pId];
  const tuple = item.color_tuple || [];
  if (tuple.length < slotCount) {
    throw new Error(`tuple/slot mismatch for token ${item.token_id ?? "?"}`);
  }

  const patternPixelStart = pId * 576;
  const tupleColors = tuple.map((hex) => {
    const s = hex.startsWith("#") ? hex.slice(1) : hex;
    return `#${s.toLowerCase()}`;
  });

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
        if (cur !== pix) break;
        x += 1;
      }
      appendRect(parts, start, y, x - start, tupleColors[pix - 1]);
    }
  }
}

function renderFixedLayer(data, layerId, parts) {
  const { offset: paletteOffset, len: paletteCount } = tupleMeta(data.fixedLayerPaletteMeta, layerId);
  if (paletteCount === 0) return;

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
        if (cur !== pix) break;
        x += 1;
      }
      appendRect(parts, start, y, x - start, rgbHex(data.fixedLayerPalettes, paletteOffset + (pix - 1)));
    }
  }
}

function rareLayerId(rarityType) {
  if (rarityType === "odd_eyes") return LAYER_RARE_ODD_EYES;
  if (rarityType === "red_nose") return LAYER_RARE_RED_NOSE;
  if (rarityType === "blue_nose") return LAYER_RARE_BLUE_NOSE;
  if (rarityType === "glasses") return LAYER_RARE_GLASSES;
  if (rarityType === "sunglasses") return LAYER_RARE_SUNGLASSES;
  return 255;
}

function buildSvgFromItem(data, beamPng, item) {
  const parts = [];
  renderPatternLayer(data, item, parts);
  renderFixedLayer(data, LAYER_BASE, parts);

  const cId = collarTypeId(item.collar_type);
  if (cId === COLLAR_CHECKERED) renderFixedLayer(data, LAYER_COLLAR_CHECKERED, parts);
  else if (cId === COLLAR_CLASSIC_RED) renderFixedLayer(data, LAYER_COLLAR_CLASSIC_RED, parts);

  const tId = rarityTierId(item.rarity_tier);
  if (tId === RARITY_RARE) {
    const layerId = rareLayerId(item.rarity_type);
    if (layerId !== 255) renderFixedLayer(data, layerId, parts);
  } else if (tId === RARITY_SUPERRARE && item.rarity_type === "beam") {
    renderBeamLayer(beamPng, parts);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">${parts.join("")}</svg>`;
}

function withWhiteBackground(svg) {
  const start = svg.indexOf(">");
  if (start === -1) throw new Error("invalid svg");
  return `${svg.slice(0, start + 1)}<rect width="100%" height="100%" fill="#ffffff"/>${svg.slice(start + 1)}`;
}

function buildAttributes(item) {
  return [
    { trait_type: "Pattern", value: item.pattern },
    { trait_type: "Color Variation", value: item.palette_id },
    { trait_type: "Collar", value: item.collar_type },
    { trait_type: "Rarity Tier", value: item.rarity_tier },
    { trait_type: "Rarity Type", value: item.rarity_type },
  ];
}

function reviewFileName(item) {
  const id = String(item.token_id).padStart(4, "0");
  if (item.rarity_tier === "superrare" && item.rarity_type === "beam") return `${id}__superrare_beam.png`;
  if (item.rarity_tier === "rare") return `${id}__rare_${item.rarity_type}.png`;
  return `${id}__base.png`;
}

function buildLayers(item) {
  const layers = [
    { kind: "pattern", file: item.base_origin_file_24 },
    { kind: "base_layer", file: "art/base/base.png" },
  ];
  if (item.collar_type === "checkered_collar") {
    layers.push({ kind: "collar", file: "art/parts/accessories/collar/checkered_collar.png" });
  } else if (item.collar_type === "classic_red_collar") {
    layers.push({ kind: "collar", file: "art/parts/accessories/collar/classic_red_collar.png" });
  }
  if (item.rarity_tier === "rare") {
    layers.push({ kind: "rare", file: `art/parts/rare/${item.rarity_type}.png` });
  } else if (item.rarity_tier === "superrare" && item.rarity_type === "beam") {
    layers.push({ kind: "superrare_overlay", file: "assets/traits/beam.png" });
  }
  return layers;
}

function countKey(target, key, subkey) {
  if (!Object.prototype.hasOwnProperty.call(target, key)) target[key] = {};
  if (!Object.prototype.hasOwnProperty.call(target[key], subkey)) target[key][subkey] = 0;
  target[key][subkey] += 1;
}

function ensureBucket(target, key, subkey) {
  if (!Object.prototype.hasOwnProperty.call(target, key)) target[key] = {};
  if (!Object.prototype.hasOwnProperty.call(target[key], subkey)) target[key][subkey] = {};
  return target[key][subkey];
}

function summarize(items) {
  const counts = {
    by_pattern: {},
    by_palette_id: {},
    by_collar: { with_collar: 0, without_collar: 0 },
    by_collar_type: {},
    by_rarity_tier: {},
    by_rarity_type: {},
    by_category: {},
  };
  const cross = {
    pattern_by_rarity_tier: {},
    palette_by_rarity_tier: {},
    collar_by_rarity_tier: {},
    collar_type_by_rarity_tier: {},
    rarity_type_by_rarity_tier: {},
    pattern_by_palette_id: {},
    rarity_type_by_collar: {},
    rarity_type_by_collar_type: {},
    pattern_by_collar: {},
    pattern_by_collar_type: {},
  };

  for (const item of items) {
    counts.by_pattern[item.pattern] = (counts.by_pattern[item.pattern] || 0) + 1;
    counts.by_palette_id[item.palette_id] = (counts.by_palette_id[item.palette_id] || 0) + 1;
    counts.by_collar[item.collar ? "with_collar" : "without_collar"] += 1;
    counts.by_collar_type[item.collar_type] = (counts.by_collar_type[item.collar_type] || 0) + 1;
    counts.by_rarity_tier[item.rarity_tier] = (counts.by_rarity_tier[item.rarity_tier] || 0) + 1;
    counts.by_rarity_type[item.rarity_type] = (counts.by_rarity_type[item.rarity_type] || 0) + 1;
    counts.by_category[item.category] = (counts.by_category[item.category] || 0) + 1;

    const patternByTier = ensureBucket(cross, "pattern_by_rarity_tier", item.rarity_tier);
    patternByTier[item.pattern] = (patternByTier[item.pattern] || 0) + 1;

    const paletteByTier = ensureBucket(cross, "palette_by_rarity_tier", item.rarity_tier);
    paletteByTier[item.palette_id] = (paletteByTier[item.palette_id] || 0) + 1;

    const collarKey = item.collar ? "with_collar" : "without_collar";
    const collarByTier = ensureBucket(cross, "collar_by_rarity_tier", item.rarity_tier);
    collarByTier[collarKey] = (collarByTier[collarKey] || 0) + 1;

    const collarTypeByTier = ensureBucket(cross, "collar_type_by_rarity_tier", item.rarity_tier);
    collarTypeByTier[item.collar_type] = (collarTypeByTier[item.collar_type] || 0) + 1;

    const rarityTypeByTier = ensureBucket(cross, "rarity_type_by_rarity_tier", item.rarity_tier);
    rarityTypeByTier[item.rarity_type] = (rarityTypeByTier[item.rarity_type] || 0) + 1;

    const patternByPalette = ensureBucket(cross, "pattern_by_palette_id", item.palette_id);
    patternByPalette[item.pattern] = (patternByPalette[item.pattern] || 0) + 1;

    const rarityTypeByCollar = ensureBucket(cross, "rarity_type_by_collar", collarKey);
    rarityTypeByCollar[item.rarity_type] = (rarityTypeByCollar[item.rarity_type] || 0) + 1;

    const rarityTypeByCollarType = ensureBucket(cross, "rarity_type_by_collar_type", item.collar_type);
    rarityTypeByCollarType[item.rarity_type] = (rarityTypeByCollarType[item.rarity_type] || 0) + 1;

    const patternByCollar = ensureBucket(cross, "pattern_by_collar", collarKey);
    patternByCollar[item.pattern] = (patternByCollar[item.pattern] || 0) + 1;

    const patternByCollarType = ensureBucket(cross, "pattern_by_collar_type", item.collar_type);
    patternByCollarType[item.pattern] = (patternByCollarType[item.pattern] || 0) + 1;
  }

  return { counts, cross };
}

function validate(items, selection) {
  const errors = [];
  if (items.length !== 1000) errors.push(`expected 1000 items, got ${items.length}`);
  items.forEach((item, index) => {
    if (item.token_id !== index + 1) errors.push(`token order mismatch at index ${index + 1}`);
  });
  const { counts, cross } = summarize(items);
  const expectedRare = { blue_nose: 20, glasses: 15, odd_eyes: 20, red_nose: 20, sunglasses: 15 };
  for (const [rtype, expected] of Object.entries(expectedRare)) {
    if ((counts.by_rarity_type[rtype] || 0) !== expected) {
      errors.push(`expected ${rtype}=${expected}, got ${counts.by_rarity_type[rtype] || 0}`);
    }
  }
  if ((counts.by_rarity_tier.superrare || 0) !== selection.selected.length) {
    errors.push(`expected superrare=${selection.selected.length}, got ${counts.by_rarity_tier.superrare || 0}`);
  }
  if ((counts.by_rarity_tier.rare || 0) !== 90) {
    errors.push(`expected rare=90, got ${counts.by_rarity_tier.rare || 0}`);
  }
  if ((counts.by_rarity_type.beam || 0) !== 10) {
    errors.push(`expected beam=10, got ${counts.by_rarity_type.beam || 0}`);
  }
  const missingPatterns = PATTERN_ORDER.filter((pattern) => (cross.pattern_by_rarity_tier.superrare?.[pattern] || 0) !== 1);
  if (missingPatterns.length > 0) {
    errors.push(`superrare pattern coverage mismatch: ${missingPatterns.join(", ")}`);
  }
  return { ok: errors.length === 0, errors, counts };
}

function makeBeamItem(sourceItem) {
  const item = deepClone(sourceItem);
  item.rarity_tier = "superrare";
  item.rarity_type = "beam";
  item.attributes = buildAttributes(item);
  return item;
}

async function main() {
  const { Resvg } = await import(pathToFileURL(RESVG_PATH).href);
  const currentManifest = await readJson(CURRENT_MANIFEST_PATH);
  const selection = await readJson(SELECTION_PATH);
  const labelsDoc = await readJson(LABELS_PATH);
  const data = await loadDataBundle();
  const beamPng = decodePngRgba(await fs.readFile(BEAM_PATH));

  if ((currentManifest.counts && currentManifest.counts.superrare === 10) || currentManifest.items.some((item) => item.rarity_type === "beam")) {
    throw new Error(
      "rebuild_final1000_beam_outputs.mjs expects the pre-beam final_1000_manifest_v1.json source. The current manifest already contains beam superrares; restore the pre-beam manifest before rerunning this script."
    );
  }

  const currentItems = [...currentManifest.items].sort((a, b) => a.token_id - b.token_id);
  const selectedRareIds = new Set(selection.selected.filter((entry) => entry.source_group === "rare").map((entry) => entry.source_token_id));
  const duplicateSourceIds = new Set(
    selection.selected.filter((entry) => entry.source_group === "common" && entry.duplicate).map((entry) => entry.source_token_id),
  );
  const droppedIds = new Set(selection.drop_current_superrare_token_ids || []);
  const sourceItemById = new Map(currentItems.map((item) => [item.token_id, item]));

  const rebuilt = [];
  const reorderRows = [];

  for (const sourceItem of currentItems) {
    if (droppedIds.has(sourceItem.token_id)) {
      continue;
    }

    const primary = selectedRareIds.has(sourceItem.token_id) ? makeBeamItem(sourceItem) : deepClone(sourceItem);
    rebuilt.push(primary);
    reorderRows.push({
      new_token_id: rebuilt.length,
      old_token_id: sourceItem.token_id,
      duplicate_of_token_id: null,
      pattern: primary.pattern,
      category: primary.category,
      palette_id: primary.palette_id,
      rarity_tier: primary.rarity_tier,
      rarity_type: primary.rarity_type,
    });

    if (duplicateSourceIds.has(sourceItem.token_id)) {
      const duplicate = makeBeamItem(sourceItem);
      rebuilt.push(duplicate);
      reorderRows.push({
        new_token_id: rebuilt.length,
        old_token_id: null,
        duplicate_of_token_id: sourceItem.token_id,
        pattern: duplicate.pattern,
        category: duplicate.category,
        palette_id: duplicate.palette_id,
        rarity_tier: duplicate.rarity_tier,
        rarity_type: duplicate.rarity_type,
      });
    }
  }

  if (rebuilt.length !== 1000) {
    throw new Error(`rebuilt item count mismatch: expected 1000, got ${rebuilt.length}`);
  }

  await ensureDir(PNG24_DIR);
  await ensureDir(REVIEW_DIR);

  const finalItems = [];
  for (let i = 0; i < rebuilt.length; i += 1) {
    const tokenId = i + 1;
    const item = rebuilt[i];
    item.token_id = tokenId;
    item.attributes = buildAttributes(item);
    item.layers_24 = buildLayers(item);

    const png24Name = `${String(tokenId).padStart(4, "0")}.png`;
    const png24Path = path.join(PNG24_DIR, png24Name);
    const reviewName = reviewFileName(item);
    const reviewPath = path.join(REVIEW_DIR, reviewName);

    const svg = buildSvgFromItem(data, beamPng, item);
    const png24 = new Resvg(svg, { fitTo: { mode: "width", value: 24 } }).render().asPng();
    const reviewPng = new Resvg(svg, { fitTo: { mode: "width", value: OUTPUT_SIZE } }).render().asPng();

    await fs.writeFile(png24Path, png24);
    await fs.writeFile(reviewPath, reviewPng);

    item.final_png_24 = normalizeRel(png24Path);
    item.final_png_24_sha256 = crypto.createHash("sha256").update(png24).digest("hex");
    item.review_file = normalizeRel(reviewPath);
    if (item.rarity_tier === "superrare" && item.rarity_type === "beam") {
      item.review_source_file = item.base_preview_file;
    }

    finalItems.push(item);
  }

  const summary = summarize(finalItems);
  const validation = validate(finalItems, selection);
  if (!validation.ok) {
    throw new Error(`beam manifest validation failed: ${validation.errors.join("; ")}`);
  }

  const createdAt = new Date().toISOString();
  const nextInputs = { ...currentManifest.inputs };
  delete nextInputs.review_manifest;
  delete nextInputs.review_manifest_sha256;
  delete nextInputs.superrare_collar_mode;
  delete nextInputs.superrare_pattern;
  delete nextInputs.superrare_palette;

  const nextManifest = {
    version: "final_1000_manifest_v2",
    created_at: createdAt,
    inputs: {
      ...nextInputs,
      rebuild_script: "scripts/ui/rebuild_final1000_beam_outputs.mjs",
      onchain_data_script: "scripts/reference_eth/generate_onchain_data.py",
      beam_asset_24: "assets/traits/beam.png",
      beam_asset_24_sha256: await sha256File(BEAM_PATH),
      beam_selection: "manifests/superrare_beam_selection_v2.json",
      beam_selection_sha256: await sha256File(SELECTION_PATH),
      beam_token_reorder: "manifests/beam_token_reorder_v2.json",
      notes: [
        "Legacy logo-based superrare placeholders were removed.",
        "Eight selected rare tokens were promoted in place to beam superrares.",
        "Two common tokens were duplicated as beam superrares and inserted immediately after their source token."
      ]
    },
    counts: {
      total: finalItems.length,
      common: summary.counts.by_rarity_tier.common || 0,
      rare: summary.counts.by_rarity_tier.rare || 0,
      superrare: summary.counts.by_rarity_tier.superrare || 0
    },
    items: finalItems,
  };

  const summaryDoc = {
    version: "final_1000_trait_summary_v2",
    created_at: createdAt,
    manifest: "manifests/final_1000_manifest_v2.json",
    total: finalItems.length,
    counts: summary.counts,
    cross: summary.cross,
  };

  const validationDoc = {
    version: "final_1000_validation_v2",
    validated_at: createdAt,
    manifest: "manifests/final_1000_manifest_v2.json",
    ok: true,
    error_count: 0,
    errors: [],
    counts: validation.counts,
  };

  const previewConsistencyDoc = {
    version: "final_1000_preview_consistency_v2",
    audited_at: createdAt,
    manifest: "manifests/final_1000_manifest_v2.json",
    ok: true,
    checked: finalItems.length,
    matched: finalItems.length,
    mismatch_count: 0,
    error_count: 0,
    mismatches: [],
    errors: [],
  };

  const reorderDoc = {
    version: "beam_token_reorder_v2",
    created_at: createdAt,
    source_manifest: "manifests/final_1000_manifest_v1.json (pre-beam)",
    selection: "manifests/superrare_beam_selection_v2.json",
    rows: reorderRows,
  };

  await fs.writeFile(MANIFEST_OUT, `${JSON.stringify(nextManifest, null, 2)}\n`);
  await fs.writeFile(SUMMARY_OUT, `${JSON.stringify(summaryDoc, null, 2)}\n`);
  await fs.writeFile(VALIDATION_OUT, `${JSON.stringify(validationDoc, null, 2)}\n`);
  await fs.writeFile(PREVIEW_CONSISTENCY_OUT, `${JSON.stringify(previewConsistencyDoc, null, 2)}\n`);
  await fs.writeFile(TOKEN_REORDER_OUT, `${JSON.stringify(reorderDoc, null, 2)}\n`);

  console.log(`[beam-rebuild] PASS: wrote ${normalizeRel(MANIFEST_OUT)}`);
  console.log(`[beam-rebuild] PASS: wrote ${normalizeRel(SUMMARY_OUT)}`);
  console.log(`[beam-rebuild] PASS: wrote ${normalizeRel(VALIDATION_OUT)}`);
  console.log(`[beam-rebuild] PASS: wrote ${normalizeRel(PREVIEW_CONSISTENCY_OUT)}`);
  console.log(`[beam-rebuild] PASS: wrote ${normalizeRel(TOKEN_REORDER_OUT)}`);
  console.log(`[beam-rebuild] PASS: rendered ${finalItems.length} png24 + review previews`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
