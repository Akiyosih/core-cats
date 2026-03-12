"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import CollectionCard from "./collection-card";
import CopyButton from "./copy-button";
import { isCoreAddress } from "../lib/collection-utils";
import { usePublicStatusSnapshot } from "../lib/public-status-client";

function normalizeOwnerInput(value) {
  return String(value || "").trim();
}

function shortenAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function MyCatsBrowser({ collection, launchState, statusSnapshotUrl }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOwner = normalizeOwnerInput(searchParams.get("owner") || "");
  const [ownerQuery, setOwnerQuery] = useState(initialOwner);
  const hasSearch = ownerQuery.length > 0;
  const validOwner = hasSearch ? isCoreAddress(ownerQuery) : false;
  const { snapshot, loading, error, refresh } = usePublicStatusSnapshot(validOwner ? statusSnapshotUrl : "");
  const isCanary = launchState === "canary";

  useEffect(() => {
    setOwnerQuery(initialOwner);
  }, [initialOwner]);

  const ownerStatus = useMemo(() => {
    if (!validOwner || !snapshot) return null;
    return snapshot.byOwner?.[ownerQuery.toLowerCase()] || {
      owner: ownerQuery,
      explorer: snapshot.explorerBaseUrl ? `${snapshot.explorerBaseUrl.replace(/\/$/, "")}/address/${ownerQuery}` : null,
      tokenIds: [],
    };
  }, [ownerQuery, snapshot, validOwner]);

  const ownerItems = useMemo(() => {
    if (!ownerStatus || !snapshot) return [];
    const itemMap = new Map(collection.items.map((item) => [item.token_id, item]));
    return ownerStatus.tokenIds
      .map((tokenId) => itemMap.get(tokenId))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        mint_status: snapshot.byToken?.[String(item.token_id)] || null,
      }));
  }, [collection.items, ownerStatus, snapshot]);

  function handleSubmit(event) {
    event.preventDefault();
    const nextOwner = normalizeOwnerInput(ownerQuery);
    const href = nextOwner ? `/my-cats?owner=${encodeURIComponent(nextOwner)}` : "/my-cats";
    router.push(href);
    refresh(false);
  }

  return (
    <div className="page-stack">
      <section className="copy-panel my-cats-panel">
        <p className="eyebrow my-cats-eyebrow">My Cats</p>
        <h1>Search by wallet address.</h1>
        <p className="my-cats-copy">
          Enter a Core wallet address to see the cats currently held there.
        </p>
        {isCanary ? (
          <p className="my-cats-copy">
            Live ownership follows a short public snapshot interval. Recheck after a brief wait before treating a stale
            result as a failure.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="owner-search-form">
          <label className="owner-search-form__label" htmlFor="owner-address">
            Core wallet address
          </label>
          <div className="owner-search-form__row">
            <input
              id="owner-address"
              name="owner"
              type="search"
              value={ownerQuery}
              onChange={(event) => setOwnerQuery(event.target.value)}
              placeholder="cb..."
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
            <p>Enter a valid Core wallet address.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && !statusSnapshotUrl ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Live ownership is unavailable</h2>
            <p>This deployment does not currently expose the public ownership snapshot needed for My Cats lookup.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && statusSnapshotUrl && loading && !snapshot ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Loading live ownership...</h2>
            <p>The current owner snapshot is being fetched for this address.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && statusSnapshotUrl && error && !snapshot ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Live ownership is temporarily unavailable</h2>
            <p>{error}</p>
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
              <p className="owner-results-note">
                Open any cat to get a raw preview SVG, an avatar-ready PNG, and verification details for that artwork.
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
    </div>
  );
}
