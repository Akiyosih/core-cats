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

  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <div className="ambient ambient--left" />
          <div className="ambient ambient--right" />
          <SiteHeader />
          {launchState === "closed" ? (
            <div className="site-notice" role="status" aria-live="polite">
              Pre-mainnet teaser. Core Cats is still in final preparation. Mainnet deployment and public mint are
              not live yet.
            </div>
          ) : null}
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
