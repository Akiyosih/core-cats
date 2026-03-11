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
  const launchInterpretation =
    config.launchState === "canary"
      ? "The public mint UI is in validation mode. The currently configured contract may still be a rehearsal contract rather than the final public release contract."
      : config.launchState === "public"
        ? "The current contract surface is intended for the live public mint path."
        : "The site is visible, but the public mint path is intentionally still closed.";

  const publicLinks = [
    { href: "https://core-cats.vercel.app", label: "Official website" },
    { href: "https://core-cats.vercel.app/mint", label: "Mint page" },
    { href: "https://github.com/Akiyosih/core-cats", label: "GitHub Repository" },
    { href: explorerBaseUrl, label: "Configured explorer" },
    {
      href: "https://github.com/Akiyosih/core-cats/blob/main/docs/VERCEL_MAINNET_CUTOVER_CHECKLIST.md",
      label: "Vercel mainnet cutover checklist",
    },
  ];

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
          <h2>Published contract surface</h2>
          <ul className="plain-list">
            <li>
              <strong>Network:</strong> {titleCase(config.networkName)}
            </li>
            <li>
              <strong>Launch state:</strong> {titleCase(config.launchState)}
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
            <li>
              <strong>Signer policy:</strong> Mint authorization is currently issued off-chain. Compare that trust surface with the repository notes before minting.
            </li>
          </ul>
        </article>

        <article className="copy-card">
          <h2>Current validation stage</h2>
          <p>{launchInterpretation}</p>
          <p>
            Do not assume that a canary-stage contract is automatically the later official public contract. Verify the
            address shown above and compare it against the runbook and rehearsal-plan documents.
          </p>
        </article>

        <article className="copy-card">
          <h2>What users should verify in CorePass</h2>
          <ul className="plain-list">
            <li>
              <strong>QR 1:</strong> it is a signature request for wallet binding.
            </li>
            <li>
              <strong>QR 2:</strong> it is a contract call for minting.
            </li>
            <li>
              <strong>Destination address:</strong> <span className="mono-wrap">to</span> should match the published CoreCats contract address.
            </li>
            <li>
              <strong>Value field:</strong> <span className="mono-wrap">value</span> should be <span className="mono-wrap">0</span> for the mint call.
            </li>
            <li>
              <strong>Gas:</strong> gas is still required even when <span className="mono-wrap">value = 0</span>.
            </li>
          </ul>
        </article>

        <article className="copy-card">
          <h2>What the long 0x data means</h2>
          <ul className="plain-list">
            <li>It is encoded contract call data, also called calldata.</li>
            <li>It is not meant to be human-readable directly in the wallet UI.</li>
            <li>It can still be checked against the published ABI, function flow, and explorer transaction data.</li>
            <li>The public contract design for this mint path is a two-step commit/finalize flow with auditable random assignment.</li>
          </ul>
        </article>

        <article className="copy-card">
          <h2>How to independently verify</h2>
          <ul className="plain-list">
            <li>Compare the addresses shown in CorePass with the published addresses on this page and in the repository.</li>
            <li>Inspect submitted transactions in the explorer to confirm the destination, input data, and result.</li>
            <li>Compare the published contract flow and ABI with what appears in the wallet and explorer.</li>
            <li>Review the randomness strategy and transparency notes instead of relying on marketing claims.</li>
            <li>When explorer verification is available, compare the verified source and ABI with the GitHub repository.</li>
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

        <article className="copy-card">
          <h2>Current trust surface</h2>
          <ul className="plain-list">
            <li>
              <strong>Fixed in contract:</strong> supply `1000`, per-address limit `3`, and the commit/finalize random
              assignment path.
            </li>
            <li>
              <strong>Owner powers:</strong> the current contract shape still allows owner-controlled signer rotation
              and metadata-renderer rotation.
            </li>
            <li>
              <strong>Backend role:</strong> mint authorization is currently issued off-chain, and relayer finalize is
              a convenience path rather than the only way to finish a mint.
            </li>
            <li>
              <strong>Randomness design:</strong> the published design uses commit, a future block, and on-chain finalize so the assignment can be replay-checked from public chain data without adding a separate VRF dependency.
            </li>
            <li>
              <strong>Do not overclaim trustlessness:</strong> operational trust still exists around signer, relayer, and owner-controlled configuration.
            </li>
          </ul>
        </article>

        <article className="copy-card">
          <h2>Transparency / Verification Checklist</h2>
          <ul className="plain-list">
            <li>
              <strong>Official project links:</strong> website, repository, explorer, and current contract surface are published above.
            </li>
            <li>
              <strong>Published contract addresses:</strong> always compare the live contract address against the current launch state and rehearsal/public labeling.
            </li>
            <li>
              <strong>CorePass review:</strong> verify whether the wallet is asking for a signature or a contract call, then check <span className="mono-wrap">to</span>, <span className="mono-wrap">value</span>, and calldata.
            </li>
            <li>
              <strong>Explorer review:</strong> use Blockindex to confirm the submitted transaction fields and final result.
            </li>
            <li>
              <strong>Repository review:</strong> compare the published contract logic, ABI, runbooks, and trust-surface notes with what you see on-chain.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
