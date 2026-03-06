import Link from "next/link";
import CollectionCard from "../../components/collection-card";
import {
  applyCollectionFilters,
  buildSearchHref,
  getCollection,
  getFilters,
  paginateItems,
  sortCollection,
} from "../../lib/viewer-data";

const PAGE_SIZE = 60;

function activeValues(searchParams, key) {
  const raw = searchParams?.[key];
  if (!raw) return [];
  return String(raw).split(",").filter(Boolean);
}

function FilterBlock({ title, filterKey, values, searchParams }) {
  const active = new Set(activeValues(searchParams, filterKey));

  return (
    <section className="filter-block">
      <h2>{title}</h2>
      <div className="chip-wrap">
        {values.map((value) => {
          const next = new Set(active);
          if (next.has(value.id)) {
            next.delete(value.id);
          } else {
            next.add(value.id);
          }

          const href = buildSearchHref(searchParams, {
            [filterKey]: next.size > 0 ? [...next] : null,
            page: null,
          });

          return (
            <Link
              key={`${filterKey}-${value.id}`}
              href={href}
              className={`filter-chip ${active.has(value.id) ? "filter-chip--active" : ""}`}
            >
              <span>{value.label}</span>
              <small>{value.count}</small>
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
  const params = searchParams || {};
  const [collection, filtersDoc] = await Promise.all([getCollection(), getFilters()]);

  const filtered = applyCollectionFilters(collection.items, params);
  const sorted = sortCollection(filtered, params.sort);
  const pagination = paginateItems(sorted, Number(params.page || 1), PAGE_SIZE);

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

        <FilterBlock title="Coat Pattern" filterKey="pattern" values={filtersDoc.filters.pattern.values} searchParams={params} />
        <FilterBlock title="Colorway" filterKey="palette_id" values={filtersDoc.filters.palette_id.values} searchParams={params} />
        <FilterBlock title="Category" filterKey="category" values={filtersDoc.filters.category.values} searchParams={params} />
        <FilterBlock title="Collar" filterKey="collar" values={filtersDoc.filters.collar.values} searchParams={params} />
        <FilterBlock title="Collar Style" filterKey="collar_type" values={filtersDoc.filters.collar_type.values} searchParams={params} />
        <FilterBlock title="Tier" filterKey="rarity_tier" values={filtersDoc.filters.rarity_tier.values} searchParams={params} />
        <FilterBlock title="Special Trait" filterKey="rarity_type" values={filtersDoc.filters.rarity_type.values} searchParams={params} />
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
