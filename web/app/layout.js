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
        ? "Public mint is not open yet. This site is currently in a mainnet rehearsal canary while the official release is being prepared. You can already browse the collection."
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
