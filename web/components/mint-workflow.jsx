"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function explorerTxUrl(explorerBaseUrl, txHash) {
  if (!explorerBaseUrl || !txHash) return null;
  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${txHash}`;
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

function SessionAction({ eyebrow, title, copy, request, buttonLabel, completedLabel }) {
  if (!request) return null;

  return (
    <article className="mint-card mint-step-card">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
      <div className="mint-action-grid">
        <div className="mint-action-panel">
          <p className="mint-action-title">On this device</p>
          <a className="button button--primary button--wide" href={request.mobileUri}>
            {buttonLabel}
          </a>
          <p className="mint-meta">Use this when CorePass is installed on the same phone or tablet as this browser.</p>
        </div>
        <div className="mint-action-panel">
          <p className="mint-action-title">From desktop</p>
          {request.qrDataUrl ? <img src={request.qrDataUrl} alt={`${title} QR`} className="mint-qr" /> : null}
          <a className="inline-link mono-wrap" href={request.desktopUri}>
            Open raw CorePass URI
          </a>
          <p className="mint-meta">Scan the QR with CorePass on your phone. The callback updates this page after confirmation.</p>
        </div>
      </div>
      {request.completedAt ? <p className="mint-step-done">{completedLabel}</p> : null}
      {request.txHash ? <p className="mint-step-done">Transaction captured for this step.</p> : null}
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
    case "wallet_limit_reached":
      return "This wallet is already at the 3-cat limit for the standard mint path, so no new commit transaction was prepared.";
    case "pending_commit_exists":
      return "This wallet already has a commit waiting for finalize. Finish that session before starting another one.";
    case "wallet_state_unavailable":
      return "Mint authorization is temporarily unavailable because the backend could not confirm the wallet state.";
    case "authorize_failed":
      return "Mint authorization failed after the wallet was identified.";
    default:
      return code ? `CorePass callback returned ${code}.` : "";
  }
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

  const commitHref = useMemo(
    () => explorerTxUrl(session?.explorerBaseUrl || config.explorerBaseUrl, session?.commit?.txHash),
    [config.explorerBaseUrl, session],
  );
  const finalizeHref = useMemo(() => {
    const txHash = session?.finalize?.txHash;
    return explorerTxUrl(session?.explorerBaseUrl || config.explorerBaseUrl, txHash);
  }, [config.explorerBaseUrl, session]);

  useEffect(() => {
    if (callbackError) {
      setError(describeCallbackError(callbackError));
    }
  }, [callbackError]);

  useEffect(() => {
    if (!initialSessionId) return;
    setSessionId(initialSessionId);
  }, [initialSessionId]);

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
  const minter = session?.minter || "not selected";
  const showTestnetNotice =
    (config.networkName || "").toLowerCase() === "devin" || Number(config.chainId || 0) === 3;
  const finalizeStatus = session?.finalize?.status || "awaiting_finalize";
  const commitConfirmed = Boolean(session?.commit?.confirmedAt);
  const finalizeConfirmed = Boolean(session?.finalize?.confirmedAt);
  const finalizePending = commitConfirmed && !finalizeConfirmed;
  const phaseCopy = finalizeConfirmed
    ? "Mint completed after finalize."
    : finalizePending
      ? "Commit confirmed. Finalize is still pending."
      : commitConfirmed
        ? "Commit confirmed."
        : session?.identify?.completedAt
          ? "Wallet confirmed. Commit still needs approval."
          : "Session not started.";
  const relayerNote = finalizeConfirmed
    ? "Finalize completed. The mint is now delivered."
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
    ? "completed"
    : finalizeStatus === "submitted"
      ? "submitted"
      : session?.finalize?.stuck
        ? "stuck"
        : finalizeStatus === "manual_only"
          ? "manual only"
          : finalizeStatus === "expired"
            ? "expired"
            : session?.relayerEnabled
              ? "retrying"
              : "unavailable";
  const manualFinalizeAvailable = Boolean(
    session?.finalize?.manualAvailable && session?.finalize?.status !== "expired" && !finalizeConfirmed,
  );

  return (
    <div className="mint-stack">
      <section className="mint-grid">
        <article className="mint-card">
          <h2>Session</h2>
          <p>This mint flow uses CorePass for both the short signature step and the on-chain transaction step.</p>
          {showTestnetNotice ? (
            <p className="mint-warning">
              In this Devin testnet environment, the available CorePass path still needs support for
              <span className="mono-wrap"> ab... </span>
              addresses to complete live wallet checks.
            </p>
          ) : null}
          <StatusLine label="Network" value={config.networkName} />
          <StatusLine label="Expected chain id" value={String(config.chainId)} />
          <StatusLine label="Contract" value={config.coreCatsAddress} mono />
          <StatusLine label="Current state" value={currentState} />
          <StatusLine label="Mint progress" value={phaseCopy} />
          <StatusLine label="CoreID" value={minter} mono />
          <StatusLine label="Session" value={sessionId || "not started"} mono />
        </article>

        <article className="mint-card">
          <h2>Mint quantity</h2>
          <p>Choose 1 to 3 cats, then start a CorePass session. The session first confirms a CoreID and then prepares the commit transaction.</p>
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
          <p className="mint-meta">On desktop, scan the QR with CorePass on your phone. On mobile, open the CorePass app-link directly.</p>
        </article>
      </section>

      {error ? (
        <section className="mint-card">
          <h2>Issue</h2>
          <p className="mint-error">{error}</p>
        </section>
      ) : null}

      {session ? (
        <SessionAction
          eyebrow="Step 1"
          title="Bind the mint session to a CorePass wallet"
          copy="CorePass signs a short challenge so this mint session can be tied to a specific CoreID before the free-mint authorization is issued. This step does not move funds."
          request={session.identify}
          buttonLabel="Open CorePass Sign"
          completedLabel={`CoreID confirmed: ${session.identify.coreId}`}
        />
      ) : null}

      {session?.commit ? (
        <SessionAction
          eyebrow="Step 2"
          title="Commit the mint transaction"
          copy="Once the CoreID is known, the server prepares the signed commitMint call and hands it to CorePass as a transaction request. This records the mint request on-chain, but delivery is not complete until finalize succeeds."
          request={session.commit}
          buttonLabel="Open CorePass Commit"
          completedLabel="Commit confirmed. Finalize is still required before the cat is delivered."
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
          <div className="mint-action-grid">
            <div className="mint-action-panel">
              <p className="mint-action-title">Automatic path</p>
              <p className="mint-state">{automaticPathLabel}</p>
              <p className="mint-meta">Primary path: the backend relayer keeps working even if this page is closed or refreshed.</p>
            </div>
            <div className="mint-action-panel">
              <p className="mint-action-title">Manual CorePass fallback</p>
              {manualFinalizeAvailable ? (
                <>
                  <a className="button button--primary button--wide" href={session.finalize.mobileUri}>
                    Open CorePass Finalize
                  </a>
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
                      : "Manual CorePass finalize is not available for this session. The relayer path remains primary."}
                </p>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {session ? (
        <section className="mint-grid">
          <article className="mint-card">
            <h2>Transactions</h2>
            <StatusLine label="Commit tx" value={session.commit?.txHash || "not confirmed yet"} mono />
            {commitHref ? (
              <a href={commitHref} target="_blank" rel="noreferrer" className="inline-link">
                Open commit tx
              </a>
            ) : null}
            <StatusLine label="Finalize status" value={finalizeConfirmed ? "confirmed" : finalizeStatus} />
            <StatusLine label="Finalize tx" value={session.finalize?.txHash || "not sent yet"} mono />
            {finalizeHref ? (
              <a href={finalizeHref} target="_blank" rel="noreferrer" className="inline-link">
                Open finalize tx
              </a>
            ) : null}
          </article>

          <article className="mint-card">
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
