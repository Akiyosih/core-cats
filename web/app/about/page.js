import { redirect } from "next/navigation";

import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";

export default function AboutPage() {
  const config = getCorePublicConfig();
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/about"));
  }

  return (
    <div className="page-stack">
      <section className="copy-panel">
        <p className="eyebrow">About</p>
        <h1>Why Core Cats exists</h1>
        <p>
          Core Cats is a careful full on-chain NFT project built to be easy to inspect and enjoyable to own. The
          aim is to create something the early Core community can enjoy with confidence, and to build a collection
          of cat art that could become part of Core's early NFT history as the ecosystem grows.
        </p>
      </section>

      <section className="copy-grid">
        <article className="copy-card">
          <h2>24x24 by design</h2>
          <p>
            The collection uses a 24x24 canvas in the tradition of early pixel-art collections such as CryptoPunks.
            The constraint keeps the focus on composition, palettes, trait balance, and on-chain reproducibility
            rather than on asset bulk.
          </p>
        </article>
        <article className="copy-card">
          <h2>Full on-chain rendering</h2>
          <p>
            Each token returns its metadata and SVG from packed on-chain records. The collection page follows the
            same structure so what you browse matches what the contract describes.
          </p>
        </article>
        <article className="copy-card">
          <h2>Transparent operations</h2>
          <p>
            Manifests, trait summaries, deploy notes, and runbooks are published so the collection can be checked
            from the outside instead of relying on vague promises.
          </p>
        </article>
      </section>
    </div>
  );
}
