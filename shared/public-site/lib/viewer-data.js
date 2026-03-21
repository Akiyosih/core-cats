import fs from "node:fs/promises";
import path from "node:path";
import {
  applyCollectionFilters,
  buildSearchHref,
  FILTER_KEYS,
  normalizeFilterState,
  paginateItems,
  sortCollection,
} from "./collection-utils";
import {
  applyTeaserPresentationToCollection,
  applyTeaserPresentationToItem,
  applyTeaserPresentationToFilters,
  sanitizeTeaserSearchParams,
} from "./server/teaser-display.js";

export { sanitizeTeaserSearchParams } from "./server/teaser-display.js";
export {
  applyCollectionFilters,
  buildSearchHref,
  FILTER_KEYS,
  normalizeFilterState,
  paginateItems,
  sortCollection,
} from "./collection-utils";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const VIEWER_DIR = path.join(ROOT_DIR, "manifests", "viewer_v3");
const jsonPromiseCache = new Map();

async function readJson(fileName) {
  if (jsonPromiseCache.has(fileName)) {
    return jsonPromiseCache.get(fileName);
  }

  const filePath = path.join(VIEWER_DIR, fileName);
  const loadPromise = fs.readFile(filePath, "utf8").then((text) => JSON.parse(text));
  jsonPromiseCache.set(fileName, loadPromise);
  return loadPromise;
}

export async function getCollection(teaserEnabled = false) {
  return applyTeaserPresentationToCollection(await readJson("collection.json"), teaserEnabled);
}

export async function getFilters(teaserEnabled = false) {
  return applyTeaserPresentationToFilters(await readJson("filters.json"), teaserEnabled);
}

export async function getSummary() {
  return readJson("summary.json");
}

export async function getCollectionItem(tokenId, teaserEnabled = false) {
  const detailIndex = await readJson("detail-index.json");
  const item = detailIndex.items[tokenId - 1];
  return item?.token_id === tokenId ? applyTeaserPresentationToItem(item, teaserEnabled) : null;
}
