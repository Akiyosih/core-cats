import { Suspense } from "react";

import CollectionBrowser from "../collection-browser.jsx";
import { getCollection, getFilters } from "../../lib/viewer-data.js";

export default async function CollectionPageContent({ config }) {
  const teaserEnabled = config.launchState !== "public";
  const [collection, filtersDoc] = await Promise.all([getCollection(teaserEnabled), getFilters(teaserEnabled)]);

  return (
    <Suspense fallback={null}>
      <CollectionBrowser collection={collection} filtersDoc={filtersDoc} teaserEnabled={teaserEnabled} />
    </Suspense>
  );
}
