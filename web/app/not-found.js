import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">Not Found</p>
        <h1>This page could not be found.</h1>
        <p>
          The page may have moved, or the token id may be outside the published Core Cats collection range.
        </p>
        <div className="copy-panel__actions">
          <Link href="/" className="button button--ghost">
            Go home
          </Link>
          <Link href="/collection" className="button button--ghost">
            Browse collection
          </Link>
        </div>
      </section>
    </div>
  );
}
