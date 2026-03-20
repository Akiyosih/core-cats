import TransparencyPageContent from "../../../shared/public-site/components/public-pages/transparency-page-content.jsx";
import { PUBLIC_TEASER_CONTRACT_SURFACE } from "../../lib/public-teaser-contract-surface.js";
import { getPublicRuntimeConfig } from "../../lib/public-runtime-config.js";

export default function TransparencyPage() {
  const config = {
    ...getPublicRuntimeConfig(),
    ...PUBLIC_TEASER_CONTRACT_SURFACE,
  };

  return <TransparencyPageContent config={config} />;
}
