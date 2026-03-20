import { redirect } from "next/navigation";

import AboutPageContent from "../../components/public-pages/about-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../lib/site-surface-links.js";

export default function AboutPage() {
  const config = getCorePublicConfig();
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, "/about"));
  }

  return <AboutPageContent />;
}
