export default function AboutPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">About</p>
        <h1>Why Core Cats exists</h1>
        <p>
          Core Cats is being built as a careful, public, full on-chain NFT project. The aim is not extraction. The
          aim is to make something technically rigorous, visually coherent, and easy for third parties to inspect.
        </p>
      </section>

      <section className="copy-grid">
        <article className="copy-card">
          <h2>24x24 by design</h2>
          <p>
            The collection is small in canvas size on purpose. The work is in composition, palettes, trait balance,
            and on-chain reproducibility rather than inflated asset weight.
          </p>
        </article>
        <article className="copy-card">
          <h2>Full on-chain rendering</h2>
          <p>
            Metadata and SVG are generated from packed on-chain data structures. The current viewer pipeline mirrors
            that logic so the repository can expose the collection clearly before final mint UX is complete.
          </p>
        </article>
        <article className="copy-card">
          <h2>Transparent operations</h2>
          <p>
            Repository manifests, trait summaries, deploy notes, and runbooks are being kept alongside the
            implementation so outside reviewers can inspect the process instead of trusting vague claims.
          </p>
        </article>
      </section>
    </div>
  );
}
