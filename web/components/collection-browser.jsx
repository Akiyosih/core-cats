"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

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
import { usePublicStatusSnapshot } from "../lib/public-status-client";

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
const MINT_STATE_OPTIONS = [
  { id: "minted", label: "Minted" },
  { id: "unminted", label: "Unminted" },
];

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
  const superrareValue = paletteMap.get("superrare") || { id: "superrare", label: "Super Rare", count: 0 };
  const superrareHref = buildSearchHref(searchParams, {
    category: null,
    palette_id: activePalette === "superrare" ? null : "superrare",
    page: null,
  }, teaserEnabled);

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
        <div className="filter-subgroup filter-subgroup--standalone">
          <p className="filter-subgroup__label">Standalone palette</p>
          <FilterChip
            href={superrareHref}
            active={activePalette === "superrare"}
            empty={(superrareValue.count ?? 0) === 0}
            label="Super Rare"
            count={superrareValue.count ?? 0}
          />
        </div>
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

function Pagination({ page, totalPages, searchParams, teaserEnabled }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const nearCurrent = [page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages);
  const anchors = new Set([1, totalPages, ...nearCurrent]);
  const orderedPages = Array.from(anchors).sort((left, right) => left - right);
  let previousPage = null;

  for (const pageNumber of orderedPages) {
    if (previousPage && pageNumber - previousPage > 1) {
      pages.push({ type: "ellipsis", key: `ellipsis-${previousPage}-${pageNumber}` });
    }
    pages.push({ type: "page", value: pageNumber, key: `page-${pageNumber}` });
    previousPage = pageNumber;
  }

  return (
    <nav className="pagination" aria-label="Collection pages">
      {pages.map((entry) => {
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

function MintStateBlock({ searchParams, activeValue, counts, teaserEnabled }) {
  return (
    <section className="filter-block">
      <h2>Mint Status</h2>
      <div className="chip-wrap">
        {MINT_STATE_OPTIONS.map((option) => {
          const href = buildSearchHref(searchParams, {
            mint_state: activeValue === option.id ? null : option.id,
            page: null,
          }, teaserEnabled);
          const count = counts[option.id] || 0;

          return (
            <FilterChip
              key={`mint-${option.id}`}
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

function applyMintStateFilter(items, statusSnapshot, mintState) {
  if (!statusSnapshot || !mintState) return items;
  return items.filter((item) => {
    if (mintState === "minted") return Boolean(statusSnapshot.byToken?.[String(item.token_id)]?.minted);
    if (mintState === "unminted") return !statusSnapshot.byToken?.[String(item.token_id)]?.minted;
    return true;
  });
}

export default function CollectionBrowser({ collection, filtersDoc, teaserEnabled, statusSnapshotUrl }) {
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const params = sanitizeTeaserSearchParams(searchParamsToObject(searchParams), teaserEnabled);
  const { snapshot: statusSnapshot, error: snapshotError } = usePublicStatusSnapshot(statusSnapshotUrl);
  const activeFilters = normalizeFilterState(params, teaserEnabled);
  const mintState = Array.isArray(params.mint_state) ? String(params.mint_state[0] || "") : String(params.mint_state || "");
  const baseFiltered = applyCollectionFilters(collection.items, params, { teaserEnabled });
  const mintStateCounts = statusSnapshot ? {
    minted: baseFiltered.filter((item) => Boolean(statusSnapshot.byToken?.[String(item.token_id)]?.minted)).length,
    unminted: baseFiltered.filter((item) => !statusSnapshot.byToken?.[String(item.token_id)]?.minted).length,
  } : { minted: 0, unminted: 0 };
  const filtered = applyMintStateFilter(baseFiltered, statusSnapshot, mintState);
  const sorted = sortCollection(filtered, params.sort);
  const resultsCount = filtered.length;
  const pagination = paginateItems(sorted, Number(params.page || 1), PAGE_SIZE);
  const waitingForMintStatus = Boolean(mintState && statusSnapshotUrl && !statusSnapshot && !snapshotError);
  const contextualFilters = {};
  const returnTo = buildSearchHref(params, {}, teaserEnabled);

  for (const filterKey of FILTER_KEYS) {
    const baseItems = applyCollectionFilters(collection.items, activeFilters, { excludeKeys: [filterKey], teaserEnabled });
    const contextualBaseItems = applyMintStateFilter(baseItems, statusSnapshot, mintState);
    const counts = buildFacetCounts(contextualBaseItems, filterKey);
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
          <button
            type="button"
            className="button button--ghost button--inline collection-filter-toggle"
            aria-expanded={mobileFiltersOpen}
            aria-controls="collection-filter-stack"
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            {mobileFiltersOpen ? "Hide filters" : "Show filters"}
          </button>
          {statusSnapshotUrl ? (
            <p className="mint-meta">
              Live ownership badges and Mint Status filters follow a short public snapshot interval.
            </p>
          ) : null}
          {snapshotError ? (
            <p className="mint-warning mint-warning--soft">
              Live minted status is temporarily unavailable. Trait browsing still works.
            </p>
          ) : null}
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
          {statusSnapshot ? (
            <MintStateBlock searchParams={params} activeValue={mintState || null} counts={mintStateCounts} teaserEnabled={teaserEnabled} />
          ) : null}
          <FilterBlock title="Tier" filterKey="rarity_tier" values={contextualFilters.rarity_tier.values} searchParams={params} activeValue={activeFilters.rarity_tier} teaserEnabled={teaserEnabled} />
          <FilterBlock title="Special Trait" filterKey="rarity_type" values={contextualFilters.rarity_type.values} searchParams={params} activeValue={activeFilters.rarity_type} teaserEnabled={teaserEnabled} />
        </div>
      </aside>

      <section className="results-column">
        <div className="results-header">
          <div>
            <p className="eyebrow">Results</p>
            <h2>
              {waitingForMintStatus ? "Loading mint status..." : `${resultsCount} cats match this view.`}
            </h2>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} teaserEnabled={teaserEnabled} />
        </div>

        {waitingForMintStatus ? (
          <article className="copy-card my-cats-card">
            <h2>Loading live mint status...</h2>
            <p>Minted and unminted filters appear after the latest public snapshot loads.</p>
          </article>
        ) : (
          <>
            <div className="card-grid">
              {pagination.items.map((item) => (
                <CollectionCard
                  key={item.token_id}
                  item={{
                    ...item,
                    mint_status: statusSnapshot?.byToken?.[String(item.token_id)] || null,
                  }}
                  detailHref={`/cats/${item.token_id}?from=${encodeURIComponent(returnTo)}`}
                />
              ))}
            </div>

            <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} teaserEnabled={teaserEnabled} />
          </>
        )}
      </section>
    </div>
  );
}
