const HIDDEN_SUPERRARE_TYPES = new Set(["corelogo", "pinglogo"]);

const TEASER_SUPERRARE_PRESENTATION = {
  999: {
    displayName: "Super Rare I",
    description: "Reserved placeholder shown before the official public release stage.",
    previewPng: "/teaser/super-rare-i.png",
    previewSvg: "/teaser/super-rare-i.svg",
    rarityTypeLabel: "Super Rare I",
  },
  1000: {
    displayName: "Super Rare II",
    description: "Reserved placeholder shown before the official public release stage.",
    previewPng: "/teaser/super-rare-ii.png",
    previewSvg: "/teaser/super-rare-ii.svg",
    rarityTypeLabel: "Super Rare II",
  },
};

export function isTeaserDisplayEnabled(value) {
  const launchState =
    typeof value === "string" ? value : typeof value?.launchState === "string" ? value.launchState : "";
  return launchState !== "public";
}

export function sanitizeTeaserSearchParams(searchParams = {}, teaserEnabled = false) {
  if (!teaserEnabled) {
    return searchParams;
  }

  const sanitized = { ...searchParams };
  const rawRarityType = Array.isArray(sanitized.rarity_type)
    ? String(sanitized.rarity_type[0] || "")
    : String(sanitized.rarity_type || "");

  if (HIDDEN_SUPERRARE_TYPES.has(rawRarityType)) {
    delete sanitized.rarity_type;
  }

  return sanitized;
}

function presentSuperrareItem(item, presentation) {
  if (!item || !presentation) {
    return item;
  }

  return {
    ...item,
    name: presentation.displayName,
    description: presentation.description,
    image_preview_src: presentation.previewPng,
    image_svg_src: presentation.previewSvg,
    image_src: presentation.previewSvg,
    teaser_placeholder: true,
    display_attributes: item.display_attributes.map((attr) => {
      if (attr.trait_type_id !== "Rarity Type") {
        return attr;
      }

      return {
        ...attr,
        value_label: presentation.rarityTypeLabel,
      };
    }),
  };
}

export function applyTeaserPresentationToItem(item, teaserEnabled = false) {
  if (!teaserEnabled) {
    return item;
  }

  return presentSuperrareItem(item, TEASER_SUPERRARE_PRESENTATION[item?.token_id]);
}

export function applyTeaserPresentationToCollection(collection, teaserEnabled = false) {
  if (!teaserEnabled) {
    return collection;
  }

  return {
    ...collection,
    items: collection.items.map((item) => applyTeaserPresentationToItem(item, teaserEnabled)),
  };
}

export function applyTeaserPresentationToFilters(filtersDoc, teaserEnabled = false) {
  if (!teaserEnabled) {
    return filtersDoc;
  }

  const rarityTypeFilter = filtersDoc.filters?.rarity_type;
  if (!rarityTypeFilter) {
    return filtersDoc;
  }

  return {
    ...filtersDoc,
    filters: {
      ...filtersDoc.filters,
      rarity_type: {
        ...rarityTypeFilter,
        values: rarityTypeFilter.values.filter((value) => !HIDDEN_SUPERRARE_TYPES.has(value.id)),
      },
    },
  };
}
