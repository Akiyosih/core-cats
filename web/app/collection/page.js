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
  sortCollection,
} from "../../lib/viewer-data";

const PAGE_SIZE = 30;
export const dynamic = "force-dynamic";

function buildFacetCounts(items, filterKey) {
  const counts = new Map();
  for (const item of items) {
    const value = item.trait_values[filterKey];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function FilterBlock({ title, filterKey, values, searchParams, activeValue }) {
  const active = activeValue;

  return (
    <section className="filter-block">
      <h2>{title}</h2>
      <div className="chip-wrap">
        {values.map((value) => {
          const href = buildSearchHref(searchParams, {
            [filterKey]: active === value.id ? null : value.id,
            page: null,
          });
          const count = value.count ?? 0;

          return (
            <Link
              key={`${filterKey}-${value.id}`}
              href={href}
              className={`filter-chip ${active === value.id ? "filter-chip--active" : ""} ${count === 0 ? "filter-chip--empty" : ""}`}
            >
              <span>{value.label}</span>
              <small>{count}</small>
            </Link>
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

export default async function CollectionPage({ searchParams }) {
  const params = (await searchParams) || {};
  const [collection, filtersDoc] = await Promise.all([getCollection(), getFilters()]);
  const activeFilters = normalizeFilterState(params);

  const filtered = applyCollectionFilters(collection.items, params);
  const sorted = sortCollection(filtered, params.sort);
  const pagination = paginateItems(sorted, Number(params.page || 1), PAGE_SIZE);
  const contextualFilters = {};

  for (const filterKey of FILTER_KEYS) {
    const baseItems = applyCollectionFilters(collection.items, activeFilters, { excludeKeys: [filterKey] });
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
          <p className="eyebrow">Collection filters</p>
          <h1>Browse the 1,000 finalized cats.</h1>
          <p>
            These filters are backed by the finalized manifest and the renderer-derived viewer data. No separate UI
            taxonomy is being invented here.
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
          </div>
        </div>

        <FilterBlock title="Coat Pattern" filterKey="pattern" values={contextualFilters.pattern.values} searchParams={params} activeValue={activeFilters.pattern} />
        <FilterBlock title="Colorway" filterKey="palette_id" values={contextualFilters.palette_id.values} searchParams={params} activeValue={activeFilters.palette_id} />
        <FilterBlock title="Category" filterKey="category" values={contextualFilters.category.values} searchParams={params} activeValue={activeFilters.category} />
        <FilterBlock title="Collar" filterKey="collar" values={contextualFilters.collar.values} searchParams={params} activeValue={activeFilters.collar} />
        <FilterBlock title="Collar Style" filterKey="collar_type" values={contextualFilters.collar_type.values} searchParams={params} activeValue={activeFilters.collar_type} />
        <FilterBlock title="Tier" filterKey="rarity_tier" values={contextualFilters.rarity_tier.values} searchParams={params} activeValue={activeFilters.rarity_tier} />
        <FilterBlock title="Special Trait" filterKey="rarity_type" values={contextualFilters.rarity_type.values} searchParams={params} activeValue={activeFilters.rarity_type} />
      </aside>

      <section className="results-column">
        <div className="results-header">
          <div>
            <p className="eyebrow">Results</p>
            <h2>{pagination.totalItems} cats match the current filter.</h2>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} />
        </div>

        <div className="card-grid">
          {pagination.items.map((item) => (
            <CollectionCard key={item.token_id} item={item} />
          ))}
        </div>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} searchParams={params} />
      </section>
    </div>
  );
}
