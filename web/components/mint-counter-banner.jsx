function normalizeLaunchState(value) {
  return value === "public" || value === "canary" ? value : "closed";
}

function bannerBadgeText(launchState) {
  return launchState === "public" ? "Mint live" : "Mint progress";
}

function bannerNote(launchState) {
  if (launchState === "public") {
    return "Current on-chain supply. Refresh or reopen this page to fetch the latest snapshot.";
  }
  return "Current on-chain supply before full public launch. Refresh or reopen this page to fetch the latest snapshot.";
}

export default function MintCounterBanner({ mintedCount, total, launchState = "closed" }) {
  const theme = normalizeLaunchState(launchState);
  const countText = Number.isFinite(mintedCount)
    ? `${mintedCount.toLocaleString()} / ${Number(total || 0).toLocaleString()} minted`
    : `— / ${Number(total || 0).toLocaleString()} minted`;

  return (
    <div className={`launch-banner launch-banner--${theme} mint-counter-banner`}>
      <span className="launch-badge">{bannerBadgeText(theme)}</span>
      <p className="mint-counter-banner__count">{countText}</p>
      <p className="mint-counter-banner__note">{bannerNote(theme)}</p>
    </div>
  );
}
