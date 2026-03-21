export const FILTER_KEYS = ["pattern", "category", "palette_id", "collar", "rarity_tier", "rarity_type"];

function normalizeSingleValue(value) {
  if (!value) return null;
  const raw = Array.isArray(value) ? String(value[0] || "") : String(value);
  const first = raw.split(",").find(Boolean);
  return first || null;
}

export function sanitizeTeaserSearchParams(searchParams = {}, teaserEnabled = false) {
  return searchParams;
}

export function normalizeFilterState(searchParams = {}, teaserEnabled = false) {
  const params = sanitizeTeaserSearchParams(searchParams, teaserEnabled);
  const legacyCollarType = normalizeSingleValue(params.collar_type);
  let collar = normalizeSingleValue(params.collar);
  if (!collar && legacyCollarType) {
    collar = legacyCollarType;
  }
  if (collar === "with_collar") {
    collar = "any_collar";
  } else if (collar === "without_collar") {
    collar = "none";
  }

  return {
    pattern: normalizeSingleValue(params.pattern),
    category: normalizeSingleValue(params.category),
    palette_id: normalizeSingleValue(params.palette_id),
    collar,
    rarity_tier: normalizeSingleValue(params.rarity_tier),
    rarity_type: normalizeSingleValue(params.rarity_type),
  };
}

export function applyCollectionFilters(items, searchParams, options = {}) {
  const active = normalizeFilterState(searchParams, options.teaserEnabled);
  const excludeKeys = new Set(options.excludeKeys || []);

  return items.filter((item) => Object.entries(active).every(([key, value]) => {
    if (excludeKeys.has(key) || value == null) {
      return true;
    }
    if (key === "collar") {
      if (value === "any_collar") {
        return item.trait_values.collar !== "none";
      }
      return item.trait_values.collar === value;
    }
    return item.trait_values[key] === value;
  }));
}

export function sortCollection(items, sortKey) {
  const sorted = [...items];

  if (sortKey === "rarity") {
    const tierRank = { superrare: 0, rare: 1, common: 2 };
    sorted.sort((a, b) => {
      const tierDiff = (tierRank[a.trait_values.rarity_tier] ?? 9) - (tierRank[b.trait_values.rarity_tier] ?? 9);
      if (tierDiff !== 0) return tierDiff;
      return a.token_id - b.token_id;
    });
    return sorted;
  }

  sorted.sort((a, b) => a.token_id - b.token_id);
  return sorted;
}

export function paginateItems(items, page, pageSize) {
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    pageSize,
    totalItems: items.length,
    items: items.slice(start, start + pageSize),
  };
}

export function buildSearchHref(params, overrides = {}, teaserEnabled = false) {
  const next = new URLSearchParams();
  const merged = { ...sanitizeTeaserSearchParams(params, teaserEnabled), ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    next.set(key, Array.isArray(value) ? String(value[0]) : String(value));
  }

  const query = next.toString();
  return query ? `/collection?${query}` : "/collection";
}

export function isCoreAddress(value) {
  return /^(ab|cb)[0-9a-f]{42}$/i.test(String(value || "").trim());
}
