import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const config = getCorePublicConfig();

  const launchState = "canary"; // "closed" | "canary" | "public"

  return (
    <div className="page-stack narrow-stack">
      
      {launchState === "closed" && (
        <div className="launch-banner launch-banner--closed">
          <span className="launch-badge">Closed</span>
          <p>Mint is not open yet. Collection pages are public, but new mints are still paused.</p>
        </div>
      )}
      {launchState === "canary" && (
        <div className="launch-banner launch-banner--canary">
          <span className="launch-badge">Canary Live</span>
          <p>Mint is currently open only for launch checks before the public opening.</p>
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
          <h2>How mint works</h2>
          <p>
            Choose 1 to 3 cats, start with CorePass, sign the session message, approve the commit transaction, and
            let finalize assign cats at random from the fixed set of 1,000.
          </p>
        </article>

        <article className="copy-card">
          <h2>What you sign</h2>
          <p>
            The first CorePass step is only a short signature that links this mint session to your wallet. It does
            not move funds or grant token approvals.
          </p>
        </article>

        <article className="copy-card">
          <h2>What the transaction does</h2>
          <p>
            After the signature, CorePass shows the actual commit transaction. That transaction records your mint
            request on-chain. You do not choose a cat yourself: the finalize step assigns from the fixed set of
            1,000 at random.
          </p>
        </article>
      </section>

      <MintWorkflow config={config} />
    </div>
  );
}
