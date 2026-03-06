import Link from "next/link";
import { getCollection, getSummary } from "../lib/viewer-data";

function Metric({ value, label }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default async function HomePage() {
  const [collection, summary] = await Promise.all([getCollection(), getSummary()]);
  const preview = collection.items.slice(0, 8);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Transparent by default</p>
          <h1>1,000 cats, 24x24 pixels, full on-chain rendering.</h1>
          <p className="hero-panel__lede">
            Core Cats is being built as a free-mint, zero-royalty collection with reproducible art data,
            inspectable traits, and a public repository.
          </p>
          <div className="cta-row">
            <Link href="/collection" className="button button--primary">
              View Collection
            </Link>
            <Link href="/transparency" className="button button--ghost">
              Transparency
            </Link>
            <Link href="/mint" className="button button--ghost">
              Mint Status
            </Link>
          </div>
        </div>

        <div className="hero-grid">
          {preview.map((item) => (
            <Link key={item.token_id} href={`/cats/${item.token_id}`} className="hero-grid__item">
              <img src={item.image_data_uri} alt={item.name} width="160" height="160" className="pixel-art" />
            </Link>
          ))}
        </div>
      </section>

      <section className="metric-strip">
        <Metric value={summary.total} label="Final Supply" />
        <Metric value={summary.counts.by_rarity_tier.rare} label="Rare" />
        <Metric value={summary.counts.by_rarity_tier.superrare} label="Super Rare" />
        <Metric value={summary.counts.by_collar.with_collar} label="With Collar" />
      </section>

      <section className="content-grid">
        <article className="info-panel">
          <p className="eyebrow">Art logic</p>
          <h2>Viewer data is derived from the same packed records used by the on-chain renderer.</h2>
          <p>
            The web layer currently reads repository manifests and renderer-derived collection data. It does not
            invent traits or maintain a separate art database.
          </p>
        </article>

        <article className="info-panel">
          <p className="eyebrow">Current status</p>
          <h2>Collection browsing is ready first. Mint UX follows after final mint flow is fixed.</h2>
          <p>
            Quantity mint, transparent random assignment, and owner indexing are still under active contract-side
            work. The UI foundation is being built around the finalized 1,000-cat manifest now.
          </p>
        </article>
      </section>
    </div>
  );
}
