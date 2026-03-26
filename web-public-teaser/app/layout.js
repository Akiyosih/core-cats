import "../../shared/public-site/globals.css";
import SiteHeader from "../../shared/public-site/components/site-header.jsx";
import SiteFooter from "../../shared/public-site/components/site-footer.jsx";
import { getPublicRuntimeConfig } from "../lib/public-runtime-config.js";

export const metadata = {
  title: "Core Cats",
  description:
    "Core Cats public browse site for a transparent, mobile-friendly, fully on-chain pixel cat gallery, ownership lookup, and verification references.",
};

export default function RootLayout({ children }) {
  const config = getPublicRuntimeConfig();
  const { launchState, publicTeaserSite, privateCanarySite } = config;
  const siteNotice =
    launchState === "closed"
      ? "This browse host stays online even when mint availability is paused on the separate mint surface."
      : launchState === "public"
        ? ""
        : publicTeaserSite
        ? "This browse host stays public while the separate mint surface is under limited verification."
        : privateCanarySite
          ? "Historical or private rehearsal host."
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
