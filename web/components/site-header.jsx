import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/my-cats", label: "My Cats" },
  { href: "/about", label: "About" },
  { href: "/transparency", label: "Transparency" },
  { href: "/mint", label: "Mint" },
];

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-mark__eyebrow">Core Cats</span>
        <span className="brand-mark__title">Full On-Chain Pixel Cats</span>
      </Link>

      <nav className="main-nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
