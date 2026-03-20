"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";

import CollectionCard from "./collection-card";
import { isCoreAddress } from "../lib/collection-utils";
import { usePublicOwnerLookup, usePublicStatusSnapshot } from "../lib/public-status-client";

function normalizeOwnerInput(value) {
  return String(value || "").trim();
}

function buildOwnerLookupUrl(baseUrl, owner) {
  if (!baseUrl || !owner) return "";
  const url = new URL(baseUrl, "https://corecats.local");
  url.pathname = url.pathname.replace(/\/status$/, "/owner");
  url.searchParams.set("address", owner);
  return url.toString().replace("https://corecats.local", "");
}

export default function MyCatsBrowser({
  collection,
  coreCatsAddress,
  initialCoreCatsAddress = "",
  initialCoreCatsContractQr = "",
  launchState,
  statusSnapshotUrl,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOwner = normalizeOwnerInput(searchParams.get("owner") || "");
  const [ownerQuery, setOwnerQuery] = useState(initialOwner);
  const [activeOwner, setActiveOwner] = useState(initialOwner);
  const hasSearch = activeOwner.length > 0;
  const validOwner = hasSearch ? isCoreAddress(activeOwner) : false;
  const ownerLookupUrl = useMemo(
    () => (validOwner ? buildOwnerLookupUrl(statusSnapshotUrl, activeOwner) : ""),
    [activeOwner, statusSnapshotUrl, validOwner],
  );
  const { snapshot: publicStatus, loading: contractLoading, error: contractError } =
    usePublicStatusSnapshot(statusSnapshotUrl);
  const { ownerLookup, loading, error } = usePublicOwnerLookup(ownerLookupUrl);
  const normalizedInitialCoreCatsAddress = normalizeOwnerInput(initialCoreCatsAddress);
  const [coreCatsContractQr, setCoreCatsContractQr] = useState(initialCoreCatsContractQr);
  const [qrAddress, setQrAddress] = useState(normalizedInitialCoreCatsAddress);
  const isCanary = launchState === "canary";
  const liveCoreCatsAddress = useMemo(
    () => normalizeOwnerInput(publicStatus?.coreCatsAddress),
    [publicStatus?.coreCatsAddress],
  );
  const fallbackCoreCatsAddress = normalizeOwnerInput(coreCatsAddress);
  const displayCoreCatsAddress = liveCoreCatsAddress || normalizedInitialCoreCatsAddress || fallbackCoreCatsAddress;

  useEffect(() => {
    setOwnerQuery(initialOwner);
    setActiveOwner(initialOwner);
  }, [initialOwner]);

  useEffect(() => {
    let cancelled = false;

    async function buildContractQr() {
      if (!displayCoreCatsAddress) {
        setCoreCatsContractQr("");
        setQrAddress("");
        return;
      }

      if (coreCatsContractQr && qrAddress === displayCoreCatsAddress) {
        return;
      }

      try {
        const nextQr = await QRCode.toDataURL(displayCoreCatsAddress, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 8,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        });
        if (!cancelled) {
          setCoreCatsContractQr(nextQr);
          setQrAddress(displayCoreCatsAddress);
        }
      } catch {
        if (!cancelled) {
          setCoreCatsContractQr("");
          setQrAddress("");
        }
      }
    }

    buildContractQr();
    return () => {
      cancelled = true;
    };
  }, [coreCatsContractQr, displayCoreCatsAddress, qrAddress]);

  const ownerStatus = useMemo(() => {
    if (!validOwner || !ownerLookup) return null;
    return ownerLookup.owner || {
      owner: activeOwner,
      explorer: ownerLookup.explorerBaseUrl
        ? `${ownerLookup.explorerBaseUrl.replace(/\/$/, "")}/address/${activeOwner}`
        : null,
      tokenIds: [],
    };
  }, [activeOwner, ownerLookup, validOwner]);

  const ownerItems = useMemo(() => {
    if (!ownerStatus || !ownerLookup) return [];
    const itemMap = new Map(collection.items.map((item) => [item.token_id, item]));
    return ownerStatus.tokenIds
      .map((tokenId) => itemMap.get(tokenId))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        mint_status: ownerLookup.byToken?.[String(item.token_id)] || null,
      }));
  }, [collection.items, ownerLookup, ownerStatus]);

  function handleSubmit(event) {
    event.preventDefault();
    const nextOwner = normalizeOwnerInput(ownerQuery);
    setActiveOwner(nextOwner);
    const href = nextOwner ? `/my-cats?owner=${encodeURIComponent(nextOwner)}` : "/my-cats";
    router.replace(href, { scroll: false });
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

        <details className="mint-verify-details owner-help-details">
          <summary>How to show CoreCats in CorePass</summary>
          <div className="mint-verify-body owner-help-body">
            <p>In CorePass, open NFTs in your wallet and tap +ADD NFT.</p>
            <p>In the CBC721 contract address field, tap the QR icon and scan the CoreCats contract QR below.</p>
            <p>Then tap Import NFT Collection and confirm in CorePass.</p>
            <div className="owner-help-qr">
              {coreCatsContractQr ? (
                <img src={coreCatsContractQr} alt="CoreCats contract address QR" width="176" height="176" />
              ) : null}
              {displayCoreCatsAddress ? <p className="owner-help-address">{displayCoreCatsAddress}</p> : null}
            </div>
            {!displayCoreCatsAddress && contractLoading ? (
              <p className="owner-help-note">Loading the current CoreCats contract address for this deployment.</p>
            ) : null}
            {!displayCoreCatsAddress && !contractLoading ? (
              <p className="owner-help-note">
                {contractError || "The current CoreCats contract address is temporarily unavailable."}
              </p>
            ) : null}
            <p className="owner-help-note">
              This step is optional. Even if CoreCats is not shown in CorePass, your NFT can still already be in your
              wallet.
            </p>
            <p className="owner-help-note">
              CorePass may show the token ID, but it does not display the cat artwork itself.
            </p>
            <p className="owner-help-note">To view the artwork, use this site or read the on-chain data directly.</p>
          </div>
        </details>
      </section>

      {hasSearch && !validOwner ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Invalid address</h2>
            <p>Enter a valid Core wallet address.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && !ownerLookupUrl && !statusSnapshotUrl ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Live ownership is unavailable</h2>
            <p>This deployment does not currently expose the public ownership snapshot needed for My Cats lookup.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && ownerLookupUrl && loading && !ownerLookup ? (
        <section className="copy-grid my-cats-grid">
          <article className="copy-card my-cats-card">
            <h2>Loading live ownership...</h2>
            <p>The current owner snapshot is being fetched for this address.</p>
          </article>
        </section>
      ) : null}

      {hasSearch && validOwner && ownerLookupUrl && error && !ownerLookup ? (
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
            <p className="eyebrow">Owner results</p>
            <h2>{ownerStatus.tokenIds.length} cats are currently held by this address.</h2>
            <p className="owner-results-address">{ownerStatus.owner}</p>
            <div className="owner-results-actions">
              {ownerStatus.explorer ? (
                <a href={ownerStatus.explorer} target="_blank" rel="noreferrer" className="button button--ghost">
                  View address on Blockindex
                </a>
              ) : null}
            </div>
            <p className="owner-results-note">
              Open any cat to get a raw preview SVG, an avatar-ready PNG, and verification details for that artwork.
            </p>
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
