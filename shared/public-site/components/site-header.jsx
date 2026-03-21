import Link from "next/link";
import { buildBrowseHref, buildMintHref, isAbsoluteHref } from "../lib/site-surface-links.js";

const links = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/my-cats", label: "My Cats" },
  { href: "/about", label: "About" },
  { href: "/transparency", label: "Transparency" },
  { href: "/mint", label: "Mint", soonBeforePublic: true },
];

export default function SiteHeader({ config }) {
  const showSoonBadge = config.launchState !== "public";
  const brandHref = buildBrowseHref(config, "/");

  return (
    <header className="site-header">
      <a href={brandHref} className="brand-mark">
        <span className="brand-mark__eyebrow">Core Cats</span>
        <span className="brand-mark__title">Full On-Chain Pixel Cats</span>
      </a>

      <nav className="main-nav" aria-label="Primary">
        {links.map((link) => {
          const mintDisabled = link.soonBeforePublic && !config.mintSurfaceEnabled && !config.mintBaseUrl;
          const badge = link.soonBeforePublic && showSoonBadge ? <span className="main-nav__badge">Soon</span> : null;
          const href = link.href === "/mint" ? buildMintHref(config, link.href) : buildBrowseHref(config, link.href);

          if (mintDisabled) {
            return (
              <span key={link.href} className="main-nav__item main-nav__item--disabled" aria-disabled="true">
                <span>{link.label}</span>
                {badge}
              </span>
            );
          }

          if (isAbsoluteHref(href)) {
            return (
              <a key={link.href} href={href} className="main-nav__item">
                <span>{link.label}</span>
                {badge}
              </a>
            );
          }

          return (
            <Link key={link.href} href={href} className="main-nav__item">
              <span>{link.label}</span>
              {badge}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
