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

export default function MintWorkflow({ config }) {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("sessionId") || "";
  const callbackError = searchParams.get("callbackError") || "";

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoFinalizeState, setAutoFinalizeState] = useState("idle");

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
      setError(`CorePass callback returned ${callbackError}.`);
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
      setError("");
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

  useEffect(() => {
    if (!sessionId || !session?.relayerEnabled) return;
    if (session.status !== "commit_confirmed") return;
    if (session.finalize?.txHash) return;

    let cancelled = false;
    let running = false;

    async function tryFinalize() {
      if (running || cancelled) return;
      running = true;
      try {
        setAutoFinalizeState("trying");
        const payload = await postJson("/api/mint/corepass/session/finalize", { sessionId });
        if (!cancelled) {
          setSession(payload);
          setAutoFinalizeState("submitted");
        }
      } catch (finalizeError) {
        if (cancelled) return;
        if (finalizeError.code === "too_early" || finalizeError.code === "no_pending_commit") {
          setAutoFinalizeState("waiting");
        } else if (finalizeError.code === "relayer_not_configured") {
          setAutoFinalizeState("manual_only");
        } else {
          setAutoFinalizeState("manual_only");
          setError(finalizeError.message || "Automatic finalize failed");
        }
      } finally {
        running = false;
      }
    }

    tryFinalize();
    const timer = setInterval(tryFinalize, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionId, session?.relayerEnabled, session?.status, session?.finalize?.txHash]);

  async function handleBegin() {
    setLoading(true);
    setError("");
    try {
      const payload = await postJson("/api/mint/corepass/session", { quantity });
      setSession(payload);
      setSessionId(payload.sessionId);
      window.history.replaceState({}, "", `/mint?sessionId=${encodeURIComponent(payload.sessionId)}`);
      setAutoFinalizeState("idle");
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
  const relayerNote =
    autoFinalizeState === "trying"
      ? "Relayer is attempting finalize."
      : autoFinalizeState === "waiting"
        ? "Waiting for the future block to pass before relayer finalize."
        : autoFinalizeState === "submitted"
          ? "Relayer submitted finalize. Explorer is the current source of truth."
          : autoFinalizeState === "manual_only"
            ? "Relayer is unavailable. Use the CorePass finalize step below."
            : session?.relayerEnabled
              ? "Relayer is available and will be tried after commit confirmation."
              : "Relayer is not configured for this environment.";

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
          copy="Once the CoreID is known, the server prepares the signed commitMint call and hands it to CorePass as a transaction request. This is the step that actually records your mint request on-chain."
          request={session.commit}
          buttonLabel="Open CorePass Commit"
          completedLabel="Commit transaction confirmed."
        />
      ) : null}

      {session?.finalize ? (
        <article className="mint-card mint-step-card">
          <p className="eyebrow">Step 3</p>
          <h2>Finalize the random assignment</h2>
          <p>
            After the commit is confirmed, the contract waits for the future block boundary. This page keeps trying
            the relayer path when available. This is the step that draws from the fixed set of 1,000 cats. If that
            path is unavailable, use the CorePass finalize request below.
          </p>
          <p className="mint-meta">{relayerNote}</p>
          <div className="mint-action-grid">
            <div className="mint-action-panel">
              <p className="mint-action-title">Automatic path</p>
              <p className="mint-state">{autoFinalizeState}</p>
              <p className="mint-meta">Primary path: the relayer retries until the future block becomes valid.</p>
            </div>
            <div className="mint-action-panel">
              <p className="mint-action-title">Manual CorePass fallback</p>
              <a className="button button--primary button--wide" href={session.finalize.mobileUri}>
                Open CorePass Finalize
              </a>
              {session.finalize.qrDataUrl ? (
                <img src={session.finalize.qrDataUrl} alt="Finalize QR" className="mint-qr" />
              ) : null}
              <a className="inline-link mono-wrap" href={session.finalize.desktopUri}>
                Open raw CorePass URI
              </a>
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
