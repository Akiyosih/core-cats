import Link from "next/link";

const publicLinks = [
  { href: "https://github.com/Akiyosih/core-cats", label: "GitHub Repository" },
  { href: "https://xab.blockindex.net/address/ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba", label: "CoreCats Contract (Devin rehearsal)" },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/CORE_TESTNET_DEPLOY_RUNBOOK.md",
    label: "Core Devin deploy runbook",
  },
];

const repositoryFiles = [
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md",
    label: "Work procedure",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md",
    label: "Mainnet closed launch runbook",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/CORE_TESTNET_DEPLOY_RUNBOOK.md",
    label: "Core Devin deploy runbook",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/manifests/final_1000_manifest_v1.json",
    label: "Final 1000 manifest",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/manifests/viewer_v1/summary.json",
    label: "Viewer summary",
  },
];

export default function TransparencyPage() {
  return (
    <div className="page-stack narrow-stack">
      <section className="copy-panel">
        <p className="eyebrow">Transparency</p>
        <h1>Inspect the artifacts, not just the claims.</h1>
        <p>
          Core Cats is meant to be checked from the outside. Art manifests, renderer inputs, deployment notes, and
          rehearsal records are published so the collection can be examined directly.
        </p>
      </section>

      <section className="copy-grid copy-grid--two">
        <article className="copy-card">
          <h2>Public links</h2>
          <ul className="plain-list">
            {publicLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} target="_blank" rel="noreferrer" className="resource-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="copy-card">
          <h2>Key repository files</h2>
          <ul className="plain-list">
            {repositoryFiles.map((item) => (
              <li key={item.href}>
                <Link href={item.href} target="_blank" rel="noreferrer" className="resource-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
