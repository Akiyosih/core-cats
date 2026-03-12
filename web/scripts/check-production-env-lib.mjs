import fs from "node:fs";
import path from "node:path";

export const DEFAULT_DEVIN_CORECATS_ADDRESS = "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba";
export const DEFAULT_DEVIN_EXPLORER_BASE_URL = "https://xab.blockindex.net";

const VALID_LAUNCH_STATES = new Set(["closed", "canary", "public"]);
const VALID_SITE_SURFACES = new Set(["public-teaser", "private-canary", "public-mint"]);
const SECRET_PLACEHOLDER_RE = /replace-with/i;
const ADDRESS_PLACEHOLDER_RE = /replace-with/i;

export function looksLikePlaceholder(value) {
  return /replace-with/i.test(String(value || "").trim());
}

export function parseEnvText(text) {
  const env = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadEnvSource(filePath) {
  const resolved = path.resolve(filePath);
  return {
    sourceLabel: resolved,
    env: parseEnvText(fs.readFileSync(resolved, "utf8")),
  };
}

function normalized(value) {
  return String(value || "").trim();
}

function normalizedUrl(value) {
  return normalized(value).replace(/\/$/, "");
}

function hasValue(env, key) {
  return normalized(env[key]) !== "";
}

export function validateProductionEnv(env) {
  const errors = [];
  const warnings = [];

  const launchState = normalized(env.NEXT_PUBLIC_LAUNCH_STATE);
  const siteSurface = normalized(env.NEXT_PUBLIC_SITE_SURFACE);
  const chainId = normalized(env.NEXT_PUBLIC_CORE_CHAIN_ID);
  const networkId = normalized(env.CORE_NETWORK_ID);
  const networkName = normalized(env.CORE_NETWORK_NAME);
  const siteBaseUrl = normalizedUrl(env.NEXT_PUBLIC_SITE_BASE_URL || env.CORECATS_SITE_BASE_URL);
  const explorerBaseUrl = normalizedUrl(env.NEXT_PUBLIC_CORE_EXPLORER_BASE_URL);
  const coreCatsAddress = normalized(env.NEXT_PUBLIC_CORECATS_ADDRESS);
  const backendMode = normalized(env.CORECATS_BACKEND_MODE);
  const backendBaseUrl = normalizedUrl(env.CORECATS_BACKEND_BASE_URL);
  const backendSharedSecret = normalized(env.CORECATS_BACKEND_SHARED_SECRET);
  const publicStatusUrl = normalizedUrl(env.NEXT_PUBLIC_CORECATS_STATUS_URL);
  const relayerEnabled = normalized(env.CORECATS_RELAYER_ENABLED || "true").toLowerCase();
  const expectedCoreId = normalized(env.COREPASS_EXPECTED_CORE_ID);

  if (!VALID_LAUNCH_STATES.has(launchState)) {
    errors.push("NEXT_PUBLIC_LAUNCH_STATE must be one of: closed, canary, public");
  }
  if (siteSurface && !VALID_SITE_SURFACES.has(siteSurface)) {
    errors.push("NEXT_PUBLIC_SITE_SURFACE must be one of: public-teaser, private-canary, public-mint");
  }
  if (chainId !== "1") {
    errors.push("NEXT_PUBLIC_CORE_CHAIN_ID must be 1");
  }
  if (networkId !== "1") {
    errors.push("CORE_NETWORK_ID must be 1");
  }
  if (networkName !== "mainnet") {
    errors.push("CORE_NETWORK_NAME must be mainnet");
  }
  if (explorerBaseUrl !== "https://blockindex.net") {
    errors.push("NEXT_PUBLIC_CORE_EXPLORER_BASE_URL must be https://blockindex.net");
  }
  if (siteBaseUrl && !siteBaseUrl.startsWith("https://")) {
    errors.push("NEXT_PUBLIC_SITE_BASE_URL must start with https:// when set");
  }

  const mintSurfaceEnabled = launchState !== "closed" && (siteSurface === "private-canary" || siteSurface === "public-mint");

  if (mintSurfaceEnabled) {
    if (backendMode !== "proxy") {
      errors.push("CORECATS_BACKEND_MODE must be proxy when the mint surface is enabled");
    }

    if (!backendBaseUrl) {
      errors.push("CORECATS_BACKEND_BASE_URL is required when the mint surface is enabled");
    } else if (looksLikePlaceholder(backendBaseUrl)) {
      errors.push("CORECATS_BACKEND_BASE_URL must not use a placeholder value");
    } else if (!backendBaseUrl.startsWith("https://")) {
      errors.push("CORECATS_BACKEND_BASE_URL must start with https://");
    }

    if (!backendSharedSecret) {
      errors.push("CORECATS_BACKEND_SHARED_SECRET is required when the mint surface is enabled");
    } else if (SECRET_PLACEHOLDER_RE.test(backendSharedSecret) || backendSharedSecret === "dev-only-secret") {
      errors.push("CORECATS_BACKEND_SHARED_SECRET must not use a placeholder or dev-only value");
    }
  } else {
    if (backendMode && backendMode !== "proxy") {
      warnings.push("CORECATS_BACKEND_MODE is set on a browse-only surface; mint routes stay closed there");
    }
    if (backendBaseUrl && !backendBaseUrl.startsWith("https://")) {
      errors.push("CORECATS_BACKEND_BASE_URL must start with https:// when set");
    }
    if (publicStatusUrl && !publicStatusUrl.startsWith("https://")) {
      errors.push("NEXT_PUBLIC_CORECATS_STATUS_URL must start with https:// when set");
    }
    if (!publicStatusUrl && !backendBaseUrl) {
      warnings.push("Browse-only surfaces should set NEXT_PUBLIC_CORECATS_STATUS_URL or CORECATS_BACKEND_BASE_URL if live ownership badges are expected");
    }
  }

  if (!coreCatsAddress) {
    errors.push("NEXT_PUBLIC_CORECATS_ADDRESS must be explicitly set so the site does not fall back to Devin");
  } else if (coreCatsAddress === DEFAULT_DEVIN_CORECATS_ADDRESS) {
    errors.push("NEXT_PUBLIC_CORECATS_ADDRESS must not use the Devin rehearsal address");
  } else if (launchState !== "closed" && ADDRESS_PLACEHOLDER_RE.test(coreCatsAddress)) {
    errors.push("NEXT_PUBLIC_CORECATS_ADDRESS must be the real mainnet contract address in canary/public");
  }

  if (mintSurfaceEnabled && relayerEnabled !== "true") {
    warnings.push(
      "CORECATS_RELAYER_ENABLED is not true; automatic finalize will be unavailable and the public wait/retry guidance will no longer match the intended relayer-first path",
    );
  }
  if (expectedCoreId) {
    if (launchState === "closed") {
      warnings.push("COREPASS_EXPECTED_CORE_ID is set; remove it before the generic-wallet canary/public redeploy");
    } else {
      errors.push("COREPASS_EXPECTED_CORE_ID must be removed before canary/public launch");
    }
  }

  if (launchState === "public" && siteSurface && siteSurface !== "public-mint") {
    errors.push("NEXT_PUBLIC_SITE_SURFACE must be public-mint when NEXT_PUBLIC_LAUNCH_STATE=public");
  }
  if (launchState === "closed" && siteSurface === "private-canary") {
    warnings.push("NEXT_PUBLIC_SITE_SURFACE=private-canary is unusual while NEXT_PUBLIC_LAUNCH_STATE=closed");
  }
  if (launchState === "canary" && !siteSurface) {
    warnings.push("NEXT_PUBLIC_SITE_SURFACE is unset; canary deployments should choose public-teaser or private-canary explicitly");
  }

  for (const key of ["DEPLOYER_PRIVATE_KEY", "MINT_SIGNER_PRIVATE_KEY", "FINALIZER_PRIVATE_KEY"]) {
    if (hasValue(env, key)) {
      errors.push(`${key} must not be present in the Vercel production env`);
    }
  }

  for (const key of ["CORE_RPC_URL", "CORE_TESTNET_RPC_URL"]) {
    if (hasValue(env, key)) {
      warnings.push(`${key} is set, but the production Vercel proxy path does not need an RPC URL`);
    }
  }

  return {
    errors,
    warnings,
    normalized: {
      launchState,
      siteSurface,
      chainId,
      networkId,
      networkName,
      explorerBaseUrl,
      coreCatsAddress,
      siteBaseUrl,
      backendMode,
      backendBaseUrl,
      publicStatusUrl,
      relayerEnabled,
      expectedCoreId,
    },
  };
}
