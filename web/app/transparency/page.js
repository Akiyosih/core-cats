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
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/TRUST_AND_PRIVACY_SURFACE.md",
    label: "Trust + privacy notes",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/FREEZE_AND_RENOUNCE_POLICY.md",
    label: "Freeze / renounce policy",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/MINTER_PRIVACY_NOTE.md",
    label: "Minter privacy note",
  },
  {
    href: "https://github.com/Akiyosih/core-cats/blob/main/docs/PUBLIC_DOCUMENT_LANGUAGE_POLICY.md",
    label: "Public document language policy",
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
          <h2>Current chain surface</h2>
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
          </ul>
        </article>

        <article className="copy-card">
          <h2>Privacy notes</h2>
          <ul className="plain-list">
            <li>
              <strong>Current path:</strong> CorePass protocol transport only. Connector/KYC-transfer is not required
              for the present launch target.
            </li>
            <li>
              <strong>Session handling:</strong> the mint flow uses server-side session coordination and operator
              recovery logs.
            </li>
            <li>
              <strong>Do not assume anonymity:</strong> on-chain transactions are public, and the current web/backend
              architecture is operational rather than privacy-preserving.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
