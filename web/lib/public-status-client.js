"use client";

import { useEffect, useState } from "react";

const snapshotCache = new Map();

async function loadSnapshot(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || "Failed to load live status");
  }
  return payload;
}

export function usePublicStatusSnapshot(url) {
  const cached = url ? snapshotCache.get(url) : null;
  const [snapshot, setSnapshot] = useState(cached?.snapshot || null);
  const [loading, setLoading] = useState(Boolean(url && !cached));
  const [error, setError] = useState("");

  async function refresh(force = false) {
    if (!url) {
      setSnapshot(null);
      setLoading(false);
      setError("");
      return null;
    }

    const cachedEntry = snapshotCache.get(url);
    const now = Date.now();
    if (!force && cachedEntry && cachedEntry.expiresAt > now) {
      setSnapshot(cachedEntry.snapshot);
      setLoading(false);
      setError(cachedEntry.snapshot?.errorMessage || "");
      return cachedEntry.snapshot;
    }

    setLoading(true);
    try {
      const nextSnapshot = await loadSnapshot(url);
      const ttlSeconds = Number(nextSnapshot.cacheTtlSeconds || 120);
      snapshotCache.set(url, {
        snapshot: nextSnapshot,
        expiresAt: now + (Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 120_000),
      });
      setSnapshot(nextSnapshot);
      setError(nextSnapshot.errorMessage || "");
      return nextSnapshot;
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

  return { snapshot, loading, error, refresh };
}
