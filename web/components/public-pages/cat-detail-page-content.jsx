import SharedCatDetailPageContent, {
  generateCatDetailStaticParams,
} from "../../../shared/public-site/components/public-pages/cat-detail-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env.js";

export { generateCatDetailStaticParams };

export default async function CatDetailPageContent({ tokenId, configOverride = null }) {
  const config = {
    ...getCorePublicConfig(),
    ...(configOverride || {}),
  };
  return <SharedCatDetailPageContent tokenId={tokenId} config={config} />;
}
