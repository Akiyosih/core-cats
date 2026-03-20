import { Suspense } from "react";

import MyCatsBrowser from "../../components/my-cats-browser.jsx";
import { getCollection } from "../../../shared/public-site/lib/viewer-data.js";
import { PUBLIC_TEASER_CONTRACT_SURFACE } from "../../lib/public-teaser-contract-surface.js";
import { getPublicRuntimeConfig } from "../../lib/public-runtime-config.js";

export const dynamic = "force-static";

export default async function MyCatsPage() {
  const { launchState, statusSnapshotUrl, coreCatsAddress } = {
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
  return (
    <Suspense fallback={null}>
      <MyCatsBrowser
        collection={collection}
        coreCatsAddress={statusSnapshotUrl ? "" : coreCatsAddress}
        launchState={launchState}
        statusSnapshotUrl={statusSnapshotUrl}
      />
    </Suspense>
  );
}
