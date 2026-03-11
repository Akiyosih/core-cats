"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { applyCollectionFilters, sortCollection } from "../lib/collection-utils";
import { usePublicStatusSnapshot } from "../lib/public-status-client";

function shortenAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function buildExplorerAddressUrl(explorerBaseUrl, address) {
  if (!explorerBaseUrl || !address) return null;
  return `${explorerBaseUrl.replace(/\/$/, "")}/address/${address}`;
}

function buildExplorerContractUrl(explorerBaseUrl, address) {
  if (!explorerBaseUrl || !address) return null;
  return `${explorerBaseUrl.replace(/\/$/, "")}/address/${address}`;
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

function buildFallbackMintStatus(explorerBaseUrl, coreCatsAddress) {
  return {
    minted: false,
    owner: null,
    mintTxHash: null,
    latestTxHash: null,
    explorer: {
      mintTx: null,
      latestTx: null,
      owner: null,
      contract: buildExplorerContractUrl(explorerBaseUrl, coreCatsAddress),
    },
  };
}

export default function CatDetailBrowser({
  tokenId,
  teaserEnabled,
  statusSnapshotUrl,
  collectionIndexUrl,
  explorerBaseUrl,
  coreCatsAddress,
}) {
  const searchParams = useSearchParams();
  const returnPath = useMemo(() => parseCollectionReturnPath(searchParams.get("from")), [searchParams]);
  const { snapshot, error: snapshotError } = usePublicStatusSnapshot(statusSnapshotUrl);
  const [collectionIndex, setCollectionIndex] = useState(null);
  const [indexError, setIndexError] = useState("");

  useEffect(() => {
    let active = true;

    if (!returnPath) {
      setCollectionIndex(null);
      setIndexError("");
      return () => {
        active = false;
      };
    }

    fetch(collectionIndexUrl, { cache: "force-cache" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load collection index");
        }
        if (active) {
          setCollectionIndex(payload);
          setIndexError("");
        }
      })
      .catch((loadError) => {
        if (!active) return;
        setCollectionIndex(null);
        setIndexError(loadError instanceof Error ? loadError.message : "Failed to load collection index");
      });

    return () => {
      active = false;
    };
  }, [collectionIndexUrl, returnPath]);

  const mintStatus = useMemo(() => {
    const liveStatus = snapshot?.byToken?.[String(tokenId)] || snapshot?.byToken?.[tokenId];
    if (liveStatus) {
      return {
        ...liveStatus,
        explorer: {
          ...liveStatus.explorer,
          contract: buildExplorerContractUrl(explorerBaseUrl, coreCatsAddress),
        },
      };
    }
    return buildFallbackMintStatus(explorerBaseUrl, coreCatsAddress);
  }, [coreCatsAddress, explorerBaseUrl, snapshot, tokenId]);

  const navigation = useMemo(() => {
    if (!returnPath || !collectionIndex?.items) {
      return { previousItem: null, nextItem: null };
    }

    const mintState = String(returnPath.params.mint_state || "");
    if (mintState && statusSnapshotUrl && !snapshot) {
      return { previousItem: null, nextItem: null };
    }

    let filtered = applyCollectionFilters(collectionIndex.items, returnPath.params, { teaserEnabled });

    if (mintState === "minted") {
      filtered = filtered.filter((candidate) => Boolean(snapshot?.byToken?.[String(candidate.token_id)]?.minted));
    } else if (mintState === "unminted") {
      filtered = filtered.filter((candidate) => !snapshot?.byToken?.[String(candidate.token_id)]?.minted);
    }

    const sorted = sortCollection(filtered, returnPath.params.sort);
    const index = sorted.findIndex((candidate) => candidate.token_id === tokenId);

    return {
      previousItem: index > 0 ? sorted[index - 1] : null,
      nextItem: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
    };
  }, [collectionIndex?.items, returnPath, snapshot, statusSnapshotUrl, teaserEnabled, tokenId]);

  const statusUnavailable = Boolean(statusSnapshotUrl && snapshotError && !snapshot);
  const contractUrl = buildExplorerContractUrl(explorerBaseUrl, coreCatsAddress);

  return (
    <>
      <div className="detail-status-row">
        <span className={`mint-status-pill ${mintStatus.minted ? "mint-status-pill--minted" : "mint-status-pill--unminted"}`}>
          {mintStatus.minted ? "Minted" : "Unminted"}
        </span>
        {mintStatus.minted && mintStatus.explorer?.mintTx ? (
          <a href={mintStatus.explorer.mintTx} target="_blank" rel="noreferrer" className="detail-external-link">
            View mint tx
          </a>
        ) : null}
        {mintStatus.minted && mintStatus.explorer?.owner ? (
          <a href={mintStatus.explorer.owner} target="_blank" rel="noreferrer" className="detail-external-link">
            View owner
          </a>
        ) : null}
        {contractUrl ? (
          <a href={contractUrl} target="_blank" rel="noreferrer" className="detail-external-link">
            Open contract
          </a>
        ) : null}
      </div>

      <div className="detail-meta">
        <p><strong>Mint status:</strong> {mintStatus.minted ? "minted" : "unminted"}</p>
        {mintStatus.minted ? (
          <p>
            <strong>Current owner:</strong> {mintStatus.owner || "not available"}{" "}
            {mintStatus.owner ? <span className="detail-meta__short">({shortenAddress(mintStatus.owner)})</span> : null}
          </p>
        ) : null}
        {statusUnavailable ? (
          <p><strong>Live status:</strong> temporarily unavailable</p>
        ) : null}
      </div>

      {indexError ? (
        <p className="detail-inline-note">Filtered previous/next links are temporarily unavailable.</p>
      ) : null}

      <div className="cta-row">
        <Link href={returnPath?.href || "/collection"} className="button button--ghost">
          {returnPath ? "Back to this view" : "Back to Collection"}
        </Link>
        {navigation.previousItem ? (
          <Link
            href={`/cats/${navigation.previousItem.token_id}?from=${encodeURIComponent(returnPath.href)}`}
            className="button button--ghost"
          >
            Previous
          </Link>
        ) : null}
        {navigation.nextItem ? (
          <Link
            href={`/cats/${navigation.nextItem.token_id}?from=${encodeURIComponent(returnPath.href)}`}
            className="button button--ghost"
          >
            Next
          </Link>
        ) : null}
      </div>
    </>
  );
}
