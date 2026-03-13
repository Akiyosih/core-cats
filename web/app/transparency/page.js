import Link from "next/link";
import {
  DEFAULT_DEVIN_CORECATS_ADDRESS,
  getCorePublicConfig,
  looksLikePlaceholder,
} from "../../lib/server/core-env";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isCoreAddress(value) {
  return /^(ab|cb)[0-9a-f]{42}$/i.test(String(value || "").trim());
}

function titleCase(value) {
  const text = String(value || "").trim();
  return text ? `${text.slice(0, 1).toUpperCase()}${text.slice(1)}` : "Unknown";
}

function buildExplorerAddressUrl(explorerBaseUrl, address) {
  if (!address) return "";
  return `${String(explorerBaseUrl || "").replace(/\/$/, "")}/address/${address}`;
}

const repositoryFiles = [
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/README.md",
    label: "Repository overview",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md",
    label: "Work procedure",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/MAINNET_CLOSED_LAUNCH_RUNBOOK.md",
    label: "Mainnet closed launch runbook",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/CCATTEST_REHEARSAL_CANARY_PLAN.md",
    label: "CCATTEST rehearsal canary plan",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/DECISIONS/ADR-0002-randomness-strategy.md",
    label: "Randomness strategy ADR",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/manifests/final_1000_manifest_v1.json",
    label: "Final 1000 manifest",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/TRUST_AND_PRIVACY_SURFACE.md",
    label: "Trust + privacy notes",
  },
];

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="transparency-section__heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export default function TransparencyPage() {
  const config = getCorePublicConfig();
  const networkName = normalize(config.networkName);
  const contractAddress = String(config.coreCatsAddress || "").trim();
  const explorerBaseUrl = String(config.explorerBaseUrl || "").trim();
  const usesDevinDefault = normalize(contractAddress) === DEFAULT_DEVIN_CORECATS_ADDRESS;
  const contractPending =
    networkName === "mainnet" && (!isCoreAddress(contractAddress) || usesDevinDefault || looksLikePlaceholder(contractAddress));
  const contractHref = contractPending ? "" : buildExplorerAddressUrl(explorerBaseUrl, contractAddress);
  const contractStatus = contractPending
    ? "Mainnet deployment pending"
    : networkName === "mainnet" && config.launchState === "canary"
      ? "Mainnet canary contract configured"
      : networkName === "mainnet"
        ? "Mainnet contract configured"
        : "Devin rehearsal contract configured";
  const publicLinks = [
    { href: config.siteBaseUrl, label: "Official website" },
    { href: "https://github.com/Akiyosih/core-cats", label: "GitHub repository" },
    { href: explorerBaseUrl, label: "Blockindex explorer" },
    {
      href: "https://github.com/Akiyosih/core-cats/blob/main/docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md",
      label: "Vercel mainnet cutover checklist",
    },
  ].filter((item) => item.href);

  return (
    <div className="page-stack">
      <section className="copy-panel">
        <p className="eyebrow">Transparency</p>
        <h1>Check the live contract surface and public artifacts.</h1>
        <p>
          Use this page to verify what is live right now, how the mint flow is structured, and where to inspect the
          public artifacts yourself.
        </p>
        <p>
          This is not a promise of safety. It is a map of what you can inspect for yourself before and after minting.
        </p>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="Current Live Surface" title="What is live right now">
          Start here if you want to confirm the current network, launch stage, and contract address before looking at
          the mint flow itself.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card transparency-card--wide">
            <h2>Published contract surface</h2>
            <ul className="plain-list">
              <li>
                <strong>Network:</strong> {titleCase(config.networkName)}
              </li>
              <li>
                <strong>Launch state:</strong> {titleCase(config.launchState)}
              </li>
              <li>
                <strong>Site surface:</strong>{" "}
                {config.publicTeaserSite ? "Public teaser" : config.privateCanarySite ? "Private canary" : "Public mint"}
              </li>
              <li>
                <strong>Contract status:</strong> {contractStatus}
              </li>
              <li>
                <strong>Contract:</strong>{" "}
                {contractPending ? (
                  "The public site is live, but the final mainnet contract address has not been published here yet."
                ) : (
                  <Link href={contractHref} target="_blank" rel="noreferrer" className="resource-link">
                    {contractAddress}
                  </Link>
                )}
              </li>
              <li>
                <strong>Contract verification status:</strong>{" "}
                {contractPending
                  ? "Verification depends on the final published contract address."
                  : "Check the explorer contract page and the published repository artifacts together."}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="How This Mint Works" title="How the approvals and delivery fit together">
          This page should still make sense on its own, so the mint flow is described here as first approval, second
          approval, and finalize rather than only as QR labels.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>First approval: bind one wallet</h2>
            <ul className="plain-list">
              <li>The first CorePass approval is a wallet-binding signature for the current mint session.</li>
              <li>It proves control of one wallet for that session.</li>
              <li>It is not a token transfer.</li>
              <li>No mint transaction is sent yet at this stage.</li>
            </ul>
          </article>

          <article className="copy-card">
            <h2>Second approval: send the mint call</h2>
            <ul className="plain-list">
              <li>The second CorePass approval is the mint contract call.</li>
              <li>
                The <span className="mono-wrap">to</span> address should match the published CoreCats contract.
              </li>
              <li>
                The <span className="mono-wrap">value</span> field should be <span className="mono-wrap">0</span>.
              </li>
              <li>Gas is still required even when no native token amount is sent to the contract.</li>
            </ul>
          </article>

          <article className="copy-card transparency-card--wide">
            <h2>Finalize: random assignment and revealed delivery</h2>
            <p>
              Mint delivery is not complete at commit. After the mint call, a separate finalize step completes the
              random assignment and delivers the NFT.
            </p>
            <ul className="plain-list">
              <li>
                The published randomness path uses commit, a future block, and on-chain finalize rather than a
                one-step reveal.
              </li>
              <li>
                This design can be replay-checked from public chain data without adding a separate VRF or oracle
                dependency.
              </li>
              <li>
                This is why mint completion can take longer than a single block even on a fast chain.
              </li>
              <li>
                When finalize completes, the cat arrives already revealed for that mint rather than waiting for a later
                collection-wide reveal.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="How To Verify" title="How to verify it yourself">
          If you want the practical checks rather than the architecture, start with the checklist and then use the
          listed surfaces to inspect the details.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>Quick verification checklist</h2>
            <ol className="plain-list">
              <li>Check the current contract address on this page before minting.</li>
              <li>In CorePass, confirm the first approval is a signature and the second approval is a contract call.</li>
              <li>
                For the mint call, confirm <span className="mono-wrap">to</span> matches the published contract and{" "}
                <span className="mono-wrap">value</span> is <span className="mono-wrap">0</span>.
              </li>
              <li>After submission, inspect the transaction result in Blockindex.</li>
              <li>Compare explorer details and repository artifacts when you want deeper assurance.</li>
            </ol>
          </article>

          <article className="copy-card">
            <h2>Where each check lives</h2>
            <ul className="plain-list">
              <li>
                <strong>Inside CorePass:</strong> approval type, destination address, value field, and the long{" "}
                <span className="mono-wrap">0x...</span> calldata.
              </li>
              <li>
                <strong>Inside Blockindex:</strong> contract page, submitted transaction fields, execution result, and
                verified source / ABI if available.
              </li>
              <li>
                <strong>Inside GitHub:</strong> contract logic, randomness documentation, trust-surface notes, and
                release runbooks.
              </li>
              <li>
                <strong>About the long 0x field:</strong> it is encoded calldata. It is not meant to be human-readable
                directly, but it can still be compared against the published ABI and explorer transaction details.
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="References" title="Where to inspect more">
          If you want to go deeper than the quick checks above, use these public links and repository documents.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>Official links</h2>
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
        </div>
      </section>
    </div>
  );
}
