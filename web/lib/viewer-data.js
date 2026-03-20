import {
  FILTER_KEYS,
  applyCollectionFilters,
  buildSearchHref,
  getCollection as getSharedCollection,
  getCollectionItem as getSharedCollectionItem,
  getFilters as getSharedFilters,
  getSummary,
  normalizeFilterState,
  paginateItems,
  sanitizeTeaserSearchParams,
  sortCollection,
} from "../../shared/public-site/lib/viewer-data.js";
import { getCorePublicConfig } from "./server/core-env.js";

export {
  FILTER_KEYS,
  applyCollectionFilters,
  buildSearchHref,
  getSummary,
  normalizeFilterState,
  paginateItems,
  sanitizeTeaserSearchParams,
  sortCollection,
};

function teaserEnabled() {
  return getCorePublicConfig().launchState !== "public";
}

export async function getCollection() {
  return getSharedCollection(teaserEnabled());
}

export async function getFilters() {
  return getSharedFilters(teaserEnabled());
}

export async function getCollectionItem(tokenId) {
  return getSharedCollectionItem(tokenId, teaserEnabled());
}
