"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { applyCollectionFilters, sortCollection } from "../lib/collection-utils";
import { usePublicOwnerLookup } from "../lib/public-status-client";

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

function buildTokenOwnerLookupUrl(publicApiBaseUrl, tokenId) {
  if (!publicApiBaseUrl || !tokenId) return null;

  try {
    const url = new URL(publicApiBaseUrl, "https://corecats.local");
    url.pathname = `${url.pathname.replace(/\/$/, "").replace(/\/status$/i, "")}/token-owner`;
    url.search = "";
    url.searchParams.set("tokenId", String(tokenId));
    if (url.origin === "https://corecats.local") {
      return `${url.pathname}${url.search}`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function formatSnapshotTimestamp(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleString();
}

export default function CatDetailBrowser({
  tokenId,
  teaserEnabled,
  publicApiBaseUrl,
  collectionIndexUrl,
  explorerBaseUrl,
  coreCatsAddress,
}) {
  const searchParams = useSearchParams();
  const returnPath = useMemo(() => parseCollectionReturnPath(searchParams.get("from")), [searchParams]);
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

  const tokenOwnerLookupUrl = useMemo(
    () => buildTokenOwnerLookupUrl(publicApiBaseUrl, tokenId),
    [publicApiBaseUrl, tokenId],
  );
  const {
    ownerLookup,
    loading: ownerLookupLoading,
    error: ownerLookupError,
    refresh: refreshOwnerLookup,
  } = usePublicOwnerLookup(tokenOwnerLookupUrl);
  const resolvedOwner = ownerLookup?.token?.owner || null;
  const resolvedOwnerExplorer = ownerLookup?.token?.explorer || null;
  const ownerSnapshotUpdatedAt = formatSnapshotTimestamp(ownerLookup?.fetchedAt);

  const navigation = useMemo(() => {
    if (!returnPath || !collectionIndex?.items) {
      return { previousItem: null, nextItem: null };
    }

    let filtered = applyCollectionFilters(collectionIndex.items, returnPath.params, { teaserEnabled });

    const sorted = sortCollection(filtered, returnPath.params.sort);
    const index = sorted.findIndex((candidate) => candidate.token_id === tokenId);

    return {
      previousItem: index > 0 ? sorted[index - 1] : null,
      nextItem: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
    };
  }, [collectionIndex?.items, returnPath, teaserEnabled, tokenId]);
  const contractUrl = buildExplorerContractUrl(explorerBaseUrl, coreCatsAddress);

  return (
    <>
      <div className="detail-status-row">
        <span className="mint-status-pill mint-status-pill--minted">Minted</span>
        {contractUrl ? (
          <a href={contractUrl} target="_blank" rel="noreferrer" className="detail-external-link">
            Open contract
          </a>
        ) : null}
        {tokenOwnerLookupUrl ? (
          <button type="button" className="button button--ghost button--inline" onClick={() => refreshOwnerLookup(true)}>
            {ownerLookupLoading ? "Refreshing..." : "Refresh owner"}
          </button>
        ) : null}
      </div>

      <div className="detail-meta">
        <p><strong>Mint status:</strong> minted</p>
        <p>
          <strong>Current owner:</strong>{" "}
          {resolvedOwner ? (
            resolvedOwnerExplorer ? (
              <a href={resolvedOwnerExplorer} target="_blank" rel="noreferrer" className="detail-external-link">
                {resolvedOwner}
              </a>
            ) : (
              resolvedOwner
            )
          ) : tokenOwnerLookupUrl && ownerLookupLoading ? (
            "loading..."
          ) : (
            "not available"
          )}
        </p>
        {ownerSnapshotUpdatedAt ? (
          <p><strong>Owner snapshot updated:</strong> {ownerSnapshotUpdatedAt}</p>
        ) : null}
        {ownerLookupError ? (
          <p><strong>Live owner lookup:</strong> temporarily unavailable</p>
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
