import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const config = getCorePublicConfig();
  const launchState = config.launchState;

  if (launchState === "closed") {
    return (
      <div className="page-stack narrow-stack">
        <section className="copy-panel">
          <p className="eyebrow">Mint</p>
          <h1>Mint opens soon.</h1>
          <p>
            The collection can already be explored, but CorePass minting stays closed until the mainnet launch path
            is ready. This page will become the live mint entry once the site moves beyond the closed stage.
          </p>
          <div className="copy-panel__actions">
            <a href="https://coreblockchain.net/" target="_blank" rel="noreferrer" className="button button--ghost">
              About Core Blockchain
            </a>
          </div>
        </section>

        <section className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>What will happen here</h2>
            <p>
              Minting will use CorePass, a short session signature, and an on-chain commit/finalize flow that assigns
              cats at random from the fixed set of 1,000.
            </p>
          </article>

          <article className="copy-card">
            <h2>Why it is still closed</h2>
            <p>
              The public site is already live for browsing and transparency, while the actual mint flow stays shut
              until the launch state advances from closed to canary and then public.
            </p>
          </article>
        </section>
      </div>
    );
  }

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
