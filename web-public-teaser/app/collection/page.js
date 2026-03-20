import CollectionPageContent from "../../../shared/public-site/components/public-pages/collection-page-content.jsx";
import { getPublicRuntimeConfig } from "../../lib/public-runtime-config.js";

export const dynamic = "force-static";

export default async function CollectionPage() {
  return CollectionPageContent({ config: getPublicRuntimeConfig() });
}
