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
const VIEWER_DIR = path.join(ROOT_DIR, "manifests", "viewer_v1");
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

export async function getCollection() {
  return applyTeaserPresentationToCollection(await readJson("collection.json"));
}

export async function getFilters() {
  return applyTeaserPresentationToFilters(await readJson("filters.json"));
}

export async function getSummary() {
  return readJson("summary.json");
}

export async function getCollectionItem(tokenId) {
  const detailIndex = await readJson("detail-index.json");
  const item = detailIndex.items[tokenId - 1];
  return item?.token_id === tokenId ? applyTeaserPresentationToItem(item) : null;
}
