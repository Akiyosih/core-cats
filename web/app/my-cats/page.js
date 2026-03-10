import CollectionCard from "../../components/collection-card";
import CopyButton from "../../components/copy-button";
import { getCollection } from "../../lib/viewer-data";
import { getCorePublicConfig } from "../../lib/server/core-env";
import {
  attachStatusToItem,
  getOwnerStatus,
  getStatusSnapshot,
  isCoreAddress,
} from "../../lib/server/corecats-status";

export const dynamic = "force-dynamic";

function normalizeOwnerInput(value) {
  return String(value || "").trim();
}

function shortenAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default async function MyCatsPage({ searchParams }) {
  const { launchState } = getCorePublicConfig();
  const params = (await searchParams) || {};
  const ownerQuery = normalizeOwnerInput(params.owner);
  const hasSearch = ownerQuery.length > 0;
  const validOwner = hasSearch ? isCoreAddress(ownerQuery) : false;
  const isCanary = launchState === "canary";

  if (launchState === "closed") {
    return (
      <div className="page-stack">
        <section className="copy-panel my-cats-panel">
          <p className="eyebrow my-cats-eyebrow">My Cats</p>
          <h1>Ownership search opens soon.</h1>
          <p className="my-cats-copy">
            This page will become the wallet lookup for live Core Cats once the site moves beyond the closed launch
            stage.
          </p>
        </section>

        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>What will appear here</h2>
            <p>
              After launch, you will be able to look up a Core wallet address and inspect the cats currently held
              there, using the same on-chain ownership data that powers minted status across the site.
            </p>
          </article>
        </section>
      </div>
    );
  }

  let ownerStatus = null;
  let ownerItems = [];

  if (validOwner) {
    const [collection, snapshot, owner] = await Promise.all([
      getCollection(),
      getStatusSnapshot(),
      getOwnerStatus(ownerQuery),
    ]);

    ownerStatus = owner;
    const itemMap = new Map(collection.items.map((item) => [item.token_id, item]));
    ownerItems = owner.tokenIds
      .map((tokenId) => itemMap.get(tokenId))
      .filter(Boolean)
      .map((item) => attachStatusToItem(item, snapshot.byToken[item.token_id] || null));
  }

  return (
    <div className="page-stack">
      <section className="copy-panel my-cats-panel">
        <p className="eyebrow my-cats-eyebrow">My Cats</p>
        <h1>Search by wallet address.</h1>
        <p className="my-cats-copy">
          {isCanary
            ? "Use this page to confirm ownership after rehearsal mints. Enter a Core wallet address to inspect the cats currently held there."
            : "Enter a Core wallet address to see the cats currently held there."}
        </p>
        {isCanary ? (
          <p className="my-cats-copy">
            Recent ownership changes may take a short cache interval to appear. Recheck after a brief wait before
            treating a stale result as a failure.
          </p>
        ) : null}

        <form action="/my-cats" method="get" className="owner-search-form">
          <label className="owner-search-form__label" htmlFor="owner-address">
            Core wallet address
          </label>
          <div className="owner-search-form__row">
            <input
              id="owner-address"
              name="owner"
              type="search"
              defaultValue={ownerQuery}
              placeholder="ab... or cb..."
              className="owner-search-form__input"
              autoComplete="off"
              spellCheck="false"
            />
            <button type="submit" className="button">
              Search
            </button>
          </div>
        </form>
      </section>

      {hasSearch && !validOwner ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Invalid address</h2>
            <p>Enter a Core address beginning with <code>ab</code> or <code>cb</code>.</p>
          </article>
        </section>
      ) : null}

      {validOwner && ownerStatus ? (
        <>
          <section className="results-header owner-results-header">
            <div>
              <p className="eyebrow">Owner results</p>
              <h2>{ownerStatus.tokenIds.length} cats are currently held by this address.</h2>
              <p className="owner-results-address">
                <span className="owner-results-address__short">{shortenAddress(ownerStatus.owner)}</span>
                <span className="owner-results-address__full">{ownerStatus.owner}</span>
              </p>
            </div>
            <div className="owner-results-actions">
              <CopyButton value={ownerStatus.owner} />
              {ownerStatus.explorer ? (
                <a href={ownerStatus.explorer} target="_blank" rel="noreferrer" className="button button--ghost">
                  View address on Blockindex
                </a>
              ) : null}
            </div>
          </section>

          {ownerItems.length > 0 ? (
            <section className="card-grid">
              {ownerItems.map((item) => (
                <CollectionCard key={item.token_id} item={item} />
              ))}
            </section>
          ) : (
            <section className="copy-grid my-cats-grid">
              <article className="copy-card my-cats-card">
                <h2>No cats found</h2>
                <p>This address does not currently hold any Core Cats.</p>
              </article>
            </section>
          )}
        </>
      ) : null}

      {!hasSearch ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>{isCanary ? "Use this after mint" : "Search any address"}</h2>
            <p>
              {isCanary
                ? "For rehearsal-canary testing, this is the intended post-mint ownership check. Search the same wallet that completed the mint and confirm the expected cats appear here."
                : "This view uses the current on-chain ownership index instead of guessing from incomplete wallet data."}
            </p>
          </article>
        </section>
      ) : null}
    </div>
  );
}
