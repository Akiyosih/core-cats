"use client";

import { useEffect, useState } from "react";

const snapshotCache = new Map();

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || "Failed to load live status");
  }
  return payload;
}

function useCachedJson(url) {
  const cached = url ? snapshotCache.get(url) : null;
  const [data, setData] = useState(cached?.data || null);
  const [loading, setLoading] = useState(Boolean(url && !cached));
  const [error, setError] = useState("");

  async function refresh(force = false) {
    if (!url) {
      setData(null);
      setLoading(false);
      setError("");
      return null;
    }

    const cachedEntry = snapshotCache.get(url);
    const now = Date.now();
    if (!force && cachedEntry && cachedEntry.expiresAt > now) {
      setData(cachedEntry.data);
      setLoading(false);
      setError(cachedEntry.data?.errorMessage || "");
      return cachedEntry.data;
    }

    setLoading(true);
    try {
      const nextData = await loadJson(url);
      const ttlSeconds = Number(nextData.cacheTtlSeconds || 120);
      snapshotCache.set(url, {
        data: nextData,
        expiresAt: now + (Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 120_000),
      });
      setData(nextData);
      setError(nextData.errorMessage || "");
      return nextData;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load live status";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);
  }, [url]);

  return { data, loading, error, refresh };
}

export function usePublicStatusSnapshot(url) {
  const { data, loading, error, refresh } = useCachedJson(url);
  return { snapshot: data, loading, error, refresh };
}

export function usePublicOwnerLookup(url) {
  const { data, loading, error, refresh } = useCachedJson(url);
  return { ownerLookup: data, loading, error, refresh };
}
