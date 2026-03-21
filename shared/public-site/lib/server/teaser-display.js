export function isTeaserDisplayEnabled(value) {
  const launchState =
    typeof value === "string" ? value : typeof value?.launchState === "string" ? value.launchState : "";
  return launchState !== "public";
}

export function sanitizeTeaserSearchParams(searchParams = {}, teaserEnabled = false) {
  return searchParams;
}

export function applyTeaserPresentationToItem(item, teaserEnabled = false) {
  return item;
}

export function applyTeaserPresentationToCollection(collection, teaserEnabled = false) {
  return collection;
}

export function applyTeaserPresentationToFilters(filtersDoc, teaserEnabled = false) {
  return filtersDoc;
}
