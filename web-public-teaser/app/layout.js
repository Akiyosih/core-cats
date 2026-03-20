import "../../shared/public-site/globals.css";
import SiteHeader from "../../shared/public-site/components/site-header.jsx";
import SiteFooter from "../../shared/public-site/components/site-footer.jsx";
import { getPublicRuntimeConfig } from "../lib/public-runtime-config.js";

export const metadata = {
  title: "Core Cats",
  description:
    "Core Cats public teaser site for a transparent, mobile-friendly, browse-first full on-chain pixel cat gallery, ownership lookup, centered CorePass helper guidance, balanced collection pagination, and verification references.",
};

export default function RootLayout({ children }) {
  const config = getPublicRuntimeConfig();
  const { launchState, publicTeaserSite, privateCanarySite } = config;
  const siteNotice =
    launchState === "closed"
      ? "Pre-mainnet teaser. Core Cats is still in final preparation. Mainnet deployment and public mint are not live yet."
      : publicTeaserSite
        ? "Public mint is not open yet. This public site is browse-only while the private mainnet rehearsal canary continues separately."
        : privateCanarySite
          ? "Private rehearsal canary. Public mint is not open yet."
          : "";

  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <div className="ambient ambient--left" />
          <div className="ambient ambient--right" />
          <SiteHeader config={config} />
          {siteNotice ? (
            <div
              className={`site-notice ${launchState === "canary" ? "site-notice--canary" : "site-notice--closed"}`}
              role="status"
              aria-live="polite"
            >
              {siteNotice}
            </div>
          ) : null}
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
