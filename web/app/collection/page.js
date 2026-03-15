import { Suspense } from "react";
import { redirect } from "next/navigation";

import CollectionBrowser from "../../components/collection-browser";
import { getCollection, getFilters } from "../../lib/viewer-data";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";

export const dynamic = "force-static";

export default async function CollectionPage() {
  const [collection, filtersDoc, config] = await Promise.all([getCollection(), getFilters(), getCorePublicConfig()]);
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/collection"));
  }
  const { launchState, statusSnapshotUrl } = config;

  return (
    <Suspense fallback={null}>
      <CollectionBrowser
        collection={collection}
        filtersDoc={filtersDoc}
        teaserEnabled={launchState !== "public"}
        statusSnapshotUrl={statusSnapshotUrl}
      />
    </Suspense>
  );
}
