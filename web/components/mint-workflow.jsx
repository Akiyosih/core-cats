"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import CopyButton from "./copy-button.jsx";

function explorerTxUrl(explorerBaseUrl, txHash) {
  if (!explorerBaseUrl || !txHash) return null;
  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}`;
}

function explorerAddressUrl(explorerBaseUrl, address) {
  if (!explorerBaseUrl || !address) return null;
  return `${explorerBaseUrl.replace(/\/$/, "")}/address/${address}`;
}

function myCatsHref(owner) {
  if (!owner) return "/my-cats";
  return `/my-cats?owner=${encodeURIComponent(owner)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function formatSessionState(value) {
  switch (String(value || "").trim()) {
    case "awaiting_identity":
      return "Awaiting wallet confirmation";
    case "awaiting_commit":
      return "Commit ready for approval";
    case "commit_submitted":
      return "Commit submitted; waiting for chain confirmation";
    case "authorize_rejected":
      return "Authorization rejected before commit";
    case "commit_confirmed":
      return "Commit confirmed";
    case "commit_failed":
      return "Commit failed";
    case "finalize_submitted":
      return "Finalize submitted";
    case "finalize_expired":
      return "Finalize expired";
    case "finalized":
      return "Mint completed";
    default:
      return "Not started";
  }
}

function formatFinalizeStatus(value) {
  switch (String(value || "").trim()) {
    case "awaiting_finalize":
      return "Awaiting finalize";
    case "retrying":
      return "Retrying";
    case "submitted":
      return "Submitted";
    case "confirmed":
      return "Confirmed";
    case "manual_only":
      return "Manual finalize required";
    case "expired":
      return "Expired";
    default:
      return "Not started";
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.detail || payload.error || "request failed");
    error.code = payload.error || "request_failed";
    throw error;
  }
  return payload;
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.detail || payload.error || "request failed");
    error.code = payload.error || "request_failed";
    throw error;
  }
  return payload;
}

function DesktopQrAction({
  eyebrow,
  stepBadge,
  title,
  copy,
  request,
  pendingNote,
  completedLabel,
  completedNote,
}) {
  if (!request) return null;
  const complete = Boolean(request.completedAt || request.txHash);

  return (
    <article className="mint-card mint-step-card">
      <div className="mint-step-header">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mint-step-pill">{stepBadge}</p>
      </div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {complete ? (
        <div className="mint-step-summary mint-step-summary--done">
          <p className="mint-step-summary-title">{completedLabel}</p>
          {completedNote ? <p className="mint-meta">{completedNote}</p> : null}
        </div>
      ) : (
        <div className="mint-action-grid mint-action-grid--desktop">
          <div className="mint-action-panel mint-action-panel--desktop">
            <p className="mint-action-title">Desktop QR handoff</p>
            {request.qrDataUrl ? <img src={request.qrDataUrl} alt={`${title} QR`} className="mint-qr" /> : null}
            {pendingNote ? <p className="mint-warning mint-warning--soft">{pendingNote}</p> : null}
            <p className="mint-meta">
              Keep this desktop page open. Scan with the device camera or the CorePass in-app scanner, approve inside
              CorePass, and then continue from this desktop browser.
            </p>
            <a className="inline-link mono-wrap" href={request.desktopUri}>
              Open raw CorePass URI
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function StatusLine({ label, value, mono = false }) {
  return (
    <p className={`mint-meta ${mono ? "mono-wrap" : ""}`}>
      {label}: {value || "-"}
    </p>
  );
}

function describeCallbackError(code) {
  switch (String(code || "").trim()) {
    case "canary_wallet_not_allowed":
      return "This wallet is not on the current rehearsal canary allowlist, so the site did not prepare a commit transaction.";
    case "wallet_limit_reached":
      return "This wallet is already at the 3-cat limit for the standard mint path, so no new commit transaction was prepared.";
    case "pending_commit_exists":
      return "This wallet already has a commit waiting for finalize. Finish that session before starting another one.";
    case "invalid_minter":
      return "CorePass returned an unsupported wallet address format for this session.";
    case "wallet_state_unavailable":
      return "Mint authorization is temporarily unavailable because the backend could not confirm the wallet state.";
    case "authorize_failed":
      return "Mint authorization failed after the wallet was identified.";
    default:
      return code ? `CorePass callback returned ${code}.` : "";
  }
}

function ProgressItem({ label, detail, tone }) {
  return (
    <div className={`mint-progress-item mint-progress-item--${tone}`}>
      <div className="mint-progress-dot" aria-hidden="true" />
      <div className="mint-progress-copy">
        <p className="mint-progress-label">{label}</p>
        <p className="mint-meta">{detail}</p>
      </div>
    </div>
  );
}

export default function MintWorkflow({ config }) {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("sessionId") || "";
  const callbackError = searchParams.get("callbackError") || "";

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeHref, setResumeHref] = useState("");

  const commitHref = useMemo(
    () => explorerTxUrl(session?.explorerBaseUrl || config.explorerBaseUrl, session?.commit?.txHash),
    [config.explorerBaseUrl, session],
  );
  const finalizeHref = useMemo(
    () => explorerTxUrl(session?.explorerBaseUrl || config.explorerBaseUrl, session?.finalize?.txHash),
    [config.explorerBaseUrl, session],
  );
  const contractHref = useMemo(
    () => explorerAddressUrl(session?.explorerBaseUrl || config.explorerBaseUrl, session?.coreCatsAddress || config.coreCatsAddress),
    [config.coreCatsAddress, config.explorerBaseUrl, session],
  );
  const ownerHref = useMemo(() => myCatsHref(session?.minter || ""), [session]);
  useEffect(() => {
    if (callbackError) {
      setError(describeCallbackError(callbackError));
    }
  }, [callbackError]);

  useEffect(() => {
    if (!initialSessionId) return;
    setSessionId(initialSessionId);
  }, [initialSessionId]);

  useEffect(() => {
    if (!sessionId) {
      setResumeHref("");
      return;
    }
    const url = new URL(window.location.href);
    url.pathname = "/mint";
    url.search = `?sessionId=${encodeURIComponent(sessionId)}`;
    setResumeHref(url.toString());
  }, [sessionId]);

  async function refreshSession(nextSessionId = sessionId) {
    if (!nextSessionId) return;
    try {
      const payload = await getJson(`/api/mint/corepass/session?sessionId=${encodeURIComponent(nextSessionId)}`);
      setSession(payload);
      setError(payload.error?.message || "");
    } catch (refreshError) {
      setError(refreshError.message || "Failed to refresh mint session");
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    refreshSession(sessionId);
    const timer = setInterval(() => {
      refreshSession(sessionId);
    }, 3000);
    return () => clearInterval(timer);
  }, [sessionId]);

  async function handleBegin() {
    setLoading(true);
    setError("");
    try {
      const payload = await postJson("/api/mint/corepass/session", { quantity });
      setSession(payload);
      setSessionId(payload.sessionId);
      window.history.replaceState({}, "", `/mint?sessionId=${encodeURIComponent(payload.sessionId)}`);
    } catch (createError) {
      setError(createError.message || "Failed to create CorePass mint session");
    } finally {
      setLoading(false);
    }
  }

  const currentState = session?.status || "idle";
  const currentStateLabel = formatSessionState(currentState);
  const minter = session?.minter || "not selected";
  const walletState = session?.commit?.walletState || null;
  const showTestnetNotice =
    (config.networkName || "").toLowerCase() === "devin" || Number(config.chainId || 0) === 3;
  const finalizeStatus = session?.finalize?.status || "awaiting_finalize";
  const finalizeStatusLabel = formatFinalizeStatus(finalizeStatus);
  const commitSubmitted = Boolean(session?.commit?.txHash);
  const commitConfirmed = Boolean(session?.commit?.confirmedAt);
  const finalizeConfirmed = Boolean(session?.finalize?.confirmedAt);
  const finalizePending = commitConfirmed && !finalizeConfirmed;
  let phaseCopy = "Session not started.";
  if (session) {
    phaseCopy = "Session created. Confirm the wallet in CorePass.";
  }
  if (session?.identify?.completedAt) {
    phaseCopy = "Wallet confirmed. Waiting for mint authorization details.";
  }
  if (session?.commit) {
    phaseCopy = "Wallet confirmed on desktop. QR 2 of 2 is now ready for the commit transaction.";
  }
  if (currentState === "commit_failed") {
    phaseCopy = "The commit transaction did not confirm successfully.";
  }
  if (currentState === "finalize_expired") {
    phaseCopy = "This session fell out of the finalize window and now needs operator intervention.";
  }
  if (commitSubmitted) {
    phaseCopy = "Commit submitted. Waiting for on-chain confirmation before finalize can begin.";
  }
  if (finalizePending) {
    phaseCopy = "Commit confirmed. Finalize is still pending, so delivery is not complete yet.";
  }
  if (finalizeConfirmed) {
    phaseCopy = "Mint completed after finalize. This session is done.";
  }
  const commitCompletedLabel = commitConfirmed
    ? "Commit confirmed. Finalize is still required before the cat is delivered."
    : commitSubmitted
      ? "Commit submitted. Waiting for chain confirmation before finalize can begin."
      : "Commit approval is still required.";
  const commitCompletedNote = commitConfirmed
    ? "The commit is on-chain. Keep this desktop page open while the relayer finishes finalize, or use the manual finalize QR only if the session stalls."
    : commitSubmitted
      ? "CorePass returned the commit transaction. This desktop page is now waiting for the chain receipt."
      : "Return to this desktop page, then scan QR 2 of 2 to approve the real commit transaction in CorePass.";
  const relayerNote = finalizeConfirmed
    ? "Finalize completed. The mint is now delivered."
    : commitSubmitted && !commitConfirmed
      ? "CorePass returned the commit transaction, but the desktop session is still waiting for an on-chain receipt before finalize can begin."
    : session?.finalize?.stuck
      ? "Commit is confirmed, but finalize is taking longer than expected. The backend keeps checking, and the manual finalize fallback remains available."
      : finalizeStatus === "submitted"
        ? "Commit is confirmed. The backend relayer already sent finalize and is now waiting for chain confirmation."
        : finalizeStatus === "retrying" || finalizeStatus === "awaiting_finalize"
          ? session?.relayerEnabled
            ? "Commit is confirmed. The backend relayer will keep retrying finalize until the eligible chain state is ready."
            : "Relayer is not configured for this environment. Use the manual finalize fallback below."
          : finalizeStatus === "manual_only"
            ? "Relayer is unavailable for this session. Use the manual finalize fallback below."
            : finalizeStatus === "expired"
              ? "The finalize window expired before completion. This session now needs operator intervention."
              : session?.relayerEnabled
                ? "The backend relayer will handle finalize after commit confirmation."
                : "Relayer is not configured for this environment.";
  const automaticPathLabel = finalizeConfirmed
    ? "Completed"
    : commitSubmitted && !commitConfirmed
      ? "Waiting for commit confirmation"
    : finalizeStatus === "submitted"
      ? "Submitted"
      : session?.finalize?.stuck
        ? "Stuck"
        : finalizeStatus === "manual_only"
          ? "Manual only"
          : finalizeStatus === "expired"
            ? "Expired"
            : session?.relayerEnabled
              ? "Retrying"
              : "Unavailable";
  const manualFinalizeAvailable = Boolean(
    commitConfirmed && session?.finalize?.manualAvailable && session?.finalize?.status !== "expired" && !finalizeConfirmed,
  );
  const progressItems = [
    {
      label: "Session created",
      detail: session ? `Session ${session.sessionId} is active.` : "Start with CorePass to create a new session.",
      tone: session ? "done" : "waiting",
    },
    {
      label: "Wallet confirmed",
      detail: session?.identify?.completedAt
        ? `CoreID confirmed: ${session.identify.coreId}`
        : "Scan QR 1 of 2 to sign the short CorePass message and bind this session to one wallet.",
      tone: session?.identify?.completedAt ? "done" : session ? "active" : "waiting",
    },
    {
      label: "Commit recorded",
      detail: commitConfirmed
        ? "The commit transaction is confirmed on-chain."
        : commitSubmitted
          ? "The commit transaction was submitted from CorePass and is still waiting for an on-chain receipt."
        : session?.commit
          ? "Scan QR 2 of 2 to approve the commit transaction in CorePass."
          : "Commit is only prepared after wallet confirmation succeeds.",
      tone: commitConfirmed ? "done" : session?.commit ? "active" : "waiting",
    },
    {
      label: "Finalize delivered",
      detail: finalizeConfirmed
        ? "Finalize confirmed. The mint is complete."
        : commitSubmitted && !commitConfirmed
          ? "Finalize will only start after the commit transaction is confirmed on-chain."
        : commitConfirmed
          ? relayerNote
          : "Finalize starts only after the commit is confirmed.",
      tone: finalizeConfirmed ? "done" : commitConfirmed ? "active" : "waiting",
    },
  ];

  return (
    <div className="mint-stack">
      <section className="mint-grid">
        <article className="mint-card">
          <p className="eyebrow">Session</p>
          <h2>Current mint session</h2>
          <p>
            This desktop-first flow uses two CorePass approvals. QR 1 of 2 binds the session to one wallet, then QR 2
            of 2 submits the commit transaction from the same desktop page.
          </p>
          {showTestnetNotice ? (
            <p className="mint-warning">
              In this Devin testnet environment, the available CorePass path still needs support for
              <span className="mono-wrap"> ab... </span>
              addresses to complete live wallet checks.
            </p>
          ) : null}
          <div className="mint-meta-group">
            <StatusLine label="Network" value={config.networkName} />
            <StatusLine label="Expected chain id" value={String(config.chainId)} />
            <StatusLine label="Contract" value={config.coreCatsAddress} mono />
            <StatusLine label="Session state" value={currentStateLabel} />
            <StatusLine label="Mint progress" value={phaseCopy} />
            <StatusLine label="CoreID" value={minter} mono />
            <StatusLine label="Session id" value={sessionId || "not started"} mono />
            <StatusLine label="Session expiry" value={formatDateTime(session?.expiresAt)} />
          </div>
        </article>

        <article className="mint-card">
          <p className="eyebrow">Start</p>
          <h2>Choose quantity and begin on desktop</h2>
          <p>
            Pick 1 to 3 cats, then create a CorePass session from this desktop browser. Wallet-limit checks happen
            before any gas-spending commit transaction is prepared.
          </p>
          <div className="quantity-row" role="group" aria-label="Mint quantity">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                className={`quantity-chip ${quantity === value ? "quantity-chip--active" : ""}`}
                onClick={() => setQuantity(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" className="button button--primary button--wide" onClick={handleBegin} disabled={loading}>
            {loading ? "Preparing CorePass session..." : "Start with CorePass"}
          </button>
          <div className="mint-step-summary mint-step-summary--route">
            <p className="mint-step-summary-title">Desktop rehearsal path</p>
            <p className="mint-meta">Use a desktop browser and keep this page open until mint completion.</p>
            <p className="mint-meta">QR 1 of 2 binds the wallet. QR 2 of 2 submits the commit transaction.</p>
            <p className="mint-meta">Same-device mobile mint is not supported in this stage.</p>
          </div>
          {walletState ? (
            <div className="mint-policy-box">
              <p className="mint-policy-title">Wallet policy snapshot</p>
              <div className="mint-policy-grid">
                <StatusLine label="Already minted" value={String(walletState.minted)} />
                <StatusLine label="Reserved now" value={String(walletState.reserved)} />
                <StatusLine label="Available slots" value={String(walletState.availableSlots)} />
                <StatusLine label="Pending commit" value={walletState.pendingCommitActive ? "yes" : "no"} />
              </div>
            </div>
          ) : (
            <p className="mint-meta">
              The wallet policy snapshot appears here after QR 1 of 2 completes and authorization is prepared.
            </p>
          )}
        </article>
      </section>

      {error ? (
        <section className="mint-card">
          <p className="eyebrow">Issue</p>
          <h2>Attention required</h2>
          <p className="mint-error">{error}</p>
        </section>
      ) : null}

      <section className="mint-grid">
        <article className="mint-card">
          <p className="eyebrow">Progress</p>
          <h2>What stage this mint is in</h2>
          <div className="mint-progress">
            {progressItems.map((item) => (
              <ProgressItem key={item.label} label={item.label} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </article>

        <article className="mint-card">
          <p className="eyebrow">Recovery</p>
          <h2>Resume this session later</h2>
          <p>If this page reloads or you need to come back later, reopen the same session link. The backend relayer keeps working even while the page is closed.</p>
          {resumeHref ? (
            <div className="mint-inline-actions">
              <CopyButton value={resumeHref} idleLabel="Copy session link" doneLabel="Session link copied" />
              <a href={resumeHref} className="button button--ghost button--inline">
                Open session link
              </a>
            </div>
          ) : (
            <p className="mint-meta">A resume link appears here as soon as a session has been created.</p>
          )}
          <div className="mint-meta-group">
            <StatusLine label="Finalize path" value={finalizeConfirmed ? `Completed via ${session?.finalize?.mode || "unknown"}` : relayerNote} />
            <StatusLine label="Finalize state" value={finalizeStatusLabel} />
            <StatusLine label="Last finalize attempt" value={formatDateTime(session?.finalize?.lastAttemptAt)} />
          </div>
        </article>
      </section>

      {session ? (
        <DesktopQrAction
          eyebrow="Step 1"
          stepBadge="QR 1 of 2"
          title="Bind the mint session to a CorePass wallet"
          copy="CorePass signs a short challenge so this mint session can be tied to a specific CoreID before the free-mint authorization is issued. This step does not move funds."
          request={session.identify}
          pendingNote="Scan QR 1 of 2 with CorePass. The phone should stay inside CorePass after approval, while this desktop page waits for the callback."
          completedLabel={`CoreID confirmed: ${session.identify.coreId}`}
          completedNote="QR 1 of 2 is complete. Stay on this desktop page for QR 2 of 2."
        />
      ) : null}

      {session?.commit ? (
        <DesktopQrAction
          eyebrow="Step 2"
          stepBadge="QR 2 of 2"
          title="Commit the mint transaction"
          copy="Once the CoreID is known, the server prepares the signed commitMint call and hands it to CorePass as a transaction request. This records the mint request on-chain, but delivery is not complete until finalize succeeds."
          request={session.commit}
          pendingNote="Return to this desktop page, then scan QR 2 of 2 to approve the real commit transaction in CorePass."
          completedLabel={commitCompletedLabel}
          completedNote={commitCompletedNote}
        />
      ) : null}

      {session?.finalize ? (
        <article className="mint-card mint-step-card">
          <p className="eyebrow">Step 3</p>
          <h2>Finalize the random assignment</h2>
          <p>
            Commit confirmation only records the pending mint. Your cat is delivered only after finalize succeeds and
            the random assignment is completed on-chain.
          </p>
          <p className="mint-meta">{relayerNote}</p>
          {session.finalize?.lastError && !finalizeConfirmed ? (
            <p className="mint-warning">
              Latest finalize note: <span className="mono-wrap">{session.finalize.lastError}</span>
            </p>
          ) : null}
          <div className="mint-action-grid">
            <div className="mint-action-panel">
              <p className="mint-action-title">Automatic path</p>
              <p className="mint-state">{automaticPathLabel}</p>
              <p className="mint-meta">Primary path: the backend relayer keeps working even if this page is closed or refreshed.</p>
            </div>
            <div className="mint-action-panel">
              <p className="mint-action-title">Manual desktop QR fallback</p>
              {manualFinalizeAvailable ? (
                <>
                  <p className="mint-warning mint-warning--soft">
                    Only use this QR if automatic finalize stalls. Keep the desktop page open while CorePass signs the
                    fallback finalize transaction.
                  </p>
                  {session.finalize.qrDataUrl ? (
                    <img src={session.finalize.qrDataUrl} alt="Finalize QR" className="mint-qr" />
                  ) : null}
                  <a className="inline-link mono-wrap" href={session.finalize.desktopUri}>
                    Open raw CorePass URI
                  </a>
                </>
              ) : (
                <p className="mint-meta">
                  {finalizeConfirmed
                    ? "Finalize already completed for this session."
                    : session.finalize.status === "expired"
                      ? "Manual finalize is no longer safe for this session because the finalize window expired."
                      : !commitConfirmed
                        ? "Manual finalize stays disabled until the commit transaction is confirmed on-chain."
                      : "Manual CorePass finalize is not available for this session. The relayer path remains primary."}
                </p>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {finalizeConfirmed ? (
        <section className="mint-card mint-success-card">
          <p className="eyebrow">Completed</p>
          <h2>Mint completed after finalize</h2>
          <p>
            This session has reached the delivered state. Use the links below to verify the transactions, inspect the
            configured contract, and continue to the ownership view for this wallet.
          </p>
          <div className="mint-link-grid">
            <a href={ownerHref} className="button button--primary">
              Open My Cats
            </a>
            {finalizeHref ? (
              <a href={finalizeHref} target="_blank" rel="noreferrer" className="button button--ghost">
                Open finalize tx
              </a>
            ) : null}
            {commitHref ? (
              <a href={commitHref} target="_blank" rel="noreferrer" className="button button--ghost">
                Open commit tx
              </a>
            ) : null}
            {contractHref ? (
              <a href={contractHref} target="_blank" rel="noreferrer" className="button button--ghost">
                Open contract
              </a>
            ) : null}
          </div>
          <div className="mint-inline-actions">
            {session?.minter ? <CopyButton value={session.minter} idleLabel="Copy wallet" doneLabel="Wallet copied" /> : null}
            <a href="/transparency" className="button button--ghost button--inline">
              Open transparency
            </a>
          </div>
          <p className="mint-meta">
            Token assignment may still need to be confirmed from explorer or readback tooling if the token id is not surfaced here yet.
          </p>
        </section>
      ) : null}

      {session ? (
        <section className="mint-grid">
          <article className="mint-card">
            <p className="eyebrow">Transactions</p>
            <h2>Explorer and session details</h2>
            <div className="mint-meta-group">
              <StatusLine label="Commit tx" value={session.commit?.txHash || "not confirmed yet"} mono />
              <StatusLine label="Commit state" value={commitConfirmed ? "Confirmed" : commitSubmitted ? "Submitted" : "Awaiting approval"} />
              {commitHref ? (
                <a href={commitHref} target="_blank" rel="noreferrer" className="inline-link">
                  Open commit tx
                </a>
              ) : null}
              <StatusLine label="Finalize status" value={finalizeStatusLabel} />
              <StatusLine label="Finalize tx" value={session.finalize?.txHash || "not sent yet"} mono />
              {finalizeHref ? (
                <a href={finalizeHref} target="_blank" rel="noreferrer" className="inline-link">
                  Open finalize tx
                </a>
              ) : null}
              <StatusLine label="Contract" value={session.coreCatsAddress || config.coreCatsAddress} mono />
              {contractHref ? (
                <a href={contractHref} target="_blank" rel="noreferrer" className="inline-link">
                  Open contract
                </a>
              ) : null}
            </div>
          </article>

          <article className="mint-card">
            <p className="eyebrow">History</p>
            <h2>Session history</h2>
            <ul className="plain-list">
              {(session.history || []).map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  <span className="mono-wrap">{item.at}</span> {item.step}: {item.event}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}
