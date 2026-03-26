import "./globals.css";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { getCorePublicConfig } from "../lib/server/core-env";

function resolveMetadataBase(siteBaseUrl) {
  if (!siteBaseUrl) return undefined;
  try {
    return new URL(siteBaseUrl);
  } catch {
    return undefined;
  }
}

export function generateMetadata() {
  const config = getCorePublicConfig();
  const metadataBase = resolveMetadataBase(config.siteBaseUrl);
  const description = config.privateCanarySite
    ? `${config.privateCanaryBadgeText}. ${config.privateCanaryTitleText}. ${config.privateCanaryWarningText}. This host is for a separate mainnet rehearsal and is not the official public mint.`
    : "Core Cats public mint and ownership lookup surface for the sold-out fully on-chain pixel cat collection.";

  return {
    metadataBase,
    alternates: metadataBase
      ? {
          canonical: "/",
        }
      : undefined,
    title: config.privateCanarySite ? `${config.privateCanaryTitleText} | Core Cats` : "Core Cats",
    description,
    robots: config.privateCanarySite
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : undefined,
  };
}

export default function RootLayout({ children }) {
  const config = getCorePublicConfig();
  const { launchState, publicTeaserSite, privateCanarySite } = config;
  const siteNotice =
    launchState === "closed"
      ? "This mint host can remain online even when new minting is paused."
      : publicTeaserSite
        ? "This host is browse-first. Mint activity belongs on the separate mint surface."
        : privateCanarySite
          ? `${config.privateCanaryBadgeText} · ${config.privateCanaryTitleText} · ${config.privateCanaryWarningText}. This is a separate rehearsal host, not the official public mint entry.`
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
