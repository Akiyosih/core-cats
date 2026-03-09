import crypto from "node:crypto";

import QRCode from "qrcode";
import { Interface } from "ethers";

import { CORECATS_MINT_ABI } from "../corecats-abi.js";
import { getCorePublicConfig, getCoreServerEnv } from "./core-env.js";
import { issueMintAuthorization, relayFinalizeMint } from "./core-spark.js";
import {
  deleteRemoteMintSession,
  fetchFinalizeRelay,
  fetchMintAuthorization,
  isExternalMintBackendEnabled,
  readRemoteMintSession,
  writeRemoteMintSession,
} from "./mint-backend-proxy.js";

const mintInterface = new Interface(CORECATS_MINT_ABI);
const SESSION_TTL_MS = Number(process.env.COREPASS_SESSION_TTL_SECONDS || 20 * 60) * 1000;
const store = globalThis.__coreCatsCorePassMintSessions || new Map();

globalThis.__coreCatsCorePassMintSessions = store;

function nowIso() {
  return new Date().toISOString();
}

function cleanupExpiredSessions() {
  if (isExternalMintBackendEnabled()) {
    return;
  }
  const now = Date.now();
  for (const [sessionId, session] of store.entries()) {
    if (session.expiresAtMs <= now) {
      store.delete(sessionId);
    }
  }
}

async function persistSession(request, session) {
  if (isExternalMintBackendEnabled()) {
    await writeRemoteMintSession(request, session);
  } else {
    store.set(session.id, session);
  }
}

async function removeSession(request, sessionId) {
  if (isExternalMintBackendEnabled()) {
    await deleteRemoteMintSession(request, sessionId);
  } else {
    store.delete(sessionId);
  }
}

async function getRequiredSession(request, sessionId) {
  cleanupExpiredSessions();

  let session = null;
  if (isExternalMintBackendEnabled()) {
    session = await readRemoteMintSession(request, sessionId);
  } else {
    session = store.get(sessionId);
  }

  if (!session) {
    const error = new Error("mint session not found or expired");
    error.code = "session_not_found";
    throw error;
  }

  if (Number(session.expiresAtMs || 0) <= Date.now()) {
    await removeSession(request, sessionId);
    const error = new Error("mint session not found or expired");
    error.code = "session_not_found";
    throw error;
  }

  return session;
}

function buildAbsoluteUrl(request, pathname, search = "") {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = forwardedProto || (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}${pathname}${search}`;
}

export function buildCorePassUri(action, pathValue, params) {
  const base = pathValue ? `corepass:${action}/${pathValue}` : `corepass:${action}/`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `${base}?${suffix}` : base;
}

async function toQrDataUrl(value) {
  return QRCode.toDataURL(value, {
    width: 320,
    margin: 1,
    color: {
      dark: "#18120d",
      light: "#0000",
    },
  });
}

function sessionPublicMeta() {
  const config = getCorePublicConfig();
  return {
    chainId: config.chainId,
    networkName: config.networkName,
    coreCatsAddress: config.coreCatsAddress,
    explorerBaseUrl: config.explorerBaseUrl,
    relayerEnabled: config.relayerEnabled,
  };
}

function buildCallbackUrl(request, sessionId, step) {
  return buildAbsoluteUrl(request, "/api/mint/corepass/callback", `?sessionId=${encodeURIComponent(sessionId)}&step=${encodeURIComponent(step)}`);
}

async function buildSignRequest(request, session) {
  const deadline = Math.floor(session.expiresAtMs / 1000);
  const callbackConn = buildCallbackUrl(request, session.id, "identify");
  const requestedCoreId = normalizeCoreId(session.identify.expectedCoreId);
  const desktopUri = buildCorePassUri("sign", requestedCoreId, {
    data: session.identify.challengeHex,
    conn: callbackConn,
    dl: deadline,
    type: "callback",
  });
  const mobileUri = buildCorePassUri("sign", requestedCoreId, {
    data: session.identify.challengeHex,
    conn: callbackConn,
    dl: deadline,
    type: "app-link",
  });

  session.identify.desktopUri = desktopUri;
  session.identify.mobileUri = mobileUri;
  session.identify.qrDataUrl = await toQrDataUrl(desktopUri);
}

async function buildCommitRequest(request, session) {
  const meta = sessionPublicMeta();
  const nonce = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`).toString(10);
  const expiry = Math.floor(Date.now() / 1000) + 10 * 60;
  const commitHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const authorization = isExternalMintBackendEnabled()
    ? await fetchMintAuthorization(request, {
        minter: session.minter,
        quantity: session.quantity,
      })
    : await issueMintAuthorization({
        minter: session.minter,
        quantity: session.quantity,
        nonce,
        expiry,
      });

  const resolvedNonce = authorization.nonce || nonce;
  const resolvedExpiry = authorization.expiry || expiry;
  const data = mintInterface.encodeFunctionData("commitMint", [
    session.quantity,
    commitHash,
    resolvedNonce,
    resolvedExpiry,
    authorization.signature,
  ]);
  const callbackConn = buildCallbackUrl(request, session.id, "commit");

  const desktopUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: authorization.expiry,
    type: "callback",
  });
  const mobileUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: authorization.expiry,
    type: "app-link",
  });

  session.commit = {
    status: "awaiting_commit",
    nonce: resolvedNonce,
    expiry: resolvedExpiry,
    messageHash: authorization.messageHash,
    commitHash,
    data,
    desktopUri,
    mobileUri,
    qrDataUrl: await toQrDataUrl(desktopUri),
    txHash: "",
    confirmedAt: "",
  };
  session.status = "awaiting_commit";
  session.updatedAt = nowIso();
}

async function buildFinalizeRequest(request, session) {
  const meta = sessionPublicMeta();
  const data = mintInterface.encodeFunctionData("finalizeMint", [session.minter]);
  const deadline = Math.floor(session.expiresAtMs / 1000);
  const callbackConn = buildCallbackUrl(request, session.id, "finalize");
  const desktopUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: deadline,
    type: "callback",
  });
  const mobileUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: deadline,
    type: "app-link",
  });

  session.finalize = {
    status: session.finalize?.status || "awaiting_finalize",
    data,
    desktopUri,
    mobileUri,
    qrDataUrl: await toQrDataUrl(desktopUri),
    txHash: session.finalize?.txHash || "",
    submittedAt: session.finalize?.submittedAt || "",
    confirmedAt: session.finalize?.confirmedAt || "",
    mode: session.finalize?.mode || "manual",
    lastError: session.finalize?.lastError || "",
  };
  session.updatedAt = nowIso();
}

function normalizeCoreId(value) {
  return String(value || "").trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCallbackKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function collectCallbackFields(source, target = new Map()) {
  if (!isPlainObject(source)) {
    return target;
  }

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeCallbackKey(key);
    if (!target.has(normalizedKey)) {
      target.set(normalizedKey, value);
    }
    if (isPlainObject(value)) {
      collectCallbackFields(value, target);
    }
  }

  return target;
}

function pickCallbackField(fields, searchParams, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeCallbackKey(alias);
    if (fields.has(normalizedAlias)) {
      const value = fields.get(normalizedAlias);
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }

  for (const [key, value] of searchParams.entries()) {
    const normalizedKey = normalizeCallbackKey(key);
    if (!aliases.some((alias) => normalizeCallbackKey(alias) === normalizedKey)) {
      continue;
    }
    if (String(value || "").trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function appendHistory(session, entry) {
  const item = { at: nowIso(), ...entry };
  session.history.push(item);
  if (session.history.length > 12) {
    session.history = session.history.slice(-12);
  }
}

function serializeSession(session) {
  const meta = sessionPublicMeta();
  return {
    sessionId: session.id,
    status: session.status,
    quantity: session.quantity,
    minter: session.minter || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: new Date(session.expiresAtMs).toISOString(),
    chainId: meta.chainId,
    networkName: meta.networkName,
    coreCatsAddress: meta.coreCatsAddress,
    explorerBaseUrl: meta.explorerBaseUrl,
    relayerEnabled: meta.relayerEnabled,
    identify: {
      challengeHex: session.identify.challengeHex,
      desktopUri: session.identify.desktopUri,
      mobileUri: session.identify.mobileUri,
      qrDataUrl: session.identify.qrDataUrl,
      coreId: session.identify.coreId || null,
      completedAt: session.identify.completedAt || null,
    },
    commit: session.commit
      ? {
          expiry: session.commit.expiry,
          messageHash: session.commit.messageHash,
          desktopUri: session.commit.desktopUri,
          mobileUri: session.commit.mobileUri,
          qrDataUrl: session.commit.qrDataUrl,
          txHash: session.commit.txHash || null,
          confirmedAt: session.commit.confirmedAt || null,
        }
      : null,
    finalize: session.finalize
      ? {
          status: session.finalize.status,
          desktopUri: session.finalize.desktopUri,
          mobileUri: session.finalize.mobileUri,
          qrDataUrl: session.finalize.qrDataUrl,
          txHash: session.finalize.txHash || null,
          submittedAt: session.finalize.submittedAt || null,
          confirmedAt: session.finalize.confirmedAt || null,
          mode: session.finalize.mode,
          lastError: session.finalize.lastError || null,
        }
      : null,
    history: session.history,
  };
}

export async function createMintSession(request, { quantity }) {
  cleanupExpiredSessions();
  const env = getCoreServerEnv();

  const session = {
    id: crypto.randomUUID(),
    quantity,
    status: "awaiting_identity",
    minter: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    expiresAtMs: Date.now() + SESSION_TTL_MS,
    identify: {
      challengeHex: `0x${crypto.randomBytes(32).toString("hex")}`,
      desktopUri: "",
      mobileUri: "",
      qrDataUrl: "",
      coreId: "",
      expectedCoreId: normalizeCoreId(env.corePassExpectedCoreId),
      completedAt: "",
    },
    commit: null,
    finalize: null,
    history: [],
  };

  await buildSignRequest(request, session);
  appendHistory(session, { step: "identify", event: "session_created" });
  await persistSession(request, session);
  return serializeSession(session);
}

export async function readMintSession(request, sessionId) {
  return serializeSession(await getRequiredSession(request, sessionId));
}

export function parseCallbackPayload(requestUrl, payload = {}, searchParams) {
  const source = payload && typeof payload === "object" ? payload : {};
  const fields = collectCallbackFields(source);
  return {
    sessionId: pickCallbackField(fields, searchParams, ["sessionId", "session_id", "session"]),
    step: pickCallbackField(fields, searchParams, ["step"]),
    coreId: normalizeCoreId(
      pickCallbackField(fields, searchParams, ["coreID", "coreId", "coreid", "core_id", "user", "from", "minter"]),
    ),
    signature: pickCallbackField(fields, searchParams, ["signature", "sig"]),
    txHash: pickCallbackField(fields, searchParams, ["txHash", "tx_hash", "transactionHash", "transaction_hash", "hash"]),
    message: pickCallbackField(fields, searchParams, ["message", "detail", "msg"]),
    requestUrl,
  };
}

export function resolveIdentifyCoreId(parsedCoreId, expectedCoreId) {
  const callbackCoreId = normalizeCoreId(parsedCoreId);
  if (callbackCoreId) {
    return callbackCoreId;
  }
  return normalizeCoreId(expectedCoreId);
}

export async function applyCorePassCallback(request, payload) {
  const url = new URL(request.url);
  const parsed = parseCallbackPayload(request.url, payload, url.searchParams);
  const session = await getRequiredSession(request, parsed.sessionId);

  if (parsed.step === "identify") {
    const resolvedCoreId = resolveIdentifyCoreId(parsed.coreId, session.identify.expectedCoreId);

    if (!resolvedCoreId) {
      const error = new Error("CorePass identify callback did not include coreID");
      error.code = "missing_coreid";
      throw error;
    }

    session.minter = resolvedCoreId;
    session.identify.coreId = resolvedCoreId;
    session.identify.completedAt = nowIso();
    appendHistory(session, {
      step: "identify",
      event: "completed",
      coreId: resolvedCoreId,
      callbackCoreId: parsed.coreId || null,
      expectedCoreId: session.identify.expectedCoreId || null,
    });
    await buildCommitRequest(request, session);
    await persistSession(request, session);
    return serializeSession(session);
  }

  if (parsed.step === "commit") {
    if (!session.commit) {
      const error = new Error("commit callback arrived before commit request was prepared");
      error.code = "commit_not_ready";
      throw error;
    }
    if (parsed.coreId && session.minter && parsed.coreId !== session.minter) {
      const error = new Error("commit callback coreID does not match the signed mint session");
      error.code = "coreid_mismatch";
      throw error;
    }
    session.commit.txHash = parsed.txHash;
    session.commit.confirmedAt = nowIso();
    session.status = "commit_confirmed";
    appendHistory(session, { step: "commit", event: "confirmed", txHash: parsed.txHash || null });
    await buildFinalizeRequest(request, session);
    await persistSession(request, session);
    return serializeSession(session);
  }

  if (parsed.step === "finalize") {
    if (!session.finalize) {
      const error = new Error("finalize callback arrived before finalize request was prepared");
      error.code = "finalize_not_ready";
      throw error;
    }
    session.finalize.txHash = parsed.txHash;
    session.finalize.confirmedAt = nowIso();
    session.finalize.status = "confirmed";
    session.finalize.mode = "corepass";
    session.status = "finalized";
    appendHistory(session, { step: "finalize", event: "confirmed", txHash: parsed.txHash || null });
    await persistSession(request, session);
    return serializeSession(session);
  }

  const error = new Error(`unsupported callback step: ${parsed.step || "unknown"}`);
  error.code = "unsupported_step";
  throw error;
}

export async function attemptSessionFinalize(sessionId) {
  const request = new Request("https://placeholder.local/");
  const session = await getRequiredSession(request, sessionId);
  if (!session.minter) {
    const error = new Error("mint session has no CorePass minter yet");
    error.code = "missing_minter";
    throw error;
  }
  if (!session.finalize) {
    const error = new Error("finalize request is not ready yet");
    error.code = "finalize_not_ready";
    throw error;
  }
  if (session.finalize.txHash) {
    return serializeSession(session);
  }

  try {
    const result = isExternalMintBackendEnabled()
      ? await fetchFinalizeRelay(request, { minter: session.minter })
      : await relayFinalizeMint({ minter: session.minter });
    session.finalize.txHash = result.txHash;
    session.finalize.submittedAt = nowIso();
    session.finalize.status = "submitted";
    session.finalize.mode = "relayer";
    session.status = "finalize_submitted";
    session.updatedAt = nowIso();
    appendHistory(session, { step: "finalize", event: "submitted_by_relayer", txHash: result.txHash });
    await persistSession(request, session);
    return serializeSession(session);
  } catch (error) {
    session.finalize.lastError = error.message;
    session.updatedAt = nowIso();
    appendHistory(session, { step: "finalize", event: "relayer_error", detail: error.message });
    await persistSession(request, session);
    throw error;
  }
}
