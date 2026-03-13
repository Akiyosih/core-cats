import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";

const DEFAULT_OUT_DIR = "manifests/viewer_v1";
const DEFAULT_PUBLIC_SVG_DIR = "web/public/viewer_v1/svg";
const DEFAULT_PUBLIC_PNG_DIR = "web/public/viewer_v1/png";
const DEFAULT_PUBLIC_PNG_WHITE_DIR = "web/public/viewer_v1/png-white";
const DEFAULT_PUBLIC_COLLECTION_INDEX_PATH = "web/public/viewer_v1/collection-index.json";
const TRAIT_FILTER_ORDER = [
  ["pattern", "Pattern"],
  ["palette_id", "Color Variation"],
  ["category", "Category"],
  ["collar", "Collar"],
  ["rarity_tier", "Rarity Tier"],
  ["rarity_type", "Rarity Type"],
];

const PATTERN_SUPERRARE = 10;
const COLLAR_NONE = 0;
const COLLAR_CHECKERED = 1;
const COLLAR_CLASSIC_RED = 2;
const RARITY_RARE = 1;
const RARITY_SUPERRARE = 2;
const RARITY_TYPE_CORELOGO = 6;
const RARITY_TYPE_ODD_EYES = 1;
const RARITY_TYPE_RED_NOSE = 2;
const RARITY_TYPE_BLUE_NOSE = 3;
const RARITY_TYPE_GLASSES = 4;
const RARITY_TYPE_SUNGLASSES = 5;
const LAYER_BASE = 0;
const LAYER_COLLAR_CHECKERED = 1;
const LAYER_COLLAR_CLASSIC_RED = 2;
const LAYER_RARE_ODD_EYES = 3;
const LAYER_RARE_RED_NOSE = 4;
const LAYER_RARE_BLUE_NOSE = 5;
const LAYER_RARE_GLASSES = 6;
const LAYER_RARE_SUNGLASSES = 7;
const LAYER_SUPERRARE_CORE = 8;
const LAYER_SUPERRARE_PING = 9;

function parseArgs(argv) {
  const opts = {
    outDir: DEFAULT_OUT_DIR,
    emitSvgFiles: true,
    publicSvgDir: DEFAULT_PUBLIC_SVG_DIR,
    publicPngDir: DEFAULT_PUBLIC_PNG_DIR,
    publicPngWhiteDir: DEFAULT_PUBLIC_PNG_WHITE_DIR,
    publicCollectionIndexPath: DEFAULT_PUBLIC_COLLECTION_INDEX_PATH,
    embedDataUri: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out-dir") {
      opts.outDir = argv[++i];
      if (!opts.outDir) {
        throw new Error("--out-dir requires a value");
      }
    } else if (arg === "--public-svg-dir") {
      opts.publicSvgDir = argv[++i];
      if (!opts.publicSvgDir) {
        throw new Error("--public-svg-dir requires a value");
      }
    } else if (arg === "--public-png-dir") {
      opts.publicPngDir = argv[++i];
      if (!opts.publicPngDir) {
        throw new Error("--public-png-dir requires a value");
      }
    } else if (arg === "--public-png-white-dir") {
      opts.publicPngWhiteDir = argv[++i];
      if (!opts.publicPngWhiteDir) {
        throw new Error("--public-png-white-dir requires a value");
      }
    } else if (arg === "--public-collection-index-path") {
      opts.publicCollectionIndexPath = argv[++i];
      if (!opts.publicCollectionIndexPath) {
        throw new Error("--public-collection-index-path requires a value");
      }
    } else if (arg === "--emit-svg-files") {
      opts.emitSvgFiles = true;
    } else if (arg === "--no-emit-svg-files") {
      opts.emitSvgFiles = false;
    } else if (arg === "--embed-data-uri") {
      opts.embedDataUri = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return opts;
}

function normalizeRel(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureAttrEqual(actual, expected, tokenId) {
  if (actual.length !== expected.length) {
    throw new Error(`token ${tokenId}: attributes length mismatch ${actual.length} != ${expected.length}`);
  }

  for (let i = 0; i < expected.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (!a || a.trait_type !== e.trait_type || a.value !== e.value) {
      throw new Error(
        `token ${tokenId}: attr[${i}] mismatch actual=${JSON.stringify(a)} expected=${JSON.stringify(e)}`,
      );
    }
  }
}

function buildDisplayAttributes(attributes, labelsDoc) {
  const typeLabels = labelsDoc.trait_type_labels || {};
  const valueLabels = labelsDoc.trait_value_labels || {};

  return attributes.map((attr) => ({
    trait_type_id: attr.trait_type,
    trait_type_label: typeLabels[attr.trait_type] || attr.trait_type,
    value_id: attr.value,
    value_label: valueLabels[attr.trait_type]?.[attr.value] || attr.value,
  }));
}

function buildTraitValues(item) {
  return {
    pattern: item.pattern,
    palette_id: item.palette_id,
    category: item.category,
    collar: item.collar_type,
    rarity_tier: item.rarity_tier,
    rarity_type: item.rarity_type,
  };
}

function buildFilterDoc(collectionItems, labelsDoc, summaryDoc, root, outDir) {
  const typeLabels = labelsDoc.trait_type_labels || {};
  const valueLabels = labelsDoc.trait_value_labels || {};
  const summaryCounts = summaryDoc.counts || {};

  const filters = {};
  for (const [key, traitType] of TRAIT_FILTER_ORDER) {
    const countKey = key === "pattern"
      ? "by_pattern"
      : key === "palette_id"
        ? "by_palette_id"
        : key === "category"
          ? "by_category"
          : key === "collar"
            ? "by_collar_type"
            : key === "rarity_tier"
              ? "by_rarity_tier"
              : "by_rarity_type";

    const counts = summaryCounts[countKey] || {};
    const values = Object.keys(counts)
      .sort((a, b) => {
        if (a === "superrare") return 1;
        if (b === "superrare") return -1;
        return a.localeCompare(b);
      })
      .map((valueId) => ({
        id: valueId,
        label: valueLabels[traitType]?.[valueId] || valueId,
        count: counts[valueId],
      }));

    filters[key] = {
      trait_type_id: traitType,
      trait_type_label: typeLabels[traitType] || (traitType === "Category" ? "Category" : traitType),
      source: key === "category" ? "manifest-only" : "onchain-attributes",
      values,
    };
  }

  return {
    version: "viewer_filters_v1",
    generated_at: new Date().toISOString(),
    source_manifest: "manifests/final_1000_manifest_v1.json",
    source_trait_labels: "manifests/trait_display_labels_v1.json",
    source_trait_summary: "manifests/final_1000_trait_summary_v1.json",
    source_collection: normalizeRel(root, path.join(outDir, "collection.json")),
    total: collectionItems.length,
    filters,
  };
}

function buildSummaryDoc(summaryDoc, root, outDir) {
  return {
    version: "viewer_summary_v1",
    generated_at: new Date().toISOString(),
    source_manifest: "manifests/final_1000_manifest_v1.json",
    source_trait_summary: "manifests/final_1000_trait_summary_v1.json",
    source_collection: normalizeRel(root, path.join(outDir, "collection.json")),
    total: summaryDoc.total,
    counts: summaryDoc.counts,
    cross: summaryDoc.cross,
  };
}

function buildCollectionIndexDoc(collectionItems, root, outDir) {
  return {
    version: "viewer_collection_index_v1",
    generated_at: new Date().toISOString(),
    source_collection: normalizeRel(root, path.join(outDir, "collection.json")),
    total: collectionItems.length,
    items: collectionItems.map((item) => ({
      token_id: item.token_id,
      trait_values: item.trait_values,
    })),
  };
}

function buildDetailIndexDoc(collectionItems, root, outDir) {
  return {
    version: "viewer_detail_index_v1",
    generated_at: new Date().toISOString(),
    source_collection: normalizeRel(root, path.join(outDir, "collection.json")),
    total: collectionItems.length,
    items: collectionItems.map((item) => ({
      token_id: item.token_id,
      name: item.name,
      description: item.description,
      image_src: item.image_src,
      image_svg_src: item.image_svg_src,
      image_svg_file: item.image_svg_file,
      image_preview_src: item.image_preview_src,
      image_preview_file: item.image_preview_file,
      image_preview_white_src: item.image_preview_white_src,
      image_preview_white_file: item.image_preview_white_file,
      display_attributes: item.display_attributes,
      trait_values: item.trait_values,
      render_recipe: {
        pattern: item.trait_values.pattern,
        palette_id: item.trait_values.palette_id,
        color_tuple: item.color_tuple ?? null,
        slots: item.slots ?? null,
      },
      integrity: item.integrity,
    })),
  };
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

function loadDataBundle(root) {
  const sourcePath = path.join(root, "foxar", "src", "CoreCatsOnchainData.sol");
  const sourceText = loadText(sourcePath);

  return {
    source_path: normalizeRel(root, sourcePath),
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

function renderPatternLayer(data, rec, parts) {
  if (rec.patternId === PATTERN_SUPERRARE) {
    return;
  }

  const { offset: tupleOffset, len: tupleLen } = tupleMeta(data.colorTupleMeta, rec.colorTupleIndex);
  const slotCount = data.patternSlotCounts[rec.patternId];
  if (tupleLen < slotCount) {
    throw new Error(`tuple/slot mismatch for token record patternId=${rec.patternId}`);
  }

  const patternPixelStart = rec.patternId * 576;
  for (let y = 0; y < 24; y++) {
    let x = 0;
    while (x < 24) {
      const pix = nibbleAt(data.patternMasks, patternPixelStart + (y * 24) + x);
      if (pix === 0) {
        x++;
        continue;
      }

      const start = x;
      while (x < 24) {
        const cur = nibbleAt(data.patternMasks, patternPixelStart + (y * 24) + x);
        if (cur !== pix) {
          break;
        }
        x++;
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
  for (let y = 0; y < 24; y++) {
    let x = 0;
    while (x < 24) {
      const pix = nibbleAt(data.fixedLayerPixels, pixelStart + (y * 24) + x);
      if (pix === 0) {
        x++;
        continue;
      }

      const start = x;
      while (x < 24) {
        const cur = nibbleAt(data.fixedLayerPixels, pixelStart + (y * 24) + x);
        if (cur !== pix) {
          break;
        }
        x++;
      }

      appendRect(parts, start, y, x - start, rgbHex(data.fixedLayerPalettes, paletteOffset + (pix - 1)));
    }
  }
}

function rareLayerId(rarityTypeId) {
  if (rarityTypeId === RARITY_TYPE_ODD_EYES) return LAYER_RARE_ODD_EYES;
  if (rarityTypeId === RARITY_TYPE_RED_NOSE) return LAYER_RARE_RED_NOSE;
  if (rarityTypeId === RARITY_TYPE_BLUE_NOSE) return LAYER_RARE_BLUE_NOSE;
  if (rarityTypeId === RARITY_TYPE_GLASSES) return LAYER_RARE_GLASSES;
  if (rarityTypeId === RARITY_TYPE_SUNGLASSES) return LAYER_RARE_SUNGLASSES;
  return 255;
}

function buildSvg(data, rec) {
  const parts = [];

  if (rec.rarityTierId === RARITY_SUPERRARE) {
    renderFixedLayer(data, rec.rarityTypeId === RARITY_TYPE_CORELOGO ? LAYER_SUPERRARE_CORE : LAYER_SUPERRARE_PING, parts);
  } else {
    renderPatternLayer(data, rec, parts);
    renderFixedLayer(data, LAYER_BASE, parts);

    if (rec.collarTypeId === COLLAR_CHECKERED) {
      renderFixedLayer(data, LAYER_COLLAR_CHECKERED, parts);
    } else if (rec.collarTypeId === COLLAR_CLASSIC_RED) {
      renderFixedLayer(data, LAYER_COLLAR_CLASSIC_RED, parts);
    }

    if (rec.rarityTierId === RARITY_RARE) {
      const rareLayer = rareLayerId(rec.rarityTypeId);
      if (rareLayer !== 255) {
        renderFixedLayer(data, rareLayer, parts);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">${parts.join("")}</svg>`;
}

function traitNamesFromRecord(rec) {
  const patternNames = ["solid", "socks", "pointed", "patched", "hachiware", "tuxedo", "masked", "classic_tabby", "mackerel_tabby", "tortoiseshell", "superrare"];
  const paletteNames = ["black_white", "cyberpunk", "earth_tone", "gray_soft", "orange_warm", "orange_white", "psychedelic", "space_nebula", "tricolor_soft", "tropical_fever", "zombie", "ivory_brown", "black_solid", "superrare"];
  const collarTypeNames = ["none", "checkered_collar", "classic_red_collar"];
  const rarityTierNames = ["common", "rare", "superrare"];
  const rarityTypeNames = ["none", "odd_eyes", "red_nose", "blue_nose", "glasses", "sunglasses", "corelogo", "pinglogo"];

  return {
    Pattern: patternNames[rec.patternId] || "unknown",
    "Color Variation": paletteNames[rec.paletteId] || "unknown",
    Collar: collarTypeNames[rec.collarTypeId] || "none",
    "Rarity Tier": rarityTierNames[rec.rarityTierId] || "common",
    "Rarity Type": rarityTypeNames[rec.rarityTypeId] || "none",
  };
}

function buildImageDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const outDir = path.resolve(root, opts.outDir);
  const publicSvgDir = path.resolve(root, opts.publicSvgDir);
  const publicPngDir = path.resolve(root, opts.publicPngDir);
  const publicPngWhiteDir = path.resolve(root, opts.publicPngWhiteDir);
  const publicCollectionIndexPath = path.resolve(root, opts.publicCollectionIndexPath);

  ensureDir(outDir);
  if (opts.emitSvgFiles) {
    ensureDir(publicSvgDir);
  }
  ensureDir(path.dirname(publicCollectionIndexPath));

  const manifest = readJson(path.join(root, "manifests", "final_1000_manifest_v1.json"));
  const labelsDoc = readJson(path.join(root, "manifests", "trait_display_labels_v1.json"));
  const summaryDoc = readJson(path.join(root, "manifests", "final_1000_trait_summary_v1.json"));
  const items = [...manifest.items].sort((a, b) => a.token_id - b.token_id);
  const data = loadDataBundle(root);

  if (items.length !== 1000) {
    throw new Error(`expected 1000 manifest items, got ${items.length}`);
  }

  console.log(`[viewer-data] loaded data bundle from ${data.source_path}`);

  const collectionItems = [];
  const started = Date.now();

  for (let i = 0; i < items.length; i++) {
    const tokenId = i + 1;
    const manifestItem = items[i];

    if (manifestItem.token_id !== tokenId) {
      throw new Error(`manifest token order mismatch at index ${i}: token_id=${manifestItem.token_id}`);
    }

    const rec = decodeTokenRecord(data.tokenRecords, tokenId);
    const decodedTraits = traitNamesFromRecord(rec);
    ensureAttrEqual(
      [
        { trait_type: "Pattern", value: decodedTraits.Pattern },
        { trait_type: "Color Variation", value: decodedTraits["Color Variation"] },
        { trait_type: "Collar", value: decodedTraits.Collar },
        { trait_type: "Rarity Tier", value: decodedTraits["Rarity Tier"] },
        { trait_type: "Rarity Type", value: decodedTraits["Rarity Type"] },
      ],
      manifestItem.attributes,
      tokenId,
    );

    const svg = buildSvg(data, rec);
    const imageSvgFile = opts.emitSvgFiles ? `${String(tokenId).padStart(4, "0")}.svg` : null;
    const imageSvgPublicPath = imageSvgFile ? `/viewer_v1/svg/${imageSvgFile}` : null;
    const imagePngFile = `${String(tokenId).padStart(4, "0")}.png`;
    const imagePngPublicPath = `/viewer_v1/png/${imagePngFile}`;
    const imagePngWhitePublicPath = `/viewer_v1/png-white/${imagePngFile}`;
    if (imageSvgFile) {
      fs.writeFileSync(path.join(publicSvgDir, imageSvgFile), svg);
    }

    const itemDoc = {
      token_id: tokenId,
      name: `CoreCats #${tokenId}`,
      description: "CoreCats fully on-chain 24x24 SVG.",
      image_src: imageSvgPublicPath,
      image_svg_src: imageSvgPublicPath,
      image_svg_file: imageSvgFile ? normalizeRel(root, path.join(publicSvgDir, imageSvgFile)) : null,
      image_preview_src: imagePngPublicPath,
      image_preview_file: normalizeRel(root, path.join(publicPngDir, imagePngFile)),
      image_preview_white_src: imagePngWhitePublicPath,
      image_preview_white_file: normalizeRel(root, path.join(publicPngWhiteDir, imagePngFile)),
      trait_values: buildTraitValues(manifestItem),
      color_tuple: manifestItem.color_tuple ?? null,
      slots: manifestItem.slots ?? null,
      attributes: manifestItem.attributes,
      display_attributes: buildDisplayAttributes(manifestItem.attributes, labelsDoc),
      integrity: {
        variant_key: manifestItem.variant_key,
        final_png_24_sha256: manifestItem.final_png_24_sha256,
      },
    };

    if (opts.embedDataUri) {
      itemDoc.image_data_uri = buildImageDataUri(svg);
    }

    collectionItems.push(itemDoc);

    if (tokenId % 100 === 0) {
      const sec = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[viewer-data] generated ${tokenId}/1000 (${sec}s)`);
    }
  }

  const collectionDoc = {
    version: "viewer_collection_v1",
    generated_at: new Date().toISOString(),
    source_manifest: "manifests/final_1000_manifest_v1.json",
    source_trait_labels: "manifests/trait_display_labels_v1.json",
    source_onchain_data: data.source_path,
    renderer_mode: "pure-js-port-of-foxar-renderer",
    total: collectionItems.length,
    items: collectionItems,
  };

  const filtersDoc = buildFilterDoc(collectionItems, labelsDoc, summaryDoc, root, outDir);
  const summaryViewDoc = buildSummaryDoc(summaryDoc, root, outDir);
  const collectionIndexDoc = buildCollectionIndexDoc(collectionItems, root, outDir);
  const detailIndexDoc = buildDetailIndexDoc(collectionItems, root, outDir);

  fs.writeFileSync(path.join(outDir, "collection.json"), JSON.stringify(collectionDoc, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "filters.json"), JSON.stringify(filtersDoc, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summaryViewDoc, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "detail-index.json"), JSON.stringify(detailIndexDoc, null, 2) + "\n");
  fs.writeFileSync(publicCollectionIndexPath, JSON.stringify(collectionIndexDoc, null, 2) + "\n");

  console.log(`[viewer-data] PASS: wrote ${normalizeRel(root, path.join(outDir, "collection.json"))}`);
  console.log(`[viewer-data] PASS: wrote ${normalizeRel(root, path.join(outDir, "filters.json"))}`);
  console.log(`[viewer-data] PASS: wrote ${normalizeRel(root, path.join(outDir, "summary.json"))}`);
  console.log(`[viewer-data] PASS: wrote ${normalizeRel(root, path.join(outDir, "detail-index.json"))}`);
  console.log(`[viewer-data] PASS: wrote ${normalizeRel(root, publicCollectionIndexPath)}`);
  if (opts.emitSvgFiles) {
    console.log(`[viewer-data] PASS: wrote SVG previews to ${normalizeRel(root, publicSvgDir)}`);
  }
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
