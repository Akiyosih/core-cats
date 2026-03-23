function normalizeLaunchState(value) {
  return value === "public" || value === "canary" ? value : "closed";
}

function isSoldOut(mintedCount, total) {
  return Number.isFinite(mintedCount) && Number.isFinite(total) && mintedCount >= total && total > 0;
}

function bannerBadgeText(launchState, soldOut) {
  if (soldOut) {
    return "Sold out";
  }
  return launchState === "public" ? "Mint live" : "Mint progress";
}

function bannerNote(launchState, soldOut) {
  if (soldOut) {
    return "All 1,000 cats are now minted. Browse the collection or use My Cats to look up any owner address.";
  }
  if (launchState === "public") {
    return "Current on-chain supply. Refresh or reopen this page to fetch the latest snapshot.";
  }
  return "Current on-chain supply before full public launch. Refresh or reopen this page to fetch the latest snapshot.";
}

export default function MintCounterBanner({ mintedCount, total, launchState = "closed" }) {
  const theme = normalizeLaunchState(launchState);
  const soldOut = isSoldOut(mintedCount, Number(total || 0));
  const countText = Number.isFinite(mintedCount)
    ? `${mintedCount.toLocaleString()} / ${Number(total || 0).toLocaleString()} minted`
    : `— / ${Number(total || 0).toLocaleString()} minted`;

  return (
    <div className={`launch-banner launch-banner--${theme} mint-counter-banner`}>
      <span className="launch-badge">{bannerBadgeText(theme, soldOut)}</span>
      <p className="mint-counter-banner__count">{countText}</p>
      <p className="mint-counter-banner__note">{bannerNote(theme, soldOut)}</p>
    </div>
  );
}
