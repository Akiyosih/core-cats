import SharedNotFoundPage from "../../shared/public-site/components/not-found-page.jsx";
import { getCorePublicConfig } from "../lib/server/core-env.js";

export default function NotFoundPage() {
  return <SharedNotFoundPage config={getCorePublicConfig()} />;
}
