import { redirect } from "next/navigation";

import TransparencyPageContent from "../../components/public-pages/transparency-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";

export default function TransparencyPage() {
  const config = getCorePublicConfig();
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/transparency"));
  }

  return <TransparencyPageContent configOverride={config} />;
}
