import Link from "next/link";

const DEFAULT_DEVIN_CORECATS_ADDRESS = "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba";

function looksLikePlaceholder(value) {
  return /replace-with/i.test(String(value || "").trim());
}

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

const verificationReferences = [
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/README.md",
    label: "Repository overview",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/WORK_PROCEDURE_CORE_BLOCKCHAIN.md",
    label: "Historical launch procedure",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/DECISIONS/ADR-0002-randomness-strategy.md",
    label: "Randomness strategy ADR",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/HISTORICAL_MAINNET_REHEARSAL_CONTRACTS.md",
    label: "Historical rehearsal contracts",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/OFFICIAL_CCAT_LAUNCH_PRINCIPLES.md",
    label: "Official CCAT launch principles",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/manifests/final_1000_manifest.json",
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

export default function TransparencyPageContent({ config }) {
  const networkName = normalize(config.networkName);
  const contractAddress = String(config.coreCatsAddress || "").trim();
  const rendererAddress = String(config.coreCatsRendererAddress || "").trim();
  const dataAddress = String(config.coreCatsDataAddress || "").trim();
  const explorerBaseUrl = String(config.explorerBaseUrl || "").trim();
  const usesDevinDefault = normalize(contractAddress) === DEFAULT_DEVIN_CORECATS_ADDRESS;
  const contractPending =
    networkName === "mainnet" &&
    (!isCoreAddress(contractAddress) || usesDevinDefault || looksLikePlaceholder(contractAddress));
  const rendererPending = !isCoreAddress(rendererAddress) || looksLikePlaceholder(rendererAddress);
  const dataPending = !isCoreAddress(dataAddress) || looksLikePlaceholder(dataAddress);
  const contractHref = contractPending ? "" : buildExplorerAddressUrl(explorerBaseUrl, contractAddress);
  const rendererHref = rendererPending ? "" : buildExplorerAddressUrl(explorerBaseUrl, rendererAddress);
  const dataHref = dataPending ? "" : buildExplorerAddressUrl(explorerBaseUrl, dataAddress);
  const contractStatus = contractPending
    ? "Mainnet deployment pending"
    : networkName === "mainnet" && config.launchState === "public"
      ? "Official mainnet contract live"
      : networkName === "mainnet" && config.launchState === "canary"
        ? "Historical prelaunch record"
        : networkName === "mainnet"
          ? "Mainnet contract configured"
        : "Historical devin rehearsal contract";
  const verificationLinks = [
    { href: "https://github.com/Akiyosih/core-cats", label: "GitHub repository" },
    { href: explorerBaseUrl, label: "Blockindex explorer" },
    ...verificationReferences,
  ].filter((item) => item.href);

  return (
    <div className="page-stack">
      <section className="copy-panel">
        <p className="eyebrow">Transparency</p>
        <h1>Check the live contract surface and public artifacts.</h1>
        <p>
          Use this page to verify what is live right now, how the published mint path worked, and where to inspect the
          public artifacts yourself.
        </p>
        <p>
          This is not a promise of safety. It is a map of what can be inspected directly in the contract, explorer,
          and repository.
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
                {config.publicTeaserSite ? "Public browse" : config.privateCanarySite ? "Private canary" : "Official mint"}
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
                <strong>Metadata renderer:</strong>{" "}
                {rendererPending ? (
                  "This surface has not published the renderer address yet."
                ) : (
                  <Link href={rendererHref} target="_blank" rel="noreferrer" className="resource-link">
                    {rendererAddress}
                  </Link>
                )}
              </li>
              <li>
                <strong>On-chain data:</strong>{" "}
                {dataPending ? (
                  "This surface has not published the on-chain data address yet."
                ) : (
                  <Link href={dataHref} target="_blank" rel="noreferrer" className="resource-link">
                    {dataAddress}
                  </Link>
                )}
              </li>
              <li>
                <strong>Contract verification status:</strong>{" "}
                {contractPending
                  ? "Verification depends on the final published contract address."
                  : rendererPending || dataPending
                    ? "CoreCats is published here, but the renderer/data surface is still incomplete on this host."
                    : "Check the explorer contract pages and the published repository artifacts together."}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="Official CCAT Posture" title="What the released contract is meant to guarantee">
          These are the intended principles for the official `CCAT` contract. Compare them with the current live
          surface above and the linked public artifacts rather than trusting the website alone.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>Intended on-chain guarantees</h2>
            <ul className="plain-list">
              <li>Minted cats should not change after mint: image, name, description, and attributes are meant to stay fixed.</li>
              <li>The official release target is deploy-time immutability rather than a later admin lock.</li>
              <li>The intended on-chain rule is `1000` total cats and `3` cats per wallet.</li>
              <li>The intended official mint policy is permissionless rather than allowlist or signer gated.</li>
              <li>The intended official contract posture is no retained owner/admin path after deploy.</li>
            </ul>
          </article>

          <article className="copy-card">
            <h2>Verification boundary</h2>
            <ul className="plain-list">
              <li>`Fully on-chain` is meant to describe the NFT object and mint rule, not the web UI itself.</li>
              <li>The mint website, collection browser, and callback UX are convenience layers, not the NFT.</li>
              <li>`3 per wallet` is the stated rule; Core Cats does not claim to enforce `3 per human` under the current architecture.</li>
              <li>Public promises should stay limited to what the chain, source, and published evidence can actually prove.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="How Minting Worked" title="How the approvals and delivery fit together">
          The public mint is complete, but the structure of the historical mint flow still matters for verification.
          It is summarized here as first approval, second approval, and finalize rather than only as QR labels.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>First approval: bind one wallet</h2>
            <ul className="plain-list">
              <li>The first CorePass approval binds one wallet to the current mint session.</li>
              <li>Depending on the live flow, this can appear as a login or wallet-binding confirmation in CorePass.</li>
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
              <li>The published randomness path uses commit, a future block, and on-chain finalize rather than a one-step reveal.</li>
              <li>This design can be replay-checked from public chain data without adding a separate VRF or oracle dependency.</li>
              <li>This is why mint completion can take longer than a single block even on a fast chain.</li>
              <li>When finalize completes, the cat arrives already revealed for that mint rather than waiting for a later collection-wide reveal.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="How To Verify" title="How to verify it yourself">
          If you want the practical checks rather than the architecture, start with the checklist and then use the
          listed surfaces to inspect the published contract, historical mint transactions, and repository artifacts.
        </SectionHeading>
        <div className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>Quick verification checklist</h2>
            <ol className="plain-list">
              <li>Check the current contract address on this page against the explorer and repository references.</li>
              <li>When reviewing historical mint transactions, confirm the first approval only binds one wallet and does not move tokens.</li>
              <li>For historical mint calls, confirm <span className="mono-wrap">to</span> matches the published contract and <span className="mono-wrap">value</span> is <span className="mono-wrap">0</span>.</li>
              <li>Treat `approve`, `setApprovalForAll`, or unrelated token transfers as outside the published Core Cats mint flow.</li>
              <li>Inspect transaction results in Blockindex when checking historical mint or ownership activity.</li>
              <li>Compare explorer details, trust notes, and repository artifacts when you want deeper assurance.</li>
            </ol>
          </article>

          <article className="copy-card">
            <h2>Where each check lives</h2>
            <ul className="plain-list">
              <li><strong>Inside CorePass:</strong> approval type, destination address, value field, and the long <span className="mono-wrap">0x...</span> calldata.</li>
              <li><strong>Inside Blockindex:</strong> contract page, submitted transaction fields, execution result, and verified source / ABI if available.</li>
              <li><strong>Inside GitHub:</strong> contract logic, randomness documentation, trust-surface notes, and release runbooks.</li>
              <li><strong>About the long 0x field:</strong> it is encoded calldata. It is not meant to be human-readable directly, but it can still be compared against the published ABI and explorer transaction details.</li>
            </ul>
          </article>

          <article className="copy-card transparency-card--wide">
            <h2>What this page does not prove for you</h2>
            <ul className="plain-list">
              <li>This page combines the live contract surface with repository notes. The explorer entries and published artifacts remain the primary verification surface.</li>
              <li>The top-level CoreCats contract file is not the whole review surface; imported dependency contracts also matter.</li>
              <li>The active contract build path uses the Core-specific Ylem / Foxar / Spark toolchain, not a generic Ethereum-only path.</li>
              <li>Historical rehearsal contracts, notes, and canary records remain public evidence, but they are not the canonical `CCAT` collection.</li>
              <li>If explorer verification is missing or incomplete, rely on the published verify packet or equivalent reproducibility evidence before treating the deployment as fully inspectable.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-stack transparency-section">
        <SectionHeading eyebrow="References" title="Where to inspect more">
          Use these links to inspect the public project surface, the explorer entry points, and the repository
          references for renderer logic, data tables, manifests, and historical rehearsal evidence.
        </SectionHeading>
        <div className="copy-grid">
          <article className="copy-card transparency-card--wide">
            <h2>Verification references</h2>
            <ul className="plain-list transparency-reference-list">
              {verificationLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} target="_blank" rel="noreferrer" className="resource-link">
                    {link.label}
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
