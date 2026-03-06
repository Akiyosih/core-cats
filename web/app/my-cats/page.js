export default function MyCatsPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">My Cats</p>
        <h1>Owner-specific indexing is pending.</h1>
        <p>
          The current Core contract is not enumerable, so this page cannot be completed honestly until the project
          chooses an owner indexing strategy for the UI.
        </p>
      </section>

      <section className="copy-grid">
        <article className="copy-card">
          <h2>Why this is deferred</h2>
          <p>
            There is no `tokenOfOwnerByIndex` assumption in the current implementation. A correct UI will need either
            indexed transfer history, an app-side cache, or another explicit owner lookup path.
          </p>
        </article>
      </section>
    </div>
  );
}
