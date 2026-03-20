import SharedSiteHeader from "../../shared/public-site/components/site-header.jsx";
import { getCorePublicConfig } from "../lib/server/core-env.js";

export default function SiteHeader() {
  return <SharedSiteHeader config={getCorePublicConfig()} />;
}
