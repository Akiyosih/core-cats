import { Suspense } from "react";
import QRCode from "qrcode";

import MyCatsBrowser from "../../components/my-cats-browser.jsx";
import { getCollection } from "../../../shared/public-site/lib/viewer-data.js";
import { PUBLIC_TEASER_CONTRACT_SURFACE } from "../../lib/public-teaser-contract-surface.js";
import { getPublicRuntimeConfig } from "../../lib/public-runtime-config.js";
import { CONTRACT_QR_OPTIONS } from "../../../shared/public-site/lib/contract-qr.js";

export const dynamic = "force-static";

async function buildCorePassContractQr(address) {
  const normalized = String(address || "").trim();
  if (!normalized) return "";
  return QRCode.toDataURL(normalized, CONTRACT_QR_OPTIONS);
}

export default async function MyCatsPage() {
  const { launchState, publicApiBaseUrl, coreCatsAddress } = {
    ...getPublicRuntimeConfig(),
    ...PUBLIC_TEASER_CONTRACT_SURFACE,
  };

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

  const collection = await getCollection(launchState !== "public");
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
        publicApiBaseUrl={publicApiBaseUrl}
      />
    </Suspense>
  );
}
