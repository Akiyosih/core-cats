import { Suspense } from "react";

import MintWorkflow from "../../components/mint-workflow";
import MintCounterBanner from "../../components/mint-counter-banner";
import { getCorePublicConfig } from "../../lib/server/core-env";
import { getSummary } from "../../lib/viewer-data";
import { buildBrowseHref } from "../../lib/site-surface-links.js";

export const dynamic = "force-dynamic";

export async function MintPageContent({ config }) {
  const launchState = config.launchState;
  const collectionHref = buildBrowseHref(config, "/collection");
  const transparencyHref = buildBrowseHref(config, "/transparency");

  if (launchState === "closed" || !config.mintSurfaceEnabled) {
    const isPublicTeaser = config.publicTeaserSite && launchState !== "closed";
    return (
      <div className="page-stack narrow-stack">
        <section className="copy-panel">
          <p className="eyebrow">Mint</p>
          <h1>{isPublicTeaser ? "Mint is not available on this public teaser site." : "Mint opens soon."}</h1>
          {isPublicTeaser ? (
            <p>
              This deployment is for public browsing only. The official Core Cats mint will open on the dedicated mint
              host after final prelaunch checks are complete.
            </p>
          ) : (
            <p>
              This is the official Core Cats mint host. The collection can already be explored, but CorePass minting
              stays closed until the final launch checks are complete. When mint goes live, this page becomes the real
              public entry for the live CorePass session flow.
            </p>
          )}
          <div className="copy-panel__actions">
            <a href={collectionHref} className="button button--ghost">
              Browse collection
            </a>
            <a href={transparencyHref} className="button button--ghost">
              Check transparency
            </a>
          </div>
        </section>

        <section className="copy-grid copy-grid--two">
          <article className="copy-card">
            <h2>{isPublicTeaser ? "What is live on this site" : "What will happen here"}</h2>
            {isPublicTeaser ? (
              <p>
                The public site stays open for browsing, transparency, and collection lookup while the official mint
                host remains closed to the public.
              </p>
            ) : (
              <p>
                Minting will use CorePass and an on-chain commit/finalize flow that assigns cats at random from the
                fixed set of 1,000.
              </p>
            )}
          </article>

          <article className="copy-card">
            <h2>{isPublicTeaser ? "Why mint is separate right now" : "Why it is still closed"}</h2>
            {isPublicTeaser ? (
              <p>
                Browsing and minting are intentionally split between hosts so the public collection surface can stay
                lightweight while the official mint host handles session creation and callback flow.
              </p>
            ) : (
              <p>
                The public browse site is already live for transparency and collection viewing, while this official
                mint host stays shut until the launch state advances from closed to public. The closed state should not
                hide any alternate public mint UI path.
              </p>
            )}
          </article>
        </section>
      </div>
    );
  }

  const showMintCounter = launchState === "public";
  const summary = showMintCounter ? await getSummary() : null;

  if (!config.mintRuntimeReady) {
    return (
      <div className="page-stack narrow-stack">
        <section className="copy-panel">
          <p className="eyebrow">Mint</p>
          <h1>Mint is temporarily unavailable on this deployment.</h1>
          <p>
            The mint surface is enabled, but a required runtime value is still missing. The deployment should fail
            closed until the final site origin, contract address, and backend proxy wiring are configured explicitly.
          </p>
          <div className="copy-panel__actions">
            <a href={transparencyHref} className="button button--ghost">
              Check transparency
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack narrow-stack">
      {config.privateCanarySite && (
        <div className="launch-banner launch-banner--canary">
          <span className="launch-badge">{config.privateCanaryBadgeText}</span>
          <p>
            <strong>{config.privateCanaryTitleText}.</strong> {config.privateCanaryWarningText}. This host is a
            separate mainnet rehearsal surface and is not the official Core Cats public mint URL.
          </p>
        </div>
      )}
      {launchState === "closed" && (
        <div className="launch-banner launch-banner--closed">
          <span className="launch-badge">Closed</span>
          <p>Mint is not open yet. Collection pages are public, but new mints are still paused.</p>
        </div>
      )}
      {showMintCounter && (
        <MintCounterBanner statusSnapshotUrl={config.statusSnapshotUrl} total={summary.total} />
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

      <Suspense fallback={null}>
        <MintWorkflow config={config} />
      </Suspense>
    </div>
  );
}

export default async function MintPage() {
  const config = getCorePublicConfig();
  return MintPageContent({ config });
}
