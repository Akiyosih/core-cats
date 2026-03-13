import "../../web/app/globals.css";
import SiteHeader from "../../web/components/site-header";
import SiteFooter from "../../web/components/site-footer";
import { getCorePublicConfig } from "../../web/lib/server/core-env";

export const metadata = {
  title: "Core Cats",
  description: "Core Cats public teaser site for a transparent, mobile-friendly browse-first full on-chain pixel cat collection.",
};

export default function RootLayout({ children }) {
  const { launchState, publicTeaserSite, privateCanarySite } = getCorePublicConfig();
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
          <SiteHeader />
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
