import Link from "next/link";
import CollectionCard from "../../components/collection-card";
import {
  applyCollectionFilters,
  buildSearchHref,
  FILTER_KEYS,
  getCollection,
  getFilters,
  normalizeFilterState,
  paginateItems,
  sanitizeTeaserSearchParams,
  sortCollection,
} from "../../lib/viewer-data";
import { attachStatusToItem, getStatusSnapshot } from "../../lib/server/corecats-status";

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

export const dynamic = "force-dynamic";

function buildFacetCounts(items, filterKey) {
  const counts = new Map();
  for (const item of items) {
    const value = item.trait_values[filterKey];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
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

function FilterBlock({ title, filterKey, values, searchParams, activeValue }) {
  return (
    <section className="filter-block">
      <h2>{title}</h2>
      <div className="chip-wrap">
        {values.map((value) => {
          const href = buildSearchHref(searchParams, {
            [filterKey]: activeValue === value.id ? null : value.id,
            page: null,
          });
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

function GroupedColorwayBlock({ paletteValues, categoryValues, searchParams, activeCategory, activePalette }) {
  const paletteMap = new Map(paletteValues.map((value) => [value.id, value]));
  const categoryMap = new Map(categoryValues.map((value) => [value.id, value]));
  const superrareValue = paletteMap.get("superrare") || { id: "superrare", label: "Super Rare", count: 0 };
  const superrareHref = buildSearchHref(searchParams, {
    category: null,
    palette_id: activePalette === "superrare" ? null : "superrare",
    page: null,
  });

  return (
    <section className="filter-block">
      <h2>Colorway</h2>
      <div className="filter-group-stack">
        {COLORWAY_GROUPS.map((group) => {
          const groupCount = categoryMap.get(group.id)?.count ?? 0;
          const groupActive = activeCategory === group.id || (!activeCategory && group.values.includes(activePalette));
          const groupHref = buildSearchHref(searchParams, {
            category: activeCategory === group.id && !activePalette ? null : group.id,
            palette_id: null,
            page: null,
          });

          return (
            <div key={group.id} className="filter-subgroup">
              <FilterChip
                href={groupHref}
                active={groupActive}
                empty={groupCount === 0}
                label={group.label}
                count={groupCount}
              />
              <div className="chip-wrap chip-wrap--nested">
                {group.values.map((valueId) => {
                  const value = paletteMap.get(valueId) || { id: valueId, label: valueId, count: 0 };
                  const href = buildSearchHref(searchParams, {
                    category: null,
                    palette_id: activePalette === value.id ? null : value.id,
                    page: null,
                  });

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
          );
        })}
        <div className="filter-subgroup">
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

function DerivedCollarBlock({ searchParams, activeValue, contextualValues }) {
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
          });

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

function Pagination({ page, totalPages, searchParams }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <nav className="pagination" aria-label="Collection pages">
      {pages.map((pageNumber) => (
        <Link
          key={pageNumber}
          href={buildSearchHref(searchParams, { page: pageNumber })}
          className={`page-pill ${page === pageNumber ? "page-pill--active" : ""}`}
        >
          {pageNumber}
        </Link>
      ))}
    </nav>
  );
}

function MintStateBlock({ searchParams, activeValue, counts }) {
  return (
    <section className="filter-block">
      <h2>Mint Status</h2>
      <div className="chip-wrap">
        {MINT_STATE_OPTIONS.map((option) => {
          const href = buildSearchHref(searchParams, {
            mint_state: activeValue === option.id ? null : option.id,
            page: null,
          });
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
  return items.filter((item) => {
    if (mintState === "minted") return Boolean(statusSnapshot.byToken[item.token_id]?.minted);
    if (mintState === "unminted") return !statusSnapshot.byToken[item.token_id]?.minted;
    return true;
  });
}

export default async function CollectionPage({ searchParams }) {
  const params = sanitizeTeaserSearchParams((await searchParams) || {});
  const [collection, filtersDoc, statusSnapshot] = await Promise.all([getCollection(), getFilters(), getStatusSnapshot()]);
  const activeFilters = normalizeFilterState(params);
  const mintState = Array.isArray(params.mint_state) ? String(params.mint_state[0] || "") : String(params.mint_state || "");

  const baseFiltered = applyCollectionFilters(collection.items, params);
  const mintStateCounts = {
    minted: baseFiltered.filter((item) => Boolean(statusSnapshot.byToken[item.token_id]?.minted)).length,
    unminted: baseFiltered.filter((item) => !statusSnapshot.byToken[item.token_id]?.minted).length,
  };
  const filtered = applyMintStateFilter(baseFiltered, statusSnapshot, mintState);
  const sorted = sortCollection(filtered, params.sort);
  const resultsCount = filtered.length;
  const pagination = paginateItems(sorted, Number(params.page || 1), PAGE_SIZE);
  const contextualFilters = {};
  const returnTo = buildSearchHref(params);

  for (const filterKey of FILTER_KEYS) {
    const baseItems = applyCollectionFilters(collection.items, activeFilters, { excludeKeys: [filterKey] });
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
              href={buildSearchHref(params, { sort: null, page: null })}
              className={`sort-pill ${!params.sort ? "sort-pill--active" : ""}`}
            >
              Token ID
            </Link>
            <Link
              href={buildSearchHref(params, { sort: "rarity", page: null })}
              className={`sort-pill ${params.sort === "rarity" ? "sort-pill--active" : ""}`}
            >
              Rarity
            </Link>
            <Link
              href="/collection"
              className="sort-pill"
            >
              Clear all
            </Link>
          </div>
        </div>

        <FilterBlock title="Coat Pattern" filterKey="pattern" values={contextualFilters.pattern.values} searchParams={params} activeValue={activeFilters.pattern} />
        <GroupedColorwayBlock
          paletteValues={contextualFilters.palette_id.values}
          categoryValues={contextualFilters.category.values}
          searchParams={params}
          activeCategory={activeFilters.category}
          activePalette={activeFilters.palette_id}
        />
        <DerivedCollarBlock
          searchParams={params}
          activeValue={activeFilters.collar}
          contextualValues={contextualFilters.collar.values}
        />
        <MintStateBlock searchParams={params} activeValue={mintState || null} counts={mintStateCounts} />
        <FilterBlock title="Tier" filterKey="rarity_tier" values={contextualFilters.rarity_tier.values} searchParams={params} activeValue={activeFilters.rarity_tier} />
        <FilterBlock title="Special Trait" filterKey="rarity_type" values={contextualFilters.rarity_type.values} searchParams={params} activeValue={activeFilters.rarity_type} />
      </aside>

      <section className="results-column">
        <div className="results-header">
          <div>
            <p className="eyebrow">Results</p>
            <h2>{resultsCount} cats match this view.</h2>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} />
        </div>

        <div className="card-grid">
          {pagination.items.map((item) => (
            <CollectionCard
              key={item.token_id}
              item={attachStatusToItem(item, statusSnapshot.byToken[item.token_id] || null)}
              detailHref={`/cats/${item.token_id}?from=${encodeURIComponent(returnTo)}`}
            />
          ))}
        </div>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} />
      </section>
    </div>
  );
}
