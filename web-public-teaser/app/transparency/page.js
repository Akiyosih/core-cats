import TransparencyPageContent from "../../../web/components/public-pages/transparency-page-content.jsx";
import { PUBLIC_TEASER_CONTRACT_SURFACE } from "../../lib/public-teaser-contract-surface.js";

export default function TransparencyPage() {
  return <TransparencyPageContent configOverride={PUBLIC_TEASER_CONTRACT_SURFACE} />;
}
