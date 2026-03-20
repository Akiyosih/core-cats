import {
  applyTeaserPresentationToCollection as applySharedCollection,
  applyTeaserPresentationToFilters as applySharedFilters,
  applyTeaserPresentationToItem as applySharedItem,
  isTeaserDisplayEnabled as sharedIsTeaserDisplayEnabled,
  sanitizeTeaserSearchParams as sharedSanitizeTeaserSearchParams,
} from "../../../shared/public-site/lib/server/teaser-display.js";
import { getCorePublicConfig } from "./core-env.js";

function teaserEnabled() {
  return sharedIsTeaserDisplayEnabled(getCorePublicConfig());
}

export function isTeaserDisplayEnabled() {
  return teaserEnabled();
}

export function sanitizeTeaserSearchParams(searchParams = {}) {
  return sharedSanitizeTeaserSearchParams(searchParams, teaserEnabled());
}

export function applyTeaserPresentationToItem(item) {
  return applySharedItem(item, teaserEnabled());
}

export function applyTeaserPresentationToCollection(collection) {
  return applySharedCollection(collection, teaserEnabled());
}

export function applyTeaserPresentationToFilters(filtersDoc) {
  return applySharedFilters(filtersDoc, teaserEnabled());
}
