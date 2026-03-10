import Link from "next/link";
import { getCorePublicConfig } from "../lib/server/core-env";

const links = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/my-cats", label: "My Cats", soonBeforePublic: true },
  { href: "/about", label: "About" },
  { href: "/transparency", label: "Transparency" },
  { href: "/mint", label: "Mint", soonBeforePublic: true },
];

export default function SiteHeader() {
  const { launchState } = getCorePublicConfig();

  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-mark__eyebrow">Core Cats</span>
        <span className="brand-mark__title">Full On-Chain Pixel Cats</span>
      </Link>

      <nav className="main-nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="main-nav__item">
            <span>{link.label}</span>
            {launchState !== "public" && link.soonBeforePublic ? (
              <span className="main-nav__badge">Soon</span>
            ) : null}
          </Link>
        ))}
      </nav>
    </header>
  );
}
