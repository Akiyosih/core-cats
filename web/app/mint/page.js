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
            The collection can already be explored, but CorePass minting stays closed until the launch path is ready
            for the next canary or public stage. When mint goes live, this page becomes the real entry for the same
            CorePass session flow that is being prepared here.
          </p>
          <div className="copy-panel__actions">
            <a href="https://coreblockchain.net/" target="_blank" rel="noreferrer" className="button button--ghost">
              About Core Blockchain
            </a>
            <a href="/transparency" className="button button--ghost">
              Check transparency
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
              until the launch state advances from closed to canary and then public. The closed state should not hide
              a private mint UI path.
            </p>
          </article>

          <article className="copy-card">
            <h2>What will be validated next</h2>
            <p>
              The next live stage is the rehearsal canary: the public `/mint` UI, the Contabo relayer path, session
              recovery, and the ownership/transparency handoff all need to behave coherently on mainnet before the
              official contract launch.
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
          <p>
            Mint is open only for validation. This stage may still point at a rehearsal contract on mainnet, so log
            evidence against the contract published on Transparency. Official public mint has not started yet.
          </p>
        </div>
      )}
      {launchState === "public" && (
        <div className="launch-banner launch-banner--public">
          <span className="launch-badge">Public Live</span>
          <p>Public mint is open. Connect with CorePass to secure your Core Cats.</p>
        </div>
      )}

      <MintWorkflow config={config} />
    </div>
  );
}
