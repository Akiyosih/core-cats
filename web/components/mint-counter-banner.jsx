"use client";

import { usePublicStatusSnapshot } from "../lib/public-status-client";

export default function MintCounterBanner({ statusSnapshotUrl, total }) {
  const { snapshot } = usePublicStatusSnapshot(statusSnapshotUrl);

  if (!statusSnapshotUrl || !snapshot) {
    return (
      <div className="launch-banner launch-banner--public mint-counter-banner">
        <span className="launch-badge">Public mint live</span>
      </div>
    );
  }

  return (
    <div className="launch-banner launch-banner--public mint-counter-banner">
      <span className="launch-badge">Public mint live</span>
      <p className="mint-counter-banner__count">
        {snapshot.mintedCount.toLocaleString()} / {total.toLocaleString()} minted
      </p>
    </div>
  );
}
