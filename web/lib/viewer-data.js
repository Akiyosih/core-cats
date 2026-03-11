import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
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

async function readJson(fileName) {
  const filePath = path.join(VIEWER_DIR, fileName);
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

export const getCollection = cache(async () => applyTeaserPresentationToCollection(await readJson("collection.json")));
export const getFilters = cache(async () => applyTeaserPresentationToFilters(await readJson("filters.json")));
export const getSummary = cache(async () => readJson("summary.json"));

export async function getCollectionItem(tokenId) {
  const collection = await getCollection();
  return collection.items.find((item) => item.token_id === tokenId) || null;
}
