import Link from "next/link";

const docs = [
  { href: "https://github.com/Akiyosih/core-cats", label: "GitHub Repository" },
  { href: "https://xab.blockindex.net/address/ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba", label: "CoreCats Contract (Devin)" },
  { href: "https://xab.blockindex.net/address/ab6204d634c05880e35ea2c9c7cb03c9aa0a87f5c510", label: "Metadata Renderer (Devin)" },
  { href: "https://xab.blockindex.net/address/ab61bc332a3cafa28c5359587c438f087d99a24938b9", label: "On-Chain Data Contract (Devin)" },
];

const localDocs = [
  "../docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md",
  "../docs/CORE_TESTNET_DEPLOY_RUNBOOK.md",
  "../docs/VIEWER_DATA_PIPELINE.md",
  "../manifests/final_1000_manifest_v1.json",
  "../manifests/viewer_v1/summary.json",
];

export default function TransparencyPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">Transparency</p>
        <h1>Inspect the artifacts, not just the claims.</h1>
        <p>
          The public story for Core Cats is meant to be reproducible. Art manifests, renderer inputs, deployment
          notes, and testnet rehearsal data are all being collected so outsiders can inspect what exists now.
        </p>
      </section>

      <section className="copy-grid">
        <article className="copy-card">
          <h2>Public links</h2>
          <ul className="plain-list">
            {docs.map((item) => (
              <li key={item.href}>
                <Link href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="copy-card">
          <h2>Repository files used by the current viewer</h2>
          <ul className="plain-list">
            {localDocs.map((file) => (
              <li key={file}>
                <code>{file}</code>
              </li>
            ))}
          </ul>
        </article>

        <article className="copy-card">
          <h2>Current limitations</h2>
          <ul className="plain-list">
            <li>`/mint` now follows CorePass QR/app-link protocol flow, but production still needs a durable session store.</li>
            <li>Current local validation is blocked at the wallet layer because the available CorePass app exposes only mainnet `cb...` accounts, not Devin `ab...` accounts.</li>
            <li>Relayer-assisted auto-finalize is implemented as an operational convenience, not as a trust assumption.</li>
            <li>Wallet-specific owner indexing for My Cats is not implemented yet.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
