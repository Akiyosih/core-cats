import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const config = getCorePublicConfig();

  return (
    <div className="page-stack narrow-stack">
      <section className="copy-grid">
        <article className="copy-card">
          <h2>What is already proven</h2>
          <p>
            Core Devin deployment succeeded, and the <code>commitMint -&gt; finalizeMint</code> flow was rehearsed with
            tokenURI decoded back to on-chain JSON plus on-chain SVG output.
          </p>
        </article>

        <article className="copy-card">
          <h2>What changed here</h2>
          <p>
            This page now treats CorePass QR and app-link requests as the primary wallet UX. Browser-injected providers
            are no longer the main mint path.
          </p>
        </article>

        <article className="copy-card">
          <h2>Current validation limit</h2>
          <p>
            In the current local environment, the available CorePass app exposes only a mainnet <code>cb...</code>
            account and does not expose a Devin testnet <code>ab...</code> account. That means this UI is the intended
            production-target mint flow, but live CorePass E2E on Devin is still blocked by wallet availability.
          </p>
        </article>
      </section>

      <MintWorkflow config={config} />
    </div>
  );
}
