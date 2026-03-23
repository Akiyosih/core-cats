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
      ? "Public mint is not open yet. Browse the collection here, check transparency, and return to the official mint host when launch opens."
      : launchState === "public"
        ? ""
        : publicTeaserSite
        ? "Final prelaunch checks are underway. This public site stays browse-first while the official mint host remains closed to the public."
        : privateCanarySite
          ? "Private rehearsal host. Public mint remains closed until the official mint host opens."
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
