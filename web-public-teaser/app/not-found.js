import NotFoundPage from "../../shared/public-site/components/not-found-page.jsx";
import { getPublicRuntimeConfig } from "../lib/public-runtime-config.js";

export default function PublicTeaserNotFoundPage() {
  return <NotFoundPage config={getPublicRuntimeConfig()} />;
}
