import crypto from "node:crypto";

import { getBytes, verifyMessage } from "ethers";
import QRCode from "qrcode";

import { encodeCoreCatsCommitMintData, encodeCoreCatsFinalizeMintData } from "./core-calldata.js";
import { getCorePublicConfig, getCoreServerEnv, getSiteBaseUrlConfigError, normalizeCoreAddressKey } from "./core-env.js";
import { relayFinalizeMint } from "./core-spark.js";
import {
  deleteRemoteMintSession,
  fetchFinalizeRelay,
  isExternalMintBackendEnabled,
  readRemoteMintSession,
  writeRemoteMintSession,
} from "./mint-backend-proxy.js";
import { runMintPrecheck } from "./mint-precheck.js";

const SESSION_TTL_MS = Number(process.env.COREPASS_SESSION_TTL_SECONDS || 20 * 60) * 1000;
const ACTIVE_MINT_SESSION_TTL_MS = Number(process.env.COREPASS_ACTIVE_MINT_SESSION_TTL_SECONDS || 35 * 60) * 1000;
const SESSION_READ_CACHE_TTL_MS = Number(process.env.COREPASS_SESSION_READ_CACHE_SECONDS || 15) * 1000;
const TERMINAL_SESSION_READ_CACHE_TTL_MS = Number(process.env.COREPASS_TERMINAL_SESSION_READ_CACHE_SECONDS || 60 * 60) * 1000;
const MISSING_SESSION_READ_CACHE_TTL_MS = Number(process.env.COREPASS_MISSING_SESSION_CACHE_SECONDS || 60) * 1000;
const HEX_40_RE = /^[0-9a-f]{40}$/;
const store = globalThis.__coreCatsCorePassMintSessions || new Map();
const sessionReadCache = globalThis.__coreCatsCorePassMintSessionReadCache || new Map();

globalThis.__coreCatsCorePassMintSessions = store;
globalThis.__coreCatsCorePassMintSessionReadCache = sessionReadCache;

function nowIso() {
  return new Date().toISOString();
}

function extendSessionExpiry(session, ttlMs = ACTIVE_MINT_SESSION_TTL_MS) {
  const nextExpiry = Date.now() + ttlMs;
  session.expiresAtMs = Math.max(Number(session.expiresAtMs || 0), nextExpiry);
}

function structuredCloneSafe(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
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

function cleanupSessionReadCache() {
  const now = Date.now();
  for (const [sessionId, entry] of sessionReadCache.entries()) {
    if (Number(entry?.expiresAtMs || 0) <= now) {
      sessionReadCache.delete(sessionId);
    }
  }
}

function invalidateSessionReadCache(sessionId) {
  if (!sessionId) return;
  sessionReadCache.delete(sessionId);
}

function buildCachedMissingSessionError(entry) {
  const error = new Error(entry?.message || "mint session not found or expired");
  error.code = entry?.code || "session_not_found";
  return error;
}

function cacheMissingSession(sessionId, error, ttlMs = MISSING_SESSION_READ_CACHE_TTL_MS) {
  sessionReadCache.set(sessionId, {
    kind: "missing",
    code: error.code || "session_not_found",
    message: error.message || "mint session not found or expired",
    expiresAtMs: Date.now() + ttlMs,
  });
}

function isCommitAuthorizationExpired(session) {
  if (!session?.commit) {
    return false;
  }
  if (String(session.commit.txHash || "").trim()) {
    return false;
  }
  const expiryMs = Number(session.commit.expiry || 0) * 1000;
  return expiryMs > 0 && expiryMs <= Date.now();
}

function isTerminalSession(session) {
  return (
    Boolean(session?.finalize?.confirmedAt) ||
    session?.status === "authorize_rejected" ||
    session?.status === "precheck_rejected" ||
    session?.status === "commit_failed" ||
    session?.status === "finalize_expired" ||
    isCommitAuthorizationExpired(session)
  );
}

function cacheSerializedSession(sessionId, payload, ttlMs) {
  sessionReadCache.set(sessionId, {
    kind: "value",
    payload: structuredCloneSafe(payload),
    expiresAtMs: Date.now() + ttlMs,
  });
}

async function persistSession(request, session) {
  invalidateSessionReadCache(session?.id);
  if (isExternalMintBackendEnabled()) {
    await writeRemoteMintSession(request, session);
  } else {
    store.set(session.id, session);
  }
}

async function removeSession(request, sessionId) {
  invalidateSessionReadCache(sessionId);
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
  const config = getCorePublicConfig();
  if (config.siteBaseUrl) {
    const siteBaseUrlError = getSiteBaseUrlConfigError(config.siteBaseUrl);
    if (siteBaseUrlError) {
      const error = new Error(siteBaseUrlError);
      error.code = "mint_runtime_misconfigured";
      throw error;
    }
    return `${config.siteBaseUrl}${pathname}${search}`;
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const isLocalHost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  if (!isLocalHost || !host) {
    const error = new Error(
      "NEXT_PUBLIC_SITE_BASE_URL or CORECATS_SITE_BASE_URL must be explicitly set before mint callback URLs are generated.",
    );
    error.code = "mint_runtime_misconfigured";
    throw error;
  }
  const protocol = forwardedProto || "http";
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

function buildCorePassLoginUri(pathValue, params) {
  const base = pathValue ? `corepass:login/${pathValue}` : "corepass:login/";
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
  const pathname = `/api/mint/corepass/callback/${encodeURIComponent(sessionId)}/${encodeURIComponent(step)}`;
  return buildAbsoluteUrl(request, pathname);
}

function corePassReturnType(handoffMode) {
  // CorePass behaves better when desktop QR scans stay callback-based, while
  // same-device launches return through the calling browser/app. This keeps
  // the QR scanner path stable without forcing the mobile handoff back into an
  // in-wallet browser hop.
  return normalizeHandoffMode(handoffMode) === "same-device" ? "app-link" : "callback";
}

function normalizeHandoffMode(value) {
  return String(value || "").trim().toLowerCase() === "same-device" ? "same-device" : "desktop";
}

function isIdentifySignatureRecoveryEnabled() {
  const normalized = String(process.env.COREPASS_IDENTIFY_USE_SIGNATURE_RECOVERY || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeIdentifyMethod(value) {
  return String(value || "").trim().toLowerCase() === "login" ? "login" : "sign";
}

function coreAddressPrefixForChainId(chainId) {
  const normalized = Number(chainId || 0);
  if (normalized === 1) return "cb";
  if (normalized === 3) return "ab";
  return "ce";
}

function calculateCoreChecksum(addressHex, prefixHex) {
  const addrString = `${addressHex}${prefixHex}00`.toUpperCase();
  let mods = "";
  for (const character of addrString) {
    const code = character.charCodeAt(0);
    mods += code > 64 && code < 91 ? String(code - 55) : character;
  }
  const remainder = BigInt(mods) % 97n;
  const checksum = 98n - remainder;
  return checksum < 10n ? `0${checksum}` : String(checksum);
}

export function coreHexAddressToCoreId(value, chainId = 1) {
  const raw = String(value || "").trim().toLowerCase();
  const body = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!HEX_40_RE.test(body)) {
    throw new Error(`Unsupported 20-byte signer address format: ${value}`);
  }
  const prefix = coreAddressPrefixForChainId(chainId);
  return `${prefix}${calculateCoreChecksum(body, prefix)}${body}`;
}

export function recoverIdentifyCoreIdFromSignature(challengeHex, signature, chainId = 1) {
  const normalizedChallenge = String(challengeHex || "").trim();
  const normalizedSignature = String(signature || "").trim();
  if (!normalizedChallenge || !normalizedSignature) {
    return "";
  }
  try {
    const signer = verifyMessage(getBytes(normalizedChallenge), normalizedSignature);
    return coreHexAddressToCoreId(signer, chainId);
  } catch {
    return "";
  }
}

async function buildSignRequest(request, session) {
  const deadline = Math.floor(session.expiresAtMs / 1000);
  const callbackConn = buildCallbackUrl(request, session.id, "identify");
  const requestedCoreId = normalizeCoreId(session.identify.expectedCoreId);
  const desktopUri = buildCorePassUri("sign", requestedCoreId, {
    data: session.identify.challengeHex,
    conn: callbackConn,
    dl: deadline,
    type: corePassReturnType("desktop"),
  });
  const mobileUri = buildCorePassUri("sign", requestedCoreId, {
    data: session.identify.challengeHex,
    conn: callbackConn,
    dl: deadline,
    type: corePassReturnType(session.handoffMode),
  });

  session.identify.desktopUri = desktopUri;
  session.identify.mobileUri = mobileUri;
  session.identify.qrDataUrl = await toQrDataUrl(desktopUri);
}

async function buildLoginRequest(request, session) {
  const callbackConn = buildAbsoluteUrl(request, "/api/mint/corepass/callback");
  const requestedCoreId = normalizeCoreId(session.identify.expectedCoreId);
  const loginSession = String(session.identify.loginSession || session.id).trim();
  const desktopUri = buildCorePassLoginUri(requestedCoreId, {
    sess: loginSession,
    conn: callbackConn,
    type: corePassReturnType("desktop"),
  });
  const mobileUri = buildCorePassLoginUri(requestedCoreId, {
    sess: loginSession,
    conn: callbackConn,
    type: corePassReturnType(session.handoffMode),
  });

  session.identify.desktopUri = desktopUri;
  session.identify.mobileUri = mobileUri;
  session.identify.qrDataUrl = await toQrDataUrl(desktopUri);
}

async function buildIdentifyRequest(request, session) {
  if (normalizeIdentifyMethod(session.identify.method) === "login") {
    await buildLoginRequest(request, session);
    return;
  }
  await buildSignRequest(request, session);
}

async function buildCommitRequest(request, session) {
  const meta = sessionPublicMeta();
  const commitHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const data = encodeCoreCatsCommitMintData({
    quantity: session.quantity,
    commitHash,
  });
  const callbackConn = buildCallbackUrl(request, session.id, "commit");

  const desktopUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    type: corePassReturnType("desktop"),
  });
  const mobileUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    type: corePassReturnType(session.handoffMode),
  });

  session.commit = {
    status: "awaiting_commit",
    commitHash,
    data,
    walletState: session.walletState || null,
    desktopUri,
    mobileUri,
    qrDataUrl: await toQrDataUrl(desktopUri),
    txHash: "",
    submittedAt: "",
    confirmedAt: "",
    confirmedBlockNumber: 0,
  };
  session.status = "awaiting_commit";
  session.error = null;
  session.updatedAt = nowIso();
}

export function createFinalizeState(previous) {
  const source = previous && typeof previous === "object" ? previous : {};
  return {
    status: source.status || "awaiting_finalize",
    data: source.data || "",
    desktopUri: source.desktopUri || "",
    mobileUri: source.mobileUri || "",
    qrDataUrl: source.qrDataUrl || "",
    txHash: source.txHash || "",
    submittedAt: source.submittedAt || "",
    confirmedAt: source.confirmedAt || "",
    mode: source.mode || "manual",
    lastError: source.lastError || "",
    lastErrorCode: source.lastErrorCode || "",
    lastAttemptAt: source.lastAttemptAt || "",
    retryCount: Number(source.retryCount || 0),
    stuck: Boolean(source.stuck),
    stuckSince: source.stuckSince || "",
    confirmedBlockNumber: Number(source.confirmedBlockNumber || 0),
  };
}

function isFinalizeAddressEncodingError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "INVALID_ARGUMENT" || message.includes("invalid address") || message.includes("unsupported core address");
}

export function tryEncodeFinalizeMintData(minter) {
  try {
    return {
      data: encodeCoreCatsFinalizeMintData({ minter }),
      manualAvailable: true,
      error: "",
    };
  } catch (error) {
    if (isFinalizeAddressEncodingError(error)) {
      return {
        data: "",
        manualAvailable: false,
        error: error.message,
      };
    }
    throw error;
  }
}

async function buildFinalizeRequest(request, session) {
  const meta = sessionPublicMeta();
  const finalize = createFinalizeState(session.finalize);
  const encoded = tryEncodeFinalizeMintData(session.minter);

  if (!encoded.manualAvailable) {
    session.finalize = {
      ...finalize,
      mode: meta.relayerEnabled ? "relayer" : finalize.mode,
    };
    session.updatedAt = nowIso();
    appendHistory(session, {
      step: "finalize",
      event: "manual_request_unavailable",
      detail: encoded.error,
    });
    return;
  }

  const data = encoded.data;
  const deadline = Math.floor(session.expiresAtMs / 1000);
  const callbackConn = buildCallbackUrl(request, session.id, "finalize");
  const desktopUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: deadline,
    type: corePassReturnType("desktop"),
  });
  const mobileUri = buildCorePassUri("tx", session.minter, {
    val: 0,
    to: meta.coreCatsAddress,
    data,
    conn: callbackConn,
    dl: deadline,
    type: corePassReturnType(session.handoffMode),
  });

  session.finalize = {
    ...finalize,
    status: finalize.status || "awaiting_finalize",
    data,
    desktopUri,
    mobileUri,
    qrDataUrl: await toQrDataUrl(desktopUri),
    mode: finalize.mode === "relayer" ? "manual" : finalize.mode,
  };
  session.updatedAt = nowIso();
}

function normalizeCoreId(value) {
  return String(value || "").trim();
}

function normalizeLoginSessionToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "");
}

function loginSessionFromMintSessionId(sessionId) {
  return normalizeLoginSessionToken(sessionId);
}

function mintSessionIdFromLoginSession(sessionToken) {
  const normalized = normalizeLoginSessionToken(sessionToken);
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    return "";
  }
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

function coreIdsMatch(left, right) {
  const normalizedLeft = normalizeCoreId(left);
  const normalizedRight = normalizeCoreId(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  try {
    return normalizeCoreAddressKey(normalizedLeft) === normalizeCoreAddressKey(normalizedRight);
  } catch {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  }
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

function parseStructuredCallbackValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const candidates = [raw];
  if (/%[0-9a-f]{2}/i.test(raw)) {
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded && decoded !== raw) {
        candidates.push(decoded);
      }
    } catch {}
  }

  for (const candidate of candidates) {
    const trimmed = String(candidate || "").trim();
    if (!trimmed) {
      continue;
    }

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (isPlainObject(parsed)) {
          return parsed;
        }
        if (typeof parsed === "string" && parsed.trim() && parsed !== trimmed) {
          const nested = parseStructuredCallbackValue(parsed);
          if (nested) {
            return nested;
          }
        }
      } catch {}
    }

    if (trimmed.includes("=")) {
      const searchParams = new URLSearchParams(trimmed);
      if (Array.from(searchParams.keys()).length > 0) {
        return Object.fromEntries(searchParams.entries());
      }
    }
  }

  return null;
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
      continue;
    }
    const structuredValue = parseStructuredCallbackValue(value);
    if (structuredValue) {
      collectCallbackFields(structuredValue, target);
    }
  }

  return target;
}

function collectCallbackSearchParams(searchParams, target = new Map()) {
  for (const [key, value] of searchParams.entries()) {
    const normalizedKey = normalizeCallbackKey(key);
    if (!target.has(normalizedKey)) {
      target.set(normalizedKey, value);
    }
    const structuredValue = parseStructuredCallbackValue(value);
    if (structuredValue) {
      collectCallbackFields(structuredValue, target);
    }
  }

  return target;
}

function pickCallbackField(fields, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeCallbackKey(alias);
    if (fields.has(normalizedAlias)) {
      const value = fields.get(normalizedAlias);
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }

  return "";
}

function summarizeCallbackPayload(payload, searchParams, fields) {
  return {
    payloadKeys: Object.keys(payload || {}).slice(0, 12),
    searchParamKeys: Array.from(new Set(Array.from(searchParams.keys()))).slice(0, 12),
    fieldKeys: Array.from(fields.keys()).slice(0, 20),
  };
}

function appendHistory(session, entry) {
  const item = { at: nowIso(), ...entry };
  session.history.push(item);
  if (session.history.length > 12) {
    session.history = session.history.slice(-12);
  }
}

function matchesCallbackTxHash(currentTxHash, nextTxHash) {
  return (
    String(currentTxHash || "").trim().toLowerCase() !== "" &&
    String(currentTxHash || "").trim().toLowerCase() === String(nextTxHash || "").trim().toLowerCase()
  );
}

export function applyFinalizeCallbackState(session, txHash) {
  if (matchesCallbackTxHash(session?.finalize?.txHash, txHash)) {
    session.error = null;
    extendSessionExpiry(session);
    session.updatedAt = nowIso();
    appendHistory(session, {
      step: "finalize",
      event: "duplicate_callback_ignored",
      txHash: txHash || null,
    });
    return { duplicate: true };
  }

  session.finalize.txHash = txHash;
  session.finalize.confirmedAt = nowIso();
  session.finalize.status = "confirmed";
  session.finalize.mode = "corepass";
  session.finalize.lastError = "";
  session.finalize.lastErrorCode = "";
  session.finalize.stuck = false;
  session.finalize.stuckSince = "";
  session.status = "finalized";
  session.error = null;
  extendSessionExpiry(session);
  appendHistory(session, { step: "finalize", event: "confirmed", txHash: txHash || null });
  return { duplicate: false };
}

function serializeSession(session) {
  const meta = sessionPublicMeta();
  return {
    sessionId: session.id,
    handoffMode: normalizeHandoffMode(session.handoffMode),
    status: session.status,
    quantity: session.quantity,
    minter: session.minter || null,
    walletState: session.walletState || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: new Date(session.expiresAtMs).toISOString(),
    chainId: meta.chainId,
    networkName: meta.networkName,
    coreCatsAddress: meta.coreCatsAddress,
    explorerBaseUrl: meta.explorerBaseUrl,
    relayerEnabled: meta.relayerEnabled,
    error: session.error
      ? {
          code: session.error.code || null,
          message: session.error.message || null,
        }
      : null,
    identify: {
      method: normalizeIdentifyMethod(session.identify.method),
      challengeHex: session.identify.challengeHex,
      desktopUri: session.identify.desktopUri,
      mobileUri: session.identify.mobileUri,
      qrDataUrl: session.identify.qrDataUrl,
      coreId: session.identify.coreId || null,
      callbackCoreId: session.identify.callbackCoreId || null,
      recoveredCoreId: session.identify.recoveredCoreId || null,
      resolutionSource: session.identify.resolutionSource || null,
      completedAt: session.identify.completedAt || null,
    },
    commit: session.commit
      ? {
          status: session.commit.status || null,
          walletState: session.commit.walletState || null,
          expiry: session.commit.expiry,
          messageHash: session.commit.messageHash,
          desktopUri: session.commit.desktopUri,
          mobileUri: session.commit.mobileUri,
          qrDataUrl: session.commit.qrDataUrl,
          txHash: session.commit.txHash || null,
          submittedAt: session.commit.submittedAt || null,
          confirmedAt: session.commit.confirmedAt || null,
          confirmedBlockNumber: Number(session.commit.confirmedBlockNumber || 0) || null,
        }
      : null,
    finalize: session.finalize
      ? {
          status: session.finalize.status,
          desktopUri: session.finalize.desktopUri,
          mobileUri: session.finalize.mobileUri,
          qrDataUrl: session.finalize.qrDataUrl,
          manualAvailable: Boolean(session.finalize.desktopUri || session.finalize.mobileUri),
          txHash: session.finalize.txHash || null,
          submittedAt: session.finalize.submittedAt || null,
          confirmedAt: session.finalize.confirmedAt || null,
          mode: session.finalize.mode,
          lastError: session.finalize.lastError || null,
          lastErrorCode: session.finalize.lastErrorCode || null,
          lastAttemptAt: session.finalize.lastAttemptAt || null,
          retryCount: Number(session.finalize.retryCount || 0),
          stuck: Boolean(session.finalize.stuck),
          stuckSince: session.finalize.stuckSince || null,
          confirmedBlockNumber: Number(session.finalize.confirmedBlockNumber || 0) || null,
        }
      : null,
    history: session.history,
  };
}

export async function createMintSession(request, { quantity, handoffMode }) {
  cleanupExpiredSessions();
  cleanupSessionReadCache();
  const env = getCoreServerEnv();

  const session = {
    id: crypto.randomUUID(),
    handoffMode: normalizeHandoffMode(handoffMode),
    quantity,
    status: "awaiting_identity",
    minter: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    expiresAtMs: Date.now() + SESSION_TTL_MS,
    identify: {
      method: normalizeIdentifyMethod(env.corePassIdentifyMethod),
      challengeHex: `0x${crypto.randomBytes(32).toString("hex")}`,
      loginSession: "",
      desktopUri: "",
      mobileUri: "",
      qrDataUrl: "",
      coreId: "",
      callbackCoreId: "",
      recoveredCoreId: "",
      resolutionSource: "",
      expectedCoreId: normalizeCoreId(env.corePassExpectedCoreId),
      completedAt: "",
    },
    commit: null,
    finalize: null,
    error: null,
    walletState: null,
    history: [],
  };
  session.identify.loginSession = loginSessionFromMintSessionId(session.id);

  await buildIdentifyRequest(request, session);
  appendHistory(session, { step: "identify", event: "session_created" });
  await persistSession(request, session);
  return serializeSession(session);
}

export async function readMintSession(request, sessionId, { force = false } = {}) {
  cleanupSessionReadCache();

  if (!force) {
    const cached = sessionReadCache.get(sessionId);
    if (cached?.kind === "value" && Number(cached.expiresAtMs || 0) > Date.now()) {
      return structuredCloneSafe(cached.payload);
    }
    if (cached?.kind === "missing" && Number(cached.expiresAtMs || 0) > Date.now()) {
      throw buildCachedMissingSessionError(cached);
    }
  }

  try {
    const session = await getRequiredSession(request, sessionId);
    const serialized = serializeSession(session);
    const ttlMs = isTerminalSession(session) ? TERMINAL_SESSION_READ_CACHE_TTL_MS : SESSION_READ_CACHE_TTL_MS;
    cacheSerializedSession(sessionId, serialized, ttlMs);
    return structuredCloneSafe(serialized);
  } catch (error) {
    if (error.code === "session_not_found") {
      cacheMissingSession(sessionId, error);
    }
    throw error;
  }
}

export async function resolveMintSessionHandoffMode(request, sessionId) {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) {
    return "";
  }
  try {
    const session = await readMintSession(request, normalizedSessionId);
    return normalizeHandoffMode(session?.handoffMode) === "same-device" ? "same-device" : "";
  } catch {
    return "";
  }
}

export function parseCallbackPayload(requestUrl, payload = {}, searchParams) {
  const source = payload && typeof payload === "object" ? payload : {};
  const fields = collectCallbackSearchParams(searchParams, collectCallbackFields(source));
  const explicitSessionId = pickCallbackField(fields, ["sessionId", "session_id"]);
  const protocolSession = pickCallbackField(fields, ["session"]);
  return {
    sessionId: explicitSessionId || mintSessionIdFromLoginSession(protocolSession) || protocolSession,
    protocolSession,
    step: pickCallbackField(fields, ["step"]),
    coreId: normalizeCoreId(
      pickCallbackField(fields, ["coreID", "coreId", "coreid", "core_id", "user", "from", "minter"]),
    ),
    signature: pickCallbackField(fields, ["signature", "sig"]),
    txHash: pickCallbackField(fields, ["txHash", "tx_hash", "transactionHash", "transaction_hash", "hash"]),
    message: pickCallbackField(fields, ["message", "detail", "msg"]),
    debug: summarizeCallbackPayload(source, searchParams, fields),
    requestUrl,
  };
}

export function resolveIdentifyCoreIdOutcome(parsedCoreId, expectedCoreId, options = {}) {
  const callbackCoreId = normalizeCoreId(parsedCoreId);
  const recoveredCoreId = normalizeCoreId(options.recoveredCoreId);
  if (options.preferRecoveredSignature && recoveredCoreId) {
    return {
      coreId: recoveredCoreId,
      source: "recovered_signature",
    };
  }
  if (callbackCoreId) {
    return {
      coreId: callbackCoreId,
      source: "callback_coreid",
    };
  }
  const normalizedExpectedCoreId = normalizeCoreId(expectedCoreId);
  if (normalizedExpectedCoreId) {
    return {
      coreId: normalizedExpectedCoreId,
      source: "expected_coreid",
    };
  }
  return {
    coreId: "",
    source: "",
  };
}

export function resolveIdentifyCoreId(parsedCoreId, expectedCoreId, options = {}) {
  return resolveIdentifyCoreIdOutcome(parsedCoreId, expectedCoreId, options).coreId;
}

export async function applyCorePassCallback(request, payload) {
  const url = new URL(request.url);
  const parsed = parseCallbackPayload(request.url, payload, url.searchParams);
  const session = await getRequiredSession(request, parsed.sessionId);

  if (parsed.step === "identify") {
    const identifyMethod = normalizeIdentifyMethod(session.identify.method);
    if (identifyMethod === "login") {
      const expectedLoginSession = normalizeLoginSessionToken(session.identify.loginSession);
      const providedLoginSession = normalizeLoginSessionToken(parsed.protocolSession);
      if (expectedLoginSession && providedLoginSession && providedLoginSession !== expectedLoginSession) {
        appendHistory(session, {
          step: "identify",
          event: "callback_session_mismatch",
          expectedLoginSession,
          providedLoginSession,
        });
      }
    }

    const meta = sessionPublicMeta();
    const callbackCoreId = normalizeCoreId(parsed.coreId);
    const recoveredCoreId =
      identifyMethod === "sign"
        ? recoverIdentifyCoreIdFromSignature(session.identify.challengeHex, parsed.signature, meta.chainId)
        : "";
    const resolution = resolveIdentifyCoreIdOutcome(callbackCoreId, session.identify.expectedCoreId, {
      recoveredCoreId,
      preferRecoveredSignature: identifyMethod === "sign" && isIdentifySignatureRecoveryEnabled(),
    });
    const resolvedCoreId = resolution.coreId;

    session.identify.callbackCoreId = callbackCoreId;
    session.identify.recoveredCoreId = recoveredCoreId;
    session.identify.resolutionSource = resolution.source;

    if (callbackCoreId && recoveredCoreId && !coreIdsMatch(callbackCoreId, recoveredCoreId)) {
      appendHistory(session, {
        step: "identify",
        event: "callback_signature_mismatch",
        callbackCoreId,
        recoveredCoreId,
      });
    }

    if (!resolvedCoreId) {
      const error = new Error("CorePass identify callback did not include coreID");
      error.code = "missing_coreid";
      session.error = {
        code: error.code,
        message: error.message,
      };
      session.updatedAt = nowIso();
      appendHistory(session, {
        step: "identify",
        event: "callback_missing_coreid",
        callbackCoreId: callbackCoreId || null,
        recoveredCoreId: recoveredCoreId || null,
        payloadKeys: parsed.debug.payloadKeys,
        searchParamKeys: parsed.debug.searchParamKeys,
        fieldKeys: parsed.debug.fieldKeys,
      });
      await persistSession(request, session);
      throw error;
    }

    session.minter = resolvedCoreId;
    session.identify.coreId = resolvedCoreId;
    session.identify.completedAt = nowIso();
    session.error = null;
    appendHistory(session, {
      step: "identify",
      event: "completed",
      coreId: resolvedCoreId,
      callbackCoreId: callbackCoreId || null,
      recoveredCoreId: recoveredCoreId || null,
      expectedCoreId: session.identify.expectedCoreId || null,
      resolutionSource: resolution.source || null,
    });
    try {
      session.walletState = await runMintPrecheck(request, {
        minter: resolvedCoreId,
        quantity: session.quantity,
      });
      await buildCommitRequest(request, session);
      await persistSession(request, session);
      return serializeSession(session);
    } catch (error) {
      session.status = "precheck_rejected";
      session.walletState = error.walletState || session.walletState || null;
      session.error = {
        code: error.code || "precheck_failed",
        message: error.message || "Wallet precheck failed",
      };
      session.updatedAt = nowIso();
      appendHistory(session, {
        step: "commit",
        event: "precheck_rejected",
        code: error.code || "precheck_failed",
      });
      await persistSession(request, session);
      throw error;
    }
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
    session.commit.submittedAt = nowIso();
    session.commit.confirmedAt = "";
    session.commit.confirmedBlockNumber = 0;
    session.commit.status = "commit_submitted";
    session.status = "commit_submitted";
    session.error = null;
    extendSessionExpiry(session);
    appendHistory(session, { step: "commit", event: "submitted", txHash: parsed.txHash || null });
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
    applyFinalizeCallbackState(session, parsed.txHash);
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
    extendSessionExpiry(session);
    session.updatedAt = nowIso();
    appendHistory(session, { step: "finalize", event: "submitted_by_relayer", txHash: result.txHash });
    await persistSession(request, session);
    return serializeSession(session);
  } catch (error) {
    session.finalize.lastError = error.message;
    extendSessionExpiry(session);
    session.updatedAt = nowIso();
    appendHistory(session, { step: "finalize", event: "relayer_error", detail: error.message });
    await persistSession(request, session);
    throw error;
  }
}
