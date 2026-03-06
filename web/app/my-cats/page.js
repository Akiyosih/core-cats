export default function MyCatsPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel" style={{ textAlign: "center", padding: "64px 24px" }}>
        <p className="eyebrow" style={{ justifyContent: "center" }}>My Cats</p>
        <h1>Awaiting Owner Indexing</h1>
        <p style={{ maxWidth: 500, margin: "16px auto 0" }}>
          The Core contract is completely independent and not enumerable by design. 
          To honestly list assigned tokens here, an ownership mapping strategy is required.
        </p>
      </section>

      <section className="copy-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="copy-card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span role="img" aria-label="construction">🚧</span> Under Construction
          </h2>
          <p>
            We enforce strict technical honesty. Rather than using unreliable frontend tricks, 
            this view remains a stub until a robust indexer or cache logic is established for your verified CorePass identity.
          </p>
        </article>
      </section>
    </div>
  );
}
