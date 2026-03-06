import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const config = getCorePublicConfig();

  // Stub launch state to show the UI affordance.
  // The actual state will be provided by backend/env later as requested.
  const launchState = "canary"; // "closed" | "canary" | "public"

  return (
    <div className="page-stack narrow-stack">
      
      {launchState === "closed" && (
        <div className="launch-banner launch-banner--closed">
          <span className="launch-badge">Closed</span>
          <p>Public mint is not open yet. Contract is deployed but signature issuance is paused.</p>
        </div>
      )}
      {launchState === "canary" && (
        <div className="launch-banner launch-banner--canary">
          <span className="launch-badge">Canary Live</span>
          <p>Mint is live for the operator allowlist to validate the mainnet random assignment flow.</p>
        </div>
      )}
      {launchState === "public" && (
        <div className="launch-banner launch-banner--public">
          <span className="launch-badge">Public Live</span>
          <p>Public mint is open. Connect with CorePass to secure your Core Cats.</p>
        </div>
      )}

      <section className="copy-grid">
        <article className="copy-card">
          <h2>Proven Architecture</h2>
          <p>
            Core mainnet/testnet flow is highly tested. The <code>commitMint -&gt; finalizeMint</code> phase introduces verifiably fair random assignment with on-chain JSON processing.
          </p>
        </article>

        <article className="copy-card">
          <h2>CorePass Protocol</h2>
          <p>
            This page utilizes CorePass QR and app-link requests. This provides a direct path to bind session metadata with a verified CoreID transaction.
          </p>
        </article>

        <article className="copy-card">
          <h2>Current Environment Limit</h2>
          <p>
            If testing locally on Devin testnet, ensure your CorePass wallet supports <code>ab...</code> (testnet) addresses signing before continuing.
          </p>
        </article>
      </section>

      <MintWorkflow config={config} />
    </div>
  );
}
