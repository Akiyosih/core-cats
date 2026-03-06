import Link from "next/link";

const docs = [
  { href: "https://github.com/Akiyosih/core-cats", label: "GitHub Repository" },
  { href: "https://xab.blockindex.net/address/ab58e879a3b77a58dbd2a0016a2ee56a8b6352ccaec5", label: "CoreCats Contract (Devin)" },
  { href: "https://xab.blockindex.net/address/ab46969ce93676eb4ff5a82e02a1c712f7d076ca1901", label: "Metadata Renderer (Devin)" },
  { href: "https://xab.blockindex.net/address/ab955ac6d28cfd8dd41fcae677dc8968c4b26e1f17b1", label: "On-Chain Data Contract (Devin)" },
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
            <li>Final quantity mint flow is not implemented yet.</li>
            <li>Transparent random assignment is not implemented yet.</li>
            <li>Wallet-specific owner indexing for My Cats is not implemented yet.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
