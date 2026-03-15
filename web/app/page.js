import Link from "next/link";
import { redirect } from "next/navigation";
import { MintPageContent } from "./mint/page.js";
import { getCollection, getSummary } from "../lib/viewer-data";
import { getCorePublicConfig } from "../lib/server/core-env";
import { isTeaserDisplayEnabled } from "../lib/server/teaser-display.js";
import { buildBrowseHref, hasBrowseOrigin } from "../lib/site-surface-links.js";

const HOME_NATURAL_IDS = [272, 241, 690, 647, 322, 818, 515, 102, 922, 415];
const HOME_SPECIAL_IDS = [48, 305, 714, 25, 903, 939, 479, 489, 1000, 999];

function Metric({ value, label }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default async function HomePage() {
  const config = getCorePublicConfig();
  if (config.mintOnlyHost && config.publicMintSite) {
    return MintPageContent({ config });
  }
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/"));
  }
  const [collection, summary] = await Promise.all([getCollection(), getSummary()]);
  const teaserMode = isTeaserDisplayEnabled();
  const mintStatusHref = config.mintSurfaceEnabled ? "/mint" : "/transparency";
  const mintStatusLabel = config.mintSurfaceEnabled ? "Mint Status" : "Launch Status";
  const itemById = new Map(collection.items.map((item) => [item.token_id, item]));
  const naturalPreview = HOME_NATURAL_IDS.map((id) => itemById.get(id)).filter(Boolean);
  const specialPreview = HOME_SPECIAL_IDS.map((id) => itemById.get(id)).filter(Boolean);

  function previewSrc(item) {
    return item.image_preview_src || item.image_src || item.image_data_uri;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Public code, on-chain art</p>
          <h1>
            <span className="hero-title-line">1,000 cats.</span>
            <span className="hero-title-line">24×24 pixels.</span>
            <span className="hero-title-line">Fully on-chain.</span>
          </h1>
          <div className="hero-panel__lede-block">
            <p className="hero-panel__lede">
              Core Cats is a free-mint, zero-royalty NFT collection for Core Blockchain, built around public code,
              fixed manifests, and fully on-chain SVG metadata.
            </p>
            <a
              href="https://coreblockchain.net/"
              target="_blank"
              rel="noreferrer"
              className="hero-panel__supporting-link"
            >
              About Core Blockchain
            </a>
          </div>
          <div className="cta-row">
            <Link href="/collection" className="button button--primary">
              View Collection
            </Link>
            <Link href="/transparency" className="button button--ghost">
              Transparency
            </Link>
            <Link href={mintStatusHref} className="button button--ghost">
              {mintStatusLabel}
            </Link>
          </div>
        </div>

        <div className="curated-gallery">
          <section className="curated-gallery__band curated-gallery__band--natural">
            <header className="curated-gallery__header">
              <p className="eyebrow">Natural colorways</p>
              <h2>Grounded coats and familiar tones from the quieter side of the collection.</h2>
            </header>
            <div className="curated-gallery__grid">
              {naturalPreview.map((item) => (
                <Link key={item.token_id} href={`/cats/${item.token_id}`} className="hero-grid__item">
                  <img src={previewSrc(item)} alt={item.name} width="160" height="160" className="pixel-art" />
                </Link>
              ))}
            </div>
          </section>

          <section className="curated-gallery__band curated-gallery__band--special">
            <header className="curated-gallery__header">
              <p className="eyebrow">Rare traits and vivid palettes</p>
              <h2>
                {teaserMode
                  ? "Odd eyes, colored noses, eyewear, and two reserved super rares sit on the sharper side of Core Cats."
                  : "Odd eyes, colored noses, eyewear, and the two logo cats sit on the sharper side of Core Cats."}
              </h2>
            </header>
            <div className="curated-gallery__grid">
              {specialPreview.map((item) => (
                <Link key={item.token_id} href={`/cats/${item.token_id}`} className="hero-grid__item">
                  <img src={previewSrc(item)} alt={item.name} width="160" height="160" className="pixel-art" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="metric-strip">
        <Metric value={summary.total} label="Final Supply" />
        <Metric value={summary.counts.by_collar.with_collar} label="With Collar" />
        <Metric value={summary.counts.by_rarity_tier.rare} label="Rare" />
        <Metric value={summary.counts.by_rarity_tier.superrare} label="Super Rare" />
      </section>

      <section className="content-grid content-grid--single">
        <article className="info-panel">
          <p className="eyebrow">On-chain structure</p>
          <h2>The same records that define each cat also shape the collection view here.</h2>
          <p>
            The cats shown here follow the same finalized data that defines them on-chain. Traits, palettes,
            collars, and rarity are not being rewritten into a separate web-only catalog.
          </p>
        </article>
      </section>
    </div>
  );
}
