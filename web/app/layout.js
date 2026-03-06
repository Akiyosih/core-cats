import "./globals.css";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";

export const metadata = {
  title: "Core Cats",
  description: "Core Cats web UI foundation for a transparent, full on-chain pixel cat collection.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <div className="ambient ambient--left" />
          <div className="ambient ambient--right" />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
