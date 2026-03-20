import SharedCollectionPageContent from "../../../shared/public-site/components/public-pages/collection-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env.js";

export default async function CollectionPageContent({ configOverride = null } = {}) {
  const config = {
    ...getCorePublicConfig(),
    ...(configOverride || {}),
  };
  return <SharedCollectionPageContent config={config} />;
}
