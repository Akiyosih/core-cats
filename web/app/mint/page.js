import MintWorkflow from "../../components/mint-workflow";
import { getCorePublicConfig } from "../../lib/server/core-env";

export const dynamic = "force-dynamic";

export default function MintPage() {
  const config = getCorePublicConfig();
  const launchState = config.launchState;
  const isCanary = launchState === "canary";
  const isPublic = launchState === "public";

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
            evidence against the contract shown on this page and on Transparency.
          </p>
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
          <h2>{isCanary ? "What this canary proves" : "How mint works"}</h2>
          <p>
            {isCanary
              ? "This run should prove the real public /mint path: CorePass sign, commit confirmation, finalize delivery, session recovery, and post-mint ownership handoff."
              : "Choose 1 to 3 cats, start with CorePass, sign the session message, approve the commit transaction, and let finalize assign cats at random from the fixed set of 1,000."}
          </p>
        </article>

        <article className="copy-card">
          <h2>{isPublic ? "What you sign" : "How to enter CorePass"}</h2>
          <p>
            {isPublic
              ? "The first CorePass step is only a short signature that links this mint session to your wallet. It does not move funds or grant token approvals."
              : "Desktop uses a QR handoff to CorePass. Mobile uses the app-link directly. If you test the CorePass in-app QR scanner path, record that result separately from the standard camera path."}
          </p>
        </article>

        <article className="copy-card">
          <h2>{isCanary ? "Why finalize still matters" : "What the transaction does"}</h2>
          <p>
            {isCanary
              ? "Commit confirmation alone is not delivery. This canary should explicitly prove the difference between commit confirmed, finalize pending, and mint completed after finalize."
              : "After the signature, CorePass shows the actual commit transaction. That transaction records your mint request on-chain. You do not choose a cat yourself: the finalize step assigns from the fixed set of 1,000 at random."}
          </p>
        </article>

        <article className="copy-card">
          <h2>{isCanary ? "After mint completion" : "What you can verify"}</h2>
          <p>
            {isCanary
              ? "A good canary run ends with clean explorer links, a visible contract surface, and a natural handoff into My Cats for the same wallet."
              : "The success path should leave a visible explorer trail: commit tx, finalize tx, current contract, and the ownership view that reflects the wallet holding the cat."}
          </p>
        </article>
      </section>

      <MintWorkflow config={config} />
    </div>
  );
}
