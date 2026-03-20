import { redirect } from "next/navigation";

import CollectionPageContent from "../../components/public-pages/collection-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";

export const dynamic = "force-static";

export default async function CollectionPage() {
  const config = getCorePublicConfig();
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/collection"));
  }
  return <CollectionPageContent configOverride={config} />;
}
