export default function MintPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">Mint</p>
        <h1>Mint UI is not final yet.</h1>
        <p>
          The collection viewer is live first. Final mint UX depends on the next contract iteration, which still needs
          quantity mint support, transparent random assignment, and the production signature API shape.
        </p>
      </section>

      <section className="copy-grid">
        <article className="copy-card">
          <h2>What is already proven</h2>
          <p>
            Core Devin deployment succeeded, token minting was rehearsed, and tokenURI was decoded to confirm on-chain
            JSON plus on-chain SVG output.
          </p>
        </article>

        <article className="copy-card">
          <h2>What is still pending</h2>
          <p>
            The public mint page should not be shipped until the contract-side flow is fixed end-to-end. This page is
            intentionally explicit about that.
          </p>
        </article>
      </section>
    </div>
  );
}
