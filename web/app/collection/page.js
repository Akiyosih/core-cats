import CollectionBrowser from "../../components/collection-browser";
import { getCollection, getFilters } from "../../lib/viewer-data";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [collection, filtersDoc] = await Promise.all([getCollection(), getFilters()]);
  const { launchState, statusSnapshotUrl } = getCorePublicConfig();

  return (
    <CollectionBrowser
      collection={collection}
      filtersDoc={filtersDoc}
      teaserEnabled={launchState !== "public"}
      statusSnapshotUrl={statusSnapshotUrl}
    />
  );
}
