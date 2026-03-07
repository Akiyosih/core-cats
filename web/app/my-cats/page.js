export default function MyCatsPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel my-cats-panel">
        <p className="eyebrow my-cats-eyebrow">My Cats</p>
        <h1>Awaiting Owner Indexing</h1>
        <p className="my-cats-copy">
          This page will list the cats held by a connected wallet once a reliable owner indexing path is ready.
        </p>
      </section>

      <section className="copy-grid my-cats-grid">
        <article className="copy-card my-cats-card">
          <h2>Coming later</h2>
          <p>
            Rather than guessing from incomplete wallet data, this view will open once it can show ownership cleanly
            and reliably.
          </p>
        </article>
      </section>
    </div>
  );
}
