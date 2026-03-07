import Link from "next/link";
import { notFound } from "next/navigation";
import { applyCollectionFilters, getCollection, getCollectionItem, sortCollection } from "../../../lib/viewer-data";
import { getStatusSnapshot, getTokenStatus } from "../../../lib/server/corecats-status";

export const dynamic = "force-dynamic";

function shortenAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function parseCollectionReturnPath(value) {
  if (!value || typeof value !== "string" || !value.startsWith("/collection")) {
    return null;
  }

  try {
    const url = new URL(value, "https://corecats.local");
    const params = {};
    for (const [key, entryValue] of url.searchParams.entries()) {
      params[key] = entryValue;
    }
    return {
      href: `${url.pathname}${url.search}`,
      params,
    };
  } catch {
    return null;
  }
}

export default async function CatDetailPage({ params, searchParams }) {
  const routeParams = await params;
  const routeSearchParams = (await searchParams) || {};
  const tokenId = Number(routeParams?.tokenId);

  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 1000) {
    notFound();
  }

  const returnPath = parseCollectionReturnPath(routeSearchParams.from);
  const [item, mintStatus, collection, statusSnapshot] = await Promise.all([
    getCollectionItem(tokenId),
    getTokenStatus(tokenId),
    getCollection(),
    returnPath ? getStatusSnapshot() : Promise.resolve(null),
  ]);

  if (!item) {
    notFound();
  }

  const detailImageSrc = item.image_svg_src || item.image_src || item.image_data_uri;

  let previousItem = null;
  let nextItem = null;

  if (returnPath) {
    const mintState = String(returnPath.params.mint_state || "");
    const baseFiltered = applyCollectionFilters(collection.items, returnPath.params);
    const filtered = baseFiltered.filter((candidate) => {
      if (mintState === "minted") return Boolean(statusSnapshot?.byToken[candidate.token_id]?.minted);
      if (mintState === "unminted") return !statusSnapshot?.byToken[candidate.token_id]?.minted;
      return true;
    });
    const sorted = sortCollection(filtered, returnPath.params.sort);
    const index = sorted.findIndex((candidate) => candidate.token_id === tokenId);
    if (index > 0) {
      previousItem = sorted[index - 1];
    }
    if (index >= 0 && index < sorted.length - 1) {
      nextItem = sorted[index + 1];
    }
  }

  return (
    <div className="detail-layout">
      <section className="detail-art">
        <div className="detail-art__frame">
          <img src={detailImageSrc} alt={item.name} width="480" height="480" className="pixel-art" />
        </div>
      </section>

      <section className="detail-copy">
        <p className="eyebrow">Cat Detail</p>
        <h1>{item.name}</h1>
        <p>{item.description}</p>

        <div className="detail-status-row">
          <span className={`mint-status-pill ${mintStatus.minted ? "mint-status-pill--minted" : "mint-status-pill--unminted"}`}>
            {mintStatus.minted ? "Minted" : "Unminted"}
          </span>
          {mintStatus.minted && mintStatus.explorer.mintTx ? (
            <a
              href={mintStatus.explorer.mintTx}
              target="_blank"
              rel="noreferrer"
              className="detail-external-link"
            >
              View mint tx
            </a>
          ) : null}
          {mintStatus.minted && mintStatus.explorer.owner ? (
            <a
              href={mintStatus.explorer.owner}
              target="_blank"
              rel="noreferrer"
              className="detail-external-link"
            >
              View owner
            </a>
          ) : null}
        </div>

        <dl className="detail-traits">
          {item.display_attributes.map((attr) => (
            <div key={`${item.token_id}-${attr.trait_type_id}`} className="detail-traits__row">
              <dt>{attr.trait_type_label}</dt>
              <dd>{attr.value_label}</dd>
            </div>
          ))}
        </dl>

        <div className="detail-meta">
          <p><strong>Mint status:</strong> {mintStatus.minted ? "minted" : "unminted"}</p>
          {mintStatus.minted ? (
            <p><strong>Current owner:</strong> {mintStatus.owner || "not available"} {mintStatus.owner ? <span className="detail-meta__short">({shortenAddress(mintStatus.owner)})</span> : null}</p>
          ) : null}
          <p><strong>Variant key:</strong> {item.integrity.variant_key}</p>
          <p><strong>PNG24 SHA256:</strong> {item.integrity.final_png_24_sha256}</p>
          <p>
            <strong>Preview SVG:</strong>{" "}
            {detailImageSrc ? (
              <a href={detailImageSrc} target="_blank" rel="noreferrer" className="detail-external-link">
                Open preview SVG
              </a>
            ) : (
              item.image_svg_file || "not available"
            )}
          </p>
        </div>

        <div className="cta-row">
          <Link href={returnPath?.href || "/collection"} className="button button--ghost">
            {returnPath ? "Back to this view" : "Back to Collection"}
          </Link>
          {previousItem ? (
            <Link
              href={`/cats/${previousItem.token_id}?from=${encodeURIComponent(returnPath.href)}`}
              className="button button--ghost"
            >
              Previous
            </Link>
          ) : null}
          {nextItem ? (
            <Link
              href={`/cats/${nextItem.token_id}?from=${encodeURIComponent(returnPath.href)}`}
              className="button button--ghost"
            >
              Next
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
