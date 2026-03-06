import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const VIEWER_DIR = path.join(ROOT_DIR, "manifests", "viewer_v1");

async function readJson(fileName) {
  const filePath = path.join(VIEWER_DIR, fileName);
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

export const getCollection = cache(async () => readJson("collection.json"));
export const getFilters = cache(async () => readJson("filters.json"));
export const getSummary = cache(async () => readJson("summary.json"));

export async function getCollectionItem(tokenId) {
  const collection = await getCollection();
  return collection.items.find((item) => item.token_id === tokenId) || null;
}

function normalizeMultiValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => String(entry).split(",")).filter(Boolean);
  return String(value).split(",").filter(Boolean);
}

export function applyCollectionFilters(items, searchParams) {
  const active = {
    pattern: normalizeMultiValue(searchParams.pattern),
    palette_id: normalizeMultiValue(searchParams.palette_id),
    category: normalizeMultiValue(searchParams.category),
    collar: normalizeMultiValue(searchParams.collar),
    collar_type: normalizeMultiValue(searchParams.collar_type),
    rarity_tier: normalizeMultiValue(searchParams.rarity_tier),
    rarity_type: normalizeMultiValue(searchParams.rarity_type),
  };

  return items.filter((item) =>
    Object.entries(active).every(([key, values]) => values.length === 0 || values.includes(item.trait_values[key])),
  );
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

export function buildSearchHref(params, overrides = {}) {
  const next = new URLSearchParams();
  const merged = { ...params, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    next.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const query = next.toString();
  return query ? `/collection?${query}` : "/collection";
}
