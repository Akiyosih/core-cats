import "./globals.css";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { getCorePublicConfig } from "../lib/server/core-env";

export const metadata = {
  title: "Core Cats",
  description: "Core Cats web UI foundation for a transparent, full on-chain pixel cat collection.",
};

export default function RootLayout({ children }) {
  const { launchState } = getCorePublicConfig();
  const siteNotice =
    launchState === "closed"
      ? "Pre-mainnet teaser. Core Cats is still in final preparation. Mainnet deployment and public mint are not live yet."
      : launchState === "canary"
        ? "Official release is not live yet. Thanks for visiting early. The mainnet rehearsal canary is open, and you can already enjoy the art and collection while the final public launch is still being prepared."
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
