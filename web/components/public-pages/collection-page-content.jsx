import { Suspense } from "react";

import CollectionBrowser from "../../components/collection-browser";
import { getCollection, getFilters } from "../../lib/viewer-data";
import { getCorePublicConfig } from "../../lib/server/core-env";

export default async function CollectionPageContent({ configOverride = null } = {}) {
  const [collection, filtersDoc] = await Promise.all([getCollection(), getFilters()]);
  const config = {
    ...getCorePublicConfig(),
    ...(configOverride || {}),
  };

  return (
    <Suspense fallback={null}>
      <CollectionBrowser
        collection={collection}
        filtersDoc={filtersDoc}
        teaserEnabled={config.launchState !== "public"}
        statusSnapshotUrl={config.statusSnapshotUrl}
      />
    </Suspense>
  );
}
