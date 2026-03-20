import { notFound, redirect } from "next/navigation";

import CatDetailPageContent, {
  generateCatDetailStaticParams,
} from "../../../components/public-pages/cat-detail-page-content.jsx";
import { getCollectionItem } from "../../../lib/viewer-data";
import { getCorePublicConfig } from "../../../lib/server/core-env";
import { buildBrowseHref, hasBrowseOrigin } from "../../../lib/site-surface-links.js";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return generateCatDetailStaticParams();
}

export default async function CatDetailPage({ params }) {
  const routeParams = await params;
  const tokenId = Number(routeParams?.tokenId);

  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 1000) {
    notFound();
  }

  const [item, config] = await Promise.all([getCollectionItem(tokenId), getCorePublicConfig()]);
  if (hasBrowseOrigin(config)) {
    redirect(buildBrowseHref(config, `/cats/${tokenId}`));
  }

  if (!item) {
    notFound();
  }
  return <CatDetailPageContent tokenId={tokenId} configOverride={config} />;
}
