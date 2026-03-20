import SharedTransparencyPageContent from "../../../shared/public-site/components/public-pages/transparency-page-content.jsx";
import { getCorePublicConfig } from "../../lib/server/core-env.js";

export default function TransparencyPageContent({ configOverride = null } = {}) {
  const config = {
    ...getCorePublicConfig(),
    ...(configOverride || {}),
  };
  return <SharedTransparencyPageContent config={config} />;
}
