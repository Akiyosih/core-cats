import { notFound } from "next/navigation";

import CatDetailPageContent, {
  generateCatDetailStaticParams,
} from "../../../../shared/public-site/components/public-pages/cat-detail-page-content.jsx";
import { PUBLIC_TEASER_CONTRACT_SURFACE } from "../../../lib/public-teaser-contract-surface.js";
import { getPublicRuntimeConfig } from "../../../lib/public-runtime-config.js";

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

  const config = {
    ...getPublicRuntimeConfig(),
    ...PUBLIC_TEASER_CONTRACT_SURFACE,
  };

  return CatDetailPageContent({
    tokenId,
    config,
  });
}
