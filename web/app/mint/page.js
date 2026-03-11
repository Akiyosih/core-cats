import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { getStatusSnapshot } from "../../lib/server/corecats-status";
import { getSummary } from "../../lib/viewer-data";

export const dynamic = "force-dynamic";
const SHOW_PUBLIC_MINT_COUNTER_PREVIEW_IN_CANARY = true;

export default async function MintPage() {
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

  const showMintCounter =
    launchState === "public" || (launchState === "canary" && SHOW_PUBLIC_MINT_COUNTER_PREVIEW_IN_CANARY);
  const [summary, statusSnapshot] = showMintCounter ? await Promise.all([getSummary(), getStatusSnapshot()]) : [null, null];
  const mintedLabel = showMintCounter ? `${statusSnapshot.mintedCount.toLocaleString()} / ${summary.total.toLocaleString()} minted` : "";

  return (
    <div className="page-stack narrow-stack">
      {launchState === "closed" && (
        <div className="launch-banner launch-banner--closed">
          <span className="launch-badge">Closed</span>
          <p>Mint is not open yet. Collection pages are public, but new mints are still paused.</p>
        </div>
      )}
      {showMintCounter && (
        <div className="launch-banner launch-banner--public mint-counter-banner">
          <span className="launch-badge">Public mint live</span>
          <p className="mint-counter-banner__count">{mintedLabel}</p>
        </div>
      )}
      {launchState === "public" && !showMintCounter && (
        <div className="launch-banner launch-banner--public">
          <span className="launch-badge">Public Live</span>
          <p>Public mint is open. Connect with CorePass to secure your Core Cats.</p>
        </div>
      )}

      <details className="mint-verify-details">
        <summary>New to Core Blockchain?</summary>
        <div className="mint-verify-body mint-copy-stack">
          <p>If this is your first time using Core Blockchain, minting Core Cats requires:</p>
          <ul className="plain-list mint-bullet-list">
            <li>a registered CorePass account</li>
            <li>a small amount of XCB for gas</li>
          </ul>
          <p>Gas is usually very cheap — often less than $0.01 per transaction.</p>
          <p>
            You can ask a friend to send you a little XCB for gas, or follow this step-by-step guide to set up
            CorePass, register on Ping Exchange, and get started:
          </p>
          <div className="mint-copy-block">
            <p className="mint-copy-title">Read the guide:</p>
            <a
              href="https://medium.com/@tellmemoreaboutcore2022/how-to-set-up-corepass-id-register-on-ping-exchange-the-complete-step-by-step-guide-ee018ce2de4c"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-link"
            >
              How to Set Up CorePass ID & Register on Ping Exchange — The Complete Step-by-Step Guide
            </a>
          </div>
          <p className="mint-meta">This is an external community guide shared for convenience.</p>
        </div>
      </details>

      <MintWorkflow config={config} />
    </div>
  );
}
