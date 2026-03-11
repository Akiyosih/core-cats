"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const PROJECT_REPOSITORY_URL = "https://github.com/Akiyosih/core-cats";

function preferredScrollBehavior() {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function scrollToSection(ref) {
  if (!ref?.current) return;
  ref.current.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
}

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
      return "Unavailable";
    case "expired":
      return "Expired";
    default:
      return "Not started";
  }
}

function describeFinalizeError(code, detail) {
  switch (String(code || "").trim()) {
    case "too_early":
      return "Automatic finalize is waiting for the finalize window to open.";
    case "no_pending_commit":
      return "Automatic finalize is waiting for the pending commit state to become readable.";
    case "tx_reverted":
      return "The latest automatic finalize attempt did not complete and is retrying in the background.";
    case "relayer_not_configured":
      return "Automatic finalize is temporarily unavailable. Please wait here. If your NFT still has not arrived after 30 minutes, start a new mint from the beginning.";
    case "finalize_expired":
      return "Finalize did not complete within the available window. If your NFT still has not arrived after 30 minutes, start a new mint from the beginning.";
    case "finalize_failed":
      return "Automatic finalize hit a relayer error and is retrying in the background.";
    default:
      return detail ? "Automatic finalize is retrying in the background." : "";
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
  body,
  request,
  pendingNote,
  completedLabel,
  completedNote,
  highlightedNotice,
  completeTone = "done",
  resolved = false,
  sectionRef = null,
}) {
  if (!request) return null;
  const complete = Boolean(request.completedAt || request.txHash || resolved);

  return (
    <article ref={sectionRef} className="mint-card mint-step-card">
      <div className="mint-step-header">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mint-step-pill">{stepBadge}</p>
      </div>
      <h2>{title}</h2>
      <div className="mint-copy-stack">{body}</div>
      {complete ? (
        <div className={`mint-step-summary mint-step-summary--${completeTone}`}>
          <p className="mint-step-summary-title">{completedLabel}</p>
          {completedNote ? <p className="mint-meta">{completedNote}</p> : null}
        </div>
      ) : (
        <div className="mint-action-grid mint-action-grid--desktop">
          <div className="mint-action-panel mint-action-panel--desktop">
            <p className="mint-action-title">Desktop QR handoff</p>
            {highlightedNotice ? <p className="mint-scan-callout">{highlightedNotice}</p> : null}
            {request.qrDataUrl ? <img src={request.qrDataUrl} alt={`${title} QR`} className="mint-qr" /> : null}
            {pendingNote ? <p className="mint-warning mint-warning--soft">{pendingNote}</p> : null}
            <p className="mint-meta">
              Keep this desktop page open. Scan with the device camera or the CorePass in-app scanner, approve inside
              CorePass, and then continue from this desktop browser.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function VerificationDetails({ children, summary = "How to verify this yourself" }) {
  return (
    <details className="mint-verify-details">
      <summary>{summary}</summary>
      <div className="mint-verify-body">{children}</div>
    </details>
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

function describeRejectedSession(code) {
  switch (String(code || "").trim()) {
    case "wallet_limit_reached":
      return {
        phaseCopy: "Wallet confirmed, but this wallet is already at the 3-cat limit. QR 2 of 2 was not prepared.",
        step1Label: "Wallet confirmed, but this wallet is already at the 3-cat limit.",
        step1Note: "QR 2 of 2 was not prepared. No gas-spending mint transaction was created.",
        commitDetail: "No commit transaction was prepared because this wallet is already at the standard 3-cat limit.",
      };
    case "pending_commit_exists":
      return {
        phaseCopy: "Wallet confirmed, but this wallet already has a pending commit. QR 2 of 2 was not prepared.",
        step1Label: "Wallet confirmed, but this wallet already has a pending commit.",
        step1Note: "QR 2 of 2 was not prepared. Finish finalize on the earlier session before starting another mint.",
        commitDetail: "No new commit transaction was prepared because this wallet already has a pending commit waiting for finalize.",
      };
    case "canary_wallet_not_allowed":
      return {
        phaseCopy: "Wallet confirmed, but this wallet is not on the current rehearsal canary allowlist.",
        step1Label: "Wallet confirmed, but this wallet is not on the current rehearsal canary allowlist.",
        step1Note: "QR 2 of 2 was not prepared. No gas-spending mint transaction was created.",
        commitDetail: "No commit transaction was prepared because this wallet is not allowed on the current rehearsal canary path.",
      };
    default:
      return {
        phaseCopy: "Wallet confirmed, but mint authorization was rejected before QR 2 of 2 could be prepared.",
        step1Label: "Wallet confirmed, but mint authorization was rejected.",
        step1Note: "QR 2 of 2 was not prepared. No gas-spending mint transaction was created.",
        commitDetail: "No commit transaction was prepared because mint authorization failed after wallet confirmation.",
      };
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const issueRef = useRef(null);
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const successRef = useRef(null);
  const lastErrorScrollKeyRef = useRef("");
  const scrollMarksRef = useRef({
    sessionId: "",
    step1: false,
    step2: false,
    step3: false,
    success: false,
  });

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
    scrollMarksRef.current = {
      sessionId,
      step1: false,
      step2: false,
      step3: false,
      success: false,
    };
  }, [sessionId]);

  async function refreshSession(nextSessionId = sessionId, { manual = false } = {}) {
    if (!nextSessionId) return;
    if (manual) {
      setRefreshing(true);
    }
    try {
      const payload = await getJson(`/api/mint/corepass/session?sessionId=${encodeURIComponent(nextSessionId)}`);
      setSession(payload);
      setError(payload.error?.message || "");
    } catch (refreshError) {
      if (refreshError.code === "session_not_found") {
        if (session?.finalize?.confirmedAt) {
          return;
        }
        setSession(null);
        setSessionId("");
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/mint");
        }
        setError("Mint session not found or expired. Start a new mint from the beginning.");
        return;
      }
      setError(refreshError.message || "Failed to refresh mint session");
    } finally {
      if (manual) {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!sessionId || session) return;
    refreshSession(sessionId);
  }, [sessionId, session]);

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
  const walletState = session?.commit?.walletState || null;
  const showTestnetNotice =
    (config.networkName || "").toLowerCase() === "devin" || Number(config.chainId || 0) === 3;
  const finalizeStatus = session?.finalize?.status || "awaiting_finalize";
  const finalizeStatusLabel = formatFinalizeStatus(finalizeStatus);
  const finalizeUserNote = describeFinalizeError(session?.finalize?.lastErrorCode, session?.finalize?.lastError);
  const commitSubmitted = Boolean(session?.commit?.txHash);
  const commitConfirmed = Boolean(session?.commit?.confirmedAt);
  const finalizeConfirmed = Boolean(session?.finalize?.confirmedAt);
  const finalizePending = commitConfirmed && !finalizeConfirmed;
  const commitExpiryMs = Number(session?.commit?.expiry || 0) * 1000;
  const authorizationExpired = Boolean(session?.commit && !commitSubmitted && commitExpiryMs > 0 && commitExpiryMs <= Date.now());
  const currentStateLabel = authorizationExpired ? "Commit authorization expired" : formatSessionState(currentState);
  const authorizeRejected = currentState === "authorize_rejected";
  const rejectedSession = authorizeRejected ? describeRejectedSession(session?.error?.code || callbackError) : null;
  const displayedError = error || (authorizationExpired ? "QR 2 of 2 expired before approval. Start a new mint from the beginning." : "");
  const restartMintVisible = authorizationExpired || displayedError.toLowerCase().includes("start a new mint from the beginning");
  const terminalSession = finalizeConfirmed || authorizationExpired || authorizeRejected || currentState === "commit_failed" || currentState === "finalize_expired";
  const shouldAutoRefresh = Boolean(sessionId && !terminalSession && commitSubmitted);
  const autoRefreshMs = session?.finalize?.stuck ? 120_000 : 60_000;
  let phaseCopy = "Session not started.";
  if (session) {
    phaseCopy = "Session created. Confirm the wallet in CorePass.";
  }
  if (session?.identify?.completedAt) {
    phaseCopy = "Wallet confirmed. Waiting for mint authorization details.";
  }
  if (authorizeRejected && rejectedSession) {
    phaseCopy = rejectedSession.phaseCopy;
  }
  if (session?.commit) {
    phaseCopy = "Wallet confirmed on desktop. QR 2 of 2 is now ready for the commit transaction.";
  }
  if (authorizationExpired) {
    phaseCopy = "QR 2 of 2 expired before approval. Start a new mint from the beginning.";
  }
  if (currentState === "commit_failed") {
    phaseCopy = "The commit transaction did not confirm successfully.";
  }
  if (currentState === "finalize_expired") {
    phaseCopy =
      "Finalize did not complete within the available window. If your NFT still has not arrived after 30 minutes, start a new mint from the beginning.";
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
    ? "Commit confirmed. Automatic finalize is now in progress."
    : authorizationExpired
      ? "Commit authorization expired before approval."
    : commitSubmitted
      ? "Commit submitted. Waiting for chain confirmation before finalize can begin."
      : "Commit approval is still required.";
  const commitCompletedNote = commitConfirmed
    ? "Automatic finalize usually completes within a few minutes. Please wait."
    : authorizationExpired
      ? "QR 2 of 2 is no longer valid. Do not scan or reuse it. Start a new mint from the beginning."
    : commitSubmitted
      ? "CorePass returned the commit transaction. This desktop page is now waiting for the chain receipt."
      : "Return to this desktop page, then scan QR 2 of 2 to approve the real commit transaction in CorePass.";
  const relayerNote = finalizeConfirmed
    ? "Finalize completed. The mint is now delivered."
    : commitSubmitted && !commitConfirmed
      ? "CorePass returned the commit transaction, but the desktop session is still waiting for an on-chain receipt before automatic finalize can begin."
    : session?.finalize?.stuck
      ? "Automatic finalize is taking longer than expected. Do not start a new mint or reuse any earlier QR within 30 minutes."
      : finalizeStatus === "submitted"
        ? "Automatic finalize was sent by the backend and is now waiting for chain confirmation."
        : finalizeStatus === "retrying" || finalizeStatus === "awaiting_finalize"
          ? session?.relayerEnabled
            ? "Automatic finalize is retrying in the background. This usually completes within a few minutes."
            : "Automatic finalize is currently unavailable for this environment."
          : finalizeStatus === "manual_only"
            ? "Automatic finalize is currently unavailable for this session."
            : finalizeStatus === "expired"
              ? "Finalize did not complete within the available window. If your NFT still has not arrived after 30 minutes, start a new mint from the beginning."
              : session?.relayerEnabled
                ? "Automatic finalize will continue in the background after commit confirmation."
                : "Automatic finalize is currently unavailable for this environment.";
  const automaticPathLabel = finalizeConfirmed
    ? "Completed"
    : commitSubmitted && !commitConfirmed
      ? "Waiting for commit confirmation"
    : finalizeStatus === "submitted"
      ? "Submitted"
      : session?.finalize?.stuck
        ? "Stuck"
        : finalizeStatus === "manual_only"
          ? "Unavailable"
          : finalizeStatus === "expired"
            ? "Expired"
            : session?.relayerEnabled
              ? "Retrying"
              : "Unavailable";
  const boundWallet = session?.identify?.completedAt ? session?.identify?.coreId || session?.minter || "not selected" : "not selected";
  const publishedContractAddress = session?.coreCatsAddress || config.coreCatsAddress;

  useEffect(() => {
    if (!shouldAutoRefresh) return;
    const timer = setInterval(() => {
      refreshSession(sessionId);
    }, autoRefreshMs);
    return () => clearInterval(timer);
  }, [autoRefreshMs, sessionId, shouldAutoRefresh]);

  useEffect(() => {
    if (!displayedError) return;
    const scrollKey = `${sessionId || "no-session"}:${displayedError}`;
    if (lastErrorScrollKeyRef.current === scrollKey) return;
    scrollToSection(issueRef);
    lastErrorScrollKeyRef.current = scrollKey;
  }, [displayedError, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const scrollMarks = scrollMarksRef.current;
    if (scrollMarks.sessionId !== sessionId) return;

    if (finalizeConfirmed && !scrollMarks.success) {
      scrollToSection(successRef);
      scrollMarks.success = true;
      return;
    }

    if (session?.finalize && !finalizeConfirmed && !scrollMarks.step3) {
      scrollToSection(step3Ref);
      scrollMarks.step3 = true;
      return;
    }

    if (session?.commit && !commitSubmitted && !scrollMarks.step2) {
      scrollToSection(step2Ref);
      scrollMarks.step2 = true;
      return;
    }

    if (session && !session?.identify?.completedAt && !scrollMarks.step1) {
      scrollToSection(step1Ref);
      scrollMarks.step1 = true;
    }
  }, [sessionId, session, commitSubmitted, finalizeConfirmed]);
  const progressItems = [
    {
      label: "Session created",
      detail: session ? "A mint session is active." : "Start with CorePass to create a new session.",
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
        : authorizationExpired
          ? "QR 2 of 2 expired before approval. Start a new mint from the beginning."
        : authorizeRejected && rejectedSession
          ? rejectedSession.commitDetail
        : session?.commit
          ? "Scan QR 2 of 2 to approve the commit transaction in CorePass."
          : "Commit is only prepared after wallet confirmation succeeds.",
      tone: commitConfirmed ? "done" : authorizationExpired || authorizeRejected ? "blocked" : session?.commit ? "active" : "waiting",
    },
    {
      label: "Finalize delivered",
      detail: finalizeConfirmed
        ? "Finalize confirmed. The mint is complete."
        : commitSubmitted && !commitConfirmed
          ? "Finalize will only start after the commit transaction is confirmed on-chain."
        : authorizationExpired
          ? "Finalize never started because QR 2 of 2 expired before approval."
        : commitConfirmed
          ? relayerNote
          : authorizeRejected
            ? "Finalize never started because no commit transaction was prepared for this session."
          : "Finalize starts only after the commit is confirmed.",
      tone: finalizeConfirmed ? "done" : authorizationExpired || authorizeRejected ? "blocked" : commitConfirmed ? "active" : "waiting",
    },
  ];

  return (
    <div className="mint-stack">
      <section>
        <article className="mint-card">
          <p className="eyebrow">Start</p>
          <h2>Choose quantity and begin on desktop</h2>
          <p>
            Pick 1 to 3 cats and create a CorePass mint session from this desktop browser. QR 1 of 2 binds the wallet
            with a signature. QR 2 of 2 sends the mint contract call. Wallet-limit checks happen before any
            gas-spending transaction is prepared.
          </p>
          <p className="mint-meta">
            If you want to verify the published contract address and public artifacts first, you can review{" "}
            <a href="/transparency" className="inline-link">
              Transparency
            </a>{" "}
            before approving in CorePass.
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
            <p className="mint-step-summary-title">Desktop-first path</p>
            <p className="mint-meta">Use a desktop browser and wait here while the mint status updates.</p>
            <p className="mint-meta">QR 1 of 2 is a wallet-binding signature. QR 2 of 2 is the mint transaction.</p>
            <p className="mint-meta">Same-device mobile mint is not supported in this stage.</p>
          </div>
          {showTestnetNotice ? (
            <p className="mint-warning">
              In this Devin testnet environment, the available CorePass path still needs support for
              <span className="mono-wrap"> ab... </span>
              addresses to complete live wallet checks.
            </p>
          ) : null}
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

      {displayedError ? (
        <section ref={issueRef} className="mint-card">
          <p className="eyebrow">Issue</p>
          <h2>Attention required</h2>
          <p className="mint-error">{displayedError}</p>
          {restartMintVisible ? (
            <div className="mint-link-grid">
              <a href="/mint" className="button button--primary">
                Start a new mint
              </a>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <article className="mint-card">
          <p className="eyebrow">Progress</p>
          <h2>What stage this mint is in</h2>
          <p>This desktop page tracks the current mint attempt while CorePass handles each approval.</p>
          <div className="mint-progress-summary">
            <StatusLine label="Session state" value={currentStateLabel} />
            <StatusLine label="Mint progress" value={phaseCopy} />
            <StatusLine label="Bound wallet" value={boundWallet} mono />
          </div>
          {sessionId && !terminalSession ? (
            <div className="mint-link-grid">
              <button type="button" className="button button--ghost" onClick={() => refreshSession(sessionId, { manual: true })} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh status"}
              </button>
            </div>
          ) : null}
          {sessionId && !commitSubmitted && !terminalSession ? (
            <p className="mint-meta">After you approve in CorePass, use Refresh status if the next step does not appear yet.</p>
          ) : null}
          {shouldAutoRefresh ? (
            <p className="mint-meta">
              Status now refreshes automatically every {session?.finalize?.stuck ? "2 minutes" : "minute"} while commit/finalize is still pending.
            </p>
          ) : null}
          <div className="mint-progress">
            {progressItems.map((item) => (
              <ProgressItem key={item.label} label={item.label} detail={item.detail} tone={item.tone} />
            ))}
          </div>
        </article>
      </section>

      {session ? (
        <DesktopQrAction
          sectionRef={step1Ref}
          eyebrow="Step 1"
          stepBadge="QR 1 of 2"
          title="Bind your wallet"
          body={
            <>
              <p>This step asks CorePass to sign a wallet-binding message. It proves that you control this wallet.</p>
              <p>No funds are transferred in this step. You are only signing a message.</p>
              <VerificationDetails summary="What this looks like in CorePass">
                <ul className="plain-list mint-verify-list">
                  <li>You may see a &quot;Sign transaction&quot; style screen.</li>
                  <li>The long <span className="mono-wrap">0x...</span> string is the challenge message to sign for wallet binding.</li>
                  <li>This is not a token transfer.</li>
                </ul>
              </VerificationDetails>
            </>
          }
          highlightedNotice="QR 1 of 2: wallet bind only, no funds move."
          request={session.identify}
          pendingNote="Scan QR 1 of 2 with CorePass. The phone should stay inside CorePass after approval, while this desktop page waits for the callback."
          completedLabel={authorizeRejected && rejectedSession ? rejectedSession.step1Label : `CoreID confirmed: ${session.identify.coreId}`}
          completedNote={authorizeRejected && rejectedSession ? rejectedSession.step1Note : "QR 1 of 2 is complete. Stay on this desktop page for QR 2 of 2."}
          completeTone={authorizeRejected ? "blocked" : "done"}
        />
      ) : null}

      {session?.commit ? (
        <DesktopQrAction
          sectionRef={step2Ref}
          eyebrow="Step 2"
          stepBadge="QR 2 of 2"
          title="Send the mint transaction"
          body={
            <>
              <p>This step sends the mint transaction to the CoreCats contract.</p>
              <p>A small amount of XCB is required for network gas.</p>
              <VerificationDetails>
                <ol className="plain-list mint-verify-list">
                  <li>
                    Check the destination address. Make sure the <span className="mono-wrap">to</span> address shown in CorePass matches the published CoreCats contract address.
                  </li>
                  <li>
                    Check the value field. For the mint call, <span className="mono-wrap">value</span> should be <span className="mono-wrap">0</span>. No native token amount is being sent to the contract itself, but gas is still required to submit the transaction.
                  </li>
                  <li>
                    Check the data field. The long <span className="mono-wrap">0x...</span> value is the contract call data for minting.
                  </li>
                  <li>
                    Published contract:{" "}
                    {contractHref ? (
                      <a href={contractHref} target="_blank" rel="noreferrer" className="inline-link mono-wrap">
                        {publishedContractAddress}
                      </a>
                    ) : (
                      <span className="mono-wrap">{publishedContractAddress}</span>
                    )}
                  </li>
                  <li>
                    Review the public references: <a href="/transparency" className="inline-link">Transparency</a> and{" "}
                    <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-link">
                      GitHub
                    </a>
                    .
                  </li>
                  <li>Review the contract address and transaction fields before confirming.</li>
                </ol>
              </VerificationDetails>
            </>
          }
          highlightedNotice="QR 2 of 2: real mint transaction, small XCB gas required."
          request={session.commit}
          pendingNote="Scan QR 2 of 2 to approve the real commit transaction in CorePass."
          completedLabel={commitCompletedLabel}
          completedNote={commitCompletedNote}
          completeTone={authorizationExpired ? "blocked" : "done"}
          resolved={authorizationExpired}
        />
      ) : null}

      {session?.finalize ? (
        <article ref={step3Ref} className="mint-card mint-step-card">
          <p className="eyebrow">Step 3</p>
          <h2>Finalize and reveal the assigned cat</h2>
          <p>
            Commit confirmation records the pending mint, but the NFT is delivered only after finalize succeeds and the
            random assignment is completed on-chain.
          </p>
          <p className="mint-meta">Automatic finalize usually completes within a few minutes. Please wait.</p>
          {finalizeUserNote && !finalizeConfirmed ? (
            <p className="mint-warning">
              Latest finalize note: {finalizeUserNote}
            </p>
          ) : null}
          <div className="mint-action-grid">
            <div className="mint-action-panel">
              <p className="mint-action-title">Automatic finalize status</p>
              <p className="mint-state">{automaticPathLabel}</p>
              <p className="mint-meta">{relayerNote}</p>
              <div className="mint-meta-group">
                <StatusLine label="Finalize path" value={finalizeConfirmed ? `Completed via ${session?.finalize?.mode || "unknown"}` : "Automatic relayer"} />
                <StatusLine label="Finalize state" value={finalizeStatusLabel} />
                <StatusLine label="Last finalize attempt" value={formatDateTime(session?.finalize?.lastAttemptAt)} />
              </div>
            </div>
            <div className="mint-action-panel">
              <p className="mint-action-title">Why this can take a few minutes</p>
              <p className="mint-meta">
                Mint completion can take longer than a single block because the mint finishes in a separate finalize
                step after commit.
              </p>
              <p className="mint-meta">
                This keeps the random assignment checkable from public chain data.
              </p>
              <p className="mint-meta">
                When finalize completes, your cat arrives already revealed.
              </p>
              <p className="mint-meta">Do not start a new mint or reuse any earlier QR within 30 minutes.</p>
              <p className="mint-meta">If your NFT still has not arrived after 30 minutes, start a new mint from the beginning.</p>
            </div>
          </div>
        </article>
      ) : null}

      {finalizeConfirmed ? (
        <section ref={successRef} className="mint-card mint-success-card">
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
        </section>
      ) : null}
    </div>
  );
}
