"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import CollectionCard from "./collection-card";
import {
  applyCollectionFilters,
  buildSearchHref,
  FILTER_KEYS,
  normalizeFilterState,
  paginateItems,
  sanitizeTeaserSearchParams,
  sortCollection,
} from "../lib/collection-utils";

const PAGE_SIZE = 30;
const NATURAL_COLORWAYS = [
  "black_solid",
  "black_white",
  "ivory_brown",
  "gray_soft",
  "orange_white",
  "orange_warm",
  "tricolor_soft",
  "earth_tone",
];
const SPECIAL_COLORWAYS = [
  "cyberpunk",
  "psychedelic",
  "tropical_fever",
  "zombie",
  "space_nebula",
];
const COLORWAY_GROUPS = [
  { id: "natural", label: "Natural", values: NATURAL_COLORWAYS },
  { id: "special", label: "Special", values: SPECIAL_COLORWAYS },
];
const DERIVED_COLLAR_OPTIONS = [
  { id: "none", label: "No Collar" },
  { id: "any_collar", label: "Any Collar" },
  { id: "checkered_collar", label: "Checkered Collar" },
  { id: "classic_red_collar", label: "Classic Red Collar" },
];

function parseTokenIdValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function buildFacetCounts(items, filterKey) {
  const counts = new Map();
  for (const item of items) {
    const value = item.trait_values[filterKey];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function searchParamsToObject(searchParams) {
  const params = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

function FilterChip({ href, active, empty, label, count }) {
  return (
    <Link
      href={href}
      className={`filter-chip ${active ? "filter-chip--active" : ""} ${empty ? "filter-chip--empty" : ""}`}
    >
      <span>{label}</span>
      <small>{count}</small>
    </Link>
  );
}

function FilterBlock({ title, filterKey, values, searchParams, activeValue, teaserEnabled }) {
  return (
    <section className="filter-block">
      <h2>{title}</h2>
      <div className="chip-wrap">
        {values.map((value) => {
          const href = buildSearchHref(searchParams, {
            [filterKey]: activeValue === value.id ? null : value.id,
            page: null,
          }, teaserEnabled);
          const count = value.count ?? 0;

          return (
            <FilterChip
              key={`${filterKey}-${value.id}`}
              href={href}
              active={activeValue === value.id}
              empty={count === 0}
              label={value.label}
              count={count}
            />
          );
        })}
      </div>
    </section>
  );
}

function GroupedColorwayBlock({ paletteValues, categoryValues, searchParams, activeCategory, activePalette, teaserEnabled }) {
  const paletteMap = new Map(paletteValues.map((value) => [value.id, value]));
  const categoryMap = new Map(categoryValues.map((value) => [value.id, value]));

  return (
    <section className="filter-block">
      <h2>Colorway</h2>
      <p className="filter-block__hint">Choose a broad family or drill into a specific palette.</p>
      <div className="filter-group-stack">
        {COLORWAY_GROUPS.map((group) => {
          const groupCount = categoryMap.get(group.id)?.count ?? 0;
          const groupActive = activeCategory === group.id || (!activeCategory && group.values.includes(activePalette));
          const groupHref = buildSearchHref(searchParams, {
            category: activeCategory === group.id && !activePalette ? null : group.id,
            palette_id: null,
            page: null,
          }, teaserEnabled);

          return (
            <div key={group.id} className="filter-subgroup">
              <FilterChip
                href={groupHref}
                active={groupActive}
                empty={groupCount === 0}
                label={group.label}
                count={groupCount}
              />
              <div className="filter-subgroup__nested">
                <p className="filter-subgroup__label">Specific {group.label.toLowerCase()} palettes</p>
                <div className="chip-wrap chip-wrap--nested">
                  {group.values.map((valueId) => {
                    const value = paletteMap.get(valueId) || { id: valueId, label: valueId, count: 0 };
                    const href = buildSearchHref(searchParams, {
                      category: null,
                      palette_id: activePalette === value.id ? null : value.id,
                      page: null,
                    }, teaserEnabled);

                    return (
                      <FilterChip
                        key={`palette-${value.id}`}
                        href={href}
                        active={activePalette === value.id}
                        empty={(value.count ?? 0) === 0}
                        label={value.label}
                        count={value.count ?? 0}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DerivedCollarBlock({ searchParams, activeValue, contextualValues, teaserEnabled }) {
  const counts = new Map(contextualValues.map((value) => [value.id, value.count ?? 0]));

  return (
    <section className="filter-block">
      <h2>Collar</h2>
      <div className="chip-wrap">
        {DERIVED_COLLAR_OPTIONS.map((option) => {
          const count = option.id === "any_collar"
            ? (counts.get("checkered_collar") || 0) + (counts.get("classic_red_collar") || 0)
            : (counts.get(option.id) || 0);
          const href = buildSearchHref(searchParams, {
            collar: activeValue === option.id ? null : option.id,
            page: null,
          }, teaserEnabled);

          return (
            <FilterChip
              key={`collar-${option.id}`}
              href={href}
              active={activeValue === option.id}
              empty={count === 0}
              label={option.label}
              count={count}
            />
          );
        })}
      </div>
    </section>
  );
}

function buildPaginationEntries(page, totalPages, density) {
  const pages = [];
  const nearCurrent = density === "desktop"
    ? [page - 2, page - 1, page, page + 1, page + 2]
    : [page - 1, page, page + 1];
  const edgePages = density === "desktop" ? [1, 2, totalPages - 1, totalPages] : [1, totalPages];
  const anchors = new Set(
    [...edgePages, ...nearCurrent].filter((value) => value >= 1 && value <= totalPages),
  );
  const orderedPages = Array.from(anchors).sort((left, right) => left - right);
  let previousPage = null;

  for (const pageNumber of orderedPages) {
    if (previousPage && pageNumber - previousPage > 1) {
      pages.push({ type: "ellipsis", key: `ellipsis-${previousPage}-${pageNumber}` });
    }
    pages.push({ type: "page", value: pageNumber, key: `page-${pageNumber}` });
    previousPage = pageNumber;
  }

  return pages;
}

function PaginationNav({ className, entries, page, searchParams, teaserEnabled }) {
  return (
    <nav className={`pagination ${className}`} aria-label="Collection pages">
      {entries.map((entry) => {
        if (entry.type === "ellipsis") {
          return (
            <span key={entry.key} className="page-ellipsis" aria-hidden="true">
              …
            </span>
          );
        }

        const pageNumber = entry.value;
        return (
          <Link
            key={entry.key}
            href={buildSearchHref(searchParams, { page: pageNumber }, teaserEnabled)}
            className={`page-pill ${page === pageNumber ? "page-pill--active" : ""}`}
            aria-current={page === pageNumber ? "page" : undefined}
          >
            {pageNumber}
          </Link>
        );
      })}
    </nav>
  );
}

function Pagination({ page, totalPages, searchParams, teaserEnabled }) {
  if (totalPages <= 1) return null;

  const desktopPages = buildPaginationEntries(page, totalPages, "desktop");
  const mobilePages = buildPaginationEntries(page, totalPages, "mobile");

  return (
    <>
      <PaginationNav
        className="pagination--desktop"
        entries={desktopPages}
        page={page}
        searchParams={searchParams}
        teaserEnabled={teaserEnabled}
      />
      <PaginationNav
        className="pagination--mobile"
        entries={mobilePages}
        page={page}
        searchParams={searchParams}
        teaserEnabled={teaserEnabled}
      />
    </>
  );
}

export default function CollectionBrowser({ collection, filtersDoc, teaserEnabled }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const params = sanitizeTeaserSearchParams(searchParamsToObject(searchParams), teaserEnabled);
  const [tokenSearchValue, setTokenSearchValue] = useState(params.token_id || "");
  const activeFilters = normalizeFilterState(params, teaserEnabled);
  const baseFiltered = applyCollectionFilters(collection.items, params, { teaserEnabled });
  const exactTokenId = parseTokenIdValue(params.token_id);
  const filtered = exactTokenId
    ? baseFiltered.filter((item) => item.token_id === exactTokenId)
    : baseFiltered;
  const sorted = sortCollection(filtered, params.sort);
  const resultsCount = filtered.length;
  const pagination = paginateItems(sorted, Number(params.page || 1), PAGE_SIZE);
  const contextualFilters = {};
  const returnTo = buildSearchHref(params, {}, teaserEnabled);

  useEffect(() => {
    setTokenSearchValue(params.token_id || "");
  }, [params.token_id]);

  function handleTokenSearchSubmit(event) {
    event.preventDefault();
    const tokenId = parseTokenIdValue(tokenSearchValue);
    router.push(buildSearchHref(params, { token_id: tokenId, page: null }, teaserEnabled));
  }

  for (const filterKey of FILTER_KEYS) {
    const baseItems = applyCollectionFilters(collection.items, activeFilters, { excludeKeys: [filterKey], teaserEnabled });
    const counts = buildFacetCounts(baseItems, filterKey);
    contextualFilters[filterKey] = {
      ...filtersDoc.filters[filterKey],
      values: filtersDoc.filters[filterKey].values.map((value) => ({
        ...value,
        count: counts.get(value.id) || 0,
      })),
    };
  }

  return (
    <div className="collection-layout">
      <aside className="filter-column">
        <div className="filter-card">
          <p className="eyebrow">Browse the collection</p>
          <h1>Browse the 1,000 finalized cats.</h1>
          <p>
            Filter by coat pattern, colorway, collar, and rarity to move through the finalized set from different
            angles.
          </p>
          <div className="sort-row">
            <Link
              href={buildSearchHref(params, { sort: null, page: null }, teaserEnabled)}
              className={`sort-pill ${!params.sort ? "sort-pill--active" : ""}`}
            >
              Token ID
            </Link>
            <Link
              href={buildSearchHref(params, { sort: "rarity", page: null }, teaserEnabled)}
              className={`sort-pill ${params.sort === "rarity" ? "sort-pill--active" : ""}`}
            >
              Rarity
            </Link>
            <Link href="/collection" className="sort-pill">
              Clear all
            </Link>
          </div>
          <form className="collection-token-search" onSubmit={handleTokenSearchSubmit}>
            <label className="collection-token-search__label" htmlFor="collection-token-id">
              Find an exact token ID
            </label>
            <div className="collection-token-search__row">
              <input
                id="collection-token-id"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 267"
                value={tokenSearchValue}
                onChange={(event) => setTokenSearchValue(event.target.value)}
                className="collection-token-search__input"
              />
              <button type="submit" className="button button--ghost button--inline collection-token-search__submit">
                Go
              </button>
            </div>
            {params.token_id ? (
              <div className="collection-token-search__actions">
                <Link
                  href={buildSearchHref(params, { token_id: null, page: null }, teaserEnabled)}
                  className="button button--ghost button--inline"
                >
                  Clear token search
                </Link>
              </div>
            ) : null}
          </form>
          <button
            type="button"
            className="button button--ghost button--inline collection-filter-toggle"
            aria-expanded={mobileFiltersOpen}
            aria-controls="collection-filter-stack"
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            {mobileFiltersOpen ? "Hide filters" : "Show filters"}
          </button>
        </div>
        <div
          id="collection-filter-stack"
          className={`filter-stack ${mobileFiltersOpen ? "filter-stack--open" : ""}`}
        >
          <FilterBlock title="Coat Pattern" filterKey="pattern" values={contextualFilters.pattern.values} searchParams={params} activeValue={activeFilters.pattern} teaserEnabled={teaserEnabled} />
          <GroupedColorwayBlock
            paletteValues={contextualFilters.palette_id.values}
            categoryValues={contextualFilters.category.values}
            searchParams={params}
            activeCategory={activeFilters.category}
            activePalette={activeFilters.palette_id}
            teaserEnabled={teaserEnabled}
          />
          <DerivedCollarBlock
            searchParams={params}
            activeValue={activeFilters.collar}
            contextualValues={contextualFilters.collar.values}
            teaserEnabled={teaserEnabled}
          />
          <FilterBlock title="Tier" filterKey="rarity_tier" values={contextualFilters.rarity_tier.values} searchParams={params} activeValue={activeFilters.rarity_tier} teaserEnabled={teaserEnabled} />
          <FilterBlock title="Special Trait" filterKey="rarity_type" values={contextualFilters.rarity_type.values} searchParams={params} activeValue={activeFilters.rarity_type} teaserEnabled={teaserEnabled} />
        </div>
      </aside>

      <section className="results-column">
        <div className="results-header">
          <div>
            <p className="eyebrow">Results</p>
            <h2>{`${resultsCount} cats match this view.`}</h2>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} teaserEnabled={teaserEnabled} />
        </div>
        <>
          <div className="card-grid">
            {pagination.items.map((item) => (
              <CollectionCard
                key={item.token_id}
                item={item}
                detailHref={`/cats/${item.token_id}?from=${encodeURIComponent(returnTo)}`}
              />
            ))}
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} teaserEnabled={teaserEnabled} />
        </>
      </section>
    </div>
  );
}
