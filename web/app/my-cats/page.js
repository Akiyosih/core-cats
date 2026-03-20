import { Suspense } from "react";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import MyCatsBrowser from "../../components/my-cats-browser";
import { getCollection } from "../../lib/viewer-data";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";
export const dynamic = "force-static";

async function buildCorePassContractQr(address) {
  const normalized = String(address || "").trim();
  if (!normalized) return "";
  return QRCode.toDataURL(normalized, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
    color: { dark: "#111111", light: "#ffffff" },
  });
}

export default async function MyCatsPage({ searchParams }) {
  const config = getCorePublicConfig();
  if (hasBrowseOrigin(config)) {
    const resolvedSearchParams = await searchParams;
    const owner = String(resolvedSearchParams?.owner || "").trim();
    const query = owner ? `?owner=${encodeURIComponent(owner)}` : "";
    redirect(buildBrowseHref(config, `/my-cats${query}`));
  }
  const { launchState, statusSnapshotUrl, coreCatsAddress } = config;

  if (launchState === "closed") {
    return (
      <div className="page-stack">
        <section className="copy-panel my-cats-panel">
          <p className="eyebrow my-cats-eyebrow">My Cats</p>
          <h1>Ownership search is not available in this stage.</h1>
          <p className="my-cats-copy">
            This page becomes the wallet lookup once the site moves beyond the closed launch stage.
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

  const collection = await getCollection();
  const initialCoreCatsAddress = String(coreCatsAddress || "").trim();
  const initialCoreCatsContractQr = await buildCorePassContractQr(initialCoreCatsAddress);
  return (
    <Suspense fallback={null}>
      <MyCatsBrowser
        collection={collection}
        coreCatsAddress={coreCatsAddress}
        initialCoreCatsAddress={initialCoreCatsAddress}
        initialCoreCatsContractQr={initialCoreCatsContractQr}
        launchState={launchState}
        statusSnapshotUrl={statusSnapshotUrl}
      />
    </Suspense>
  );
}
