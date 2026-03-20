import Link from "next/link";

import { buildBrowseHref, isAbsoluteHref } from "../lib/site-surface-links.js";

export default function NotFoundPage({ config }) {
  const homeHref = buildBrowseHref(config, "/");
  const collectionHref = buildBrowseHref(config, "/collection");

  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">Not Found</p>
        <h1>This page could not be found.</h1>
        <p>The page may have moved, or the token id may be outside the published Core Cats collection range.</p>
        <div className="copy-panel__actions">
          {isAbsoluteHref(homeHref) ? (
            <a href={homeHref} className="button button--ghost">
              Go home
            </a>
          ) : (
            <Link href={homeHref} className="button button--ghost">
              Go home
            </Link>
          )}
          {isAbsoluteHref(collectionHref) ? (
            <a href={collectionHref} className="button button--ghost">
              Browse collection
            </a>
          ) : (
            <Link href={collectionHref} className="button button--ghost">
              Browse collection
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
