import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const FOXAR_ENV_PATH = path.join(ROOT_DIR, "foxar", ".env");

export const DEFAULT_DEVIN_RPC_URL = "https://xcbapi-arch-devin.coreblockchain.net/";
export const DEFAULT_DEVIN_CORECATS_ADDRESS = "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba";
export const DEFAULT_DEVIN_EXPLORER_BASE_URL = "https://xab.blockindex.net";
const OFFICIAL_MAINNET_CORECATS_ADDRESS = "cb40316dcf944c9c2d4d1381653753a514e5e01d5df3";
const OFFICIAL_MAINNET_RENDERER_ADDRESS = "cb762d998b8e79a74e1bc667b1ba2fd4154f25a467ac";
const OFFICIAL_MAINNET_DATA_ADDRESS = "cb748bebbcac49b28fdeccb8a56f1cf677e9d94ef25c";
const HEX_40_RE = /^[0-9a-f]{40}$/;
const ICAN_RE = /^[a-z]{2}[0-9a-f]{42}$/;

const DEFAULTS = {
  rpcUrl: DEFAULT_DEVIN_RPC_URL,
  chainId: 3,
  networkId: 3,
  networkName: "devin",
  launchState: "closed",
  siteSurface: "public-teaser",
  siteBaseUrl: "",
  browseBaseUrl: "",
  mintOnlyHost: false,
  coreCatsAddress: DEFAULT_DEVIN_CORECATS_ADDRESS,
  coreCatsRendererAddress: "",
  coreCatsDataAddress: "",
  explorerBaseUrl: DEFAULT_DEVIN_EXPLORER_BASE_URL,
  backendMode: "local",
  backendBaseUrl: "",
  internalBackendBaseUrl: "",
  backendSharedSecret: "",
  statusSnapshotUrl: "",
  privateCanaryBadgeText: "PRIVATE CANARY",
  privateCanaryTitleText: "Private rehearsal canary",
  privateCanaryWarningText: "NOT PUBLIC MINT",
};
const DEFAULT_MAINNET_MINT_BASE_URL = "https://core-cats-mint.vercel.app";

function normalizeLaunchState(value) {
  if (value === "canary" || value === "public" || value === "closed") {
    return value;
  }
  return DEFAULTS.launchState;
}

function normalizeSiteSurface(value, launchState) {
  if (value === "public-teaser" || value === "private-canary" || value === "public-mint") {
    return value;
  }
  if (launchState === "public") {
    return "public-mint";
  }
  if (launchState === "closed") {
    return "public-teaser";
  }
  return "private-canary";
}

function normalizeBackendMode(value) {
  if (value === "proxy" || value === "local") {
    return value;
  }
  return DEFAULTS.backendMode;
}

function normalizeIdentifyMethod(value) {
  return String(value || "").trim().toLowerCase() === "login" ? "login" : "sign";
}

function normalizeBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function isOfficialMintHost(siteBaseUrl) {
  return normalizeUrl(siteBaseUrl) === DEFAULT_MAINNET_MINT_BASE_URL;
}

function isLoopbackHttpUrl(value) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(String(value || "").trim());
}

function parseAbsoluteHttpUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSiteBaseUrlConfigError(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return "NEXT_PUBLIC_SITE_BASE_URL or CORECATS_SITE_BASE_URL must be explicitly set when the mint surface is enabled.";
  }
  if (looksLikePlaceholder(normalized)) {
    return "The mint surface site base URL must not use a placeholder value.";
  }

  const parsed = parseAbsoluteHttpUrl(normalized);
  if (!parsed) {
    return "NEXT_PUBLIC_SITE_BASE_URL or CORECATS_SITE_BASE_URL must be an absolute http(s) URL when the mint surface is enabled.";
  }

  if (!isLoopbackHttpUrl(parsed.origin) && parsed.protocol !== "https:") {
    return "NEXT_PUBLIC_SITE_BASE_URL or CORECATS_SITE_BASE_URL must start with https:// when the mint surface is enabled.";
  }

  return "";
}

export function looksLikePlaceholder(value) {
  return /replace-with/i.test(String(value || "").trim());
}

export function normalizeCoreAddressKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    throw new Error("Core address must not be empty");
  }
  if (raw.startsWith("0x") && raw.length === 42 && HEX_40_RE.test(raw.slice(2))) {
    return raw;
  }
  if (raw.length === 40 && HEX_40_RE.test(raw)) {
    return `0x${raw}`;
  }
  if (raw.length === 44 && ICAN_RE.test(raw)) {
    return `0x${raw.slice(4)}`;
  }
  throw new Error(`Unsupported Core address format: ${value}`);
}

function parseCanaryAllowedCoreIds(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((item) => normalizeCoreAddressKey(item)),
    ),
  );
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const text = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

export function getCoreServerEnv() {
  const fileEnv = parseEnvFile(FOXAR_ENV_PATH);

  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || fileEnv.DEPLOYER_PRIVATE_KEY || "";
  const signerPrivateKey = process.env.MINT_SIGNER_PRIVATE_KEY || fileEnv.MINT_SIGNER_PRIVATE_KEY || "";
  const finalizerPrivateKey =
    process.env.FINALIZER_PRIVATE_KEY || fileEnv.FINALIZER_PRIVATE_KEY || deployerPrivateKey;

  let launchState = normalizeLaunchState(
    process.env.NEXT_PUBLIC_LAUNCH_STATE || process.env.CORECATS_LAUNCH_STATE || DEFAULTS.launchState,
  );
  let siteSurface = normalizeSiteSurface(
    process.env.NEXT_PUBLIC_SITE_SURFACE || process.env.CORECATS_SITE_SURFACE || DEFAULTS.siteSurface,
    launchState,
  );
  let siteBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_BASE_URL || process.env.CORECATS_SITE_BASE_URL || "");
  let browseBaseUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL || process.env.CORECATS_BROWSE_BASE_URL || DEFAULTS.browseBaseUrl,
  );
  let mintOnlyHost = normalizeBoolean(
    process.env.NEXT_PUBLIC_CORECATS_MINT_ONLY_HOST || process.env.CORECATS_MINT_ONLY_HOST || DEFAULTS.mintOnlyHost,
  );
  let networkId = Number(process.env.CORE_NETWORK_ID || DEFAULTS.networkId);
  let networkName = process.env.CORE_NETWORK_NAME || DEFAULTS.networkName;
  let chainId = Number(process.env.NEXT_PUBLIC_CORE_CHAIN_ID || process.env.CORE_CHAIN_ID || DEFAULTS.chainId);
  let statusSnapshotUrl = (
    process.env.NEXT_PUBLIC_CORECATS_STATUS_URL ||
    (
      (process.env.CORECATS_BACKEND_BASE_URL || DEFAULTS.backendBaseUrl).trim().replace(/\/$/, "")
        ? `${(process.env.CORECATS_BACKEND_BASE_URL || DEFAULTS.backendBaseUrl).trim().replace(/\/$/, "")}/api/public/status`
        : ""
    )
  ).trim();
  let coreCatsAddress =
    process.env.NEXT_PUBLIC_CORECATS_ADDRESS ||
    process.env.CORECATS_ADDRESS ||
    fileEnv.CORECATS_ADDRESS ||
    DEFAULTS.coreCatsAddress;
  let coreCatsRendererAddress =
    process.env.NEXT_PUBLIC_CORECATS_RENDERER_ADDRESS ||
    process.env.CORECATS_RENDERER_ADDRESS ||
    fileEnv.CORECATS_RENDERER_ADDRESS ||
    DEFAULTS.coreCatsRendererAddress;
  let coreCatsDataAddress =
    process.env.NEXT_PUBLIC_CORECATS_DATA_ADDRESS ||
    process.env.CORECATS_DATA_ADDRESS ||
    fileEnv.CORECATS_DATA_ADDRESS ||
    DEFAULTS.coreCatsDataAddress;
  let corePassIdentifyMethod = normalizeIdentifyMethod(process.env.COREPASS_IDENTIFY_METHOD || "");

  if (isOfficialMintHost(siteBaseUrl)) {
    if (launchState === "canary") {
      launchState = "public";
    }
    siteSurface = "public-mint";
    chainId = 1;
    networkId = 1;
    networkName = "mainnet";
    browseBaseUrl = "https://core-cats.pages.dev";
    mintOnlyHost = true;
    corePassIdentifyMethod = "login";
    coreCatsAddress = OFFICIAL_MAINNET_CORECATS_ADDRESS;
    coreCatsRendererAddress = OFFICIAL_MAINNET_RENDERER_ADDRESS;
    coreCatsDataAddress = OFFICIAL_MAINNET_DATA_ADDRESS;
    if (!statusSnapshotUrl || /sslip\.io\/api\/public\/status$/i.test(statusSnapshotUrl)) {
      statusSnapshotUrl = "https://core-cats.pages.dev/api/public/status";
    }
  }

  return {
    rootDir: ROOT_DIR,
    foxarDir: path.join(ROOT_DIR, "foxar"),
    sparkPath: process.env.SPARK_PATH || path.join(process.env.HOME || "", ".foxar", "bin", "spark"),
    rpcUrl:
      process.env.CORE_RPC_URL ||
      process.env.CORE_TESTNET_RPC_URL ||
      fileEnv.CORE_RPC_URL ||
      fileEnv.CORE_TESTNET_RPC_URL ||
      DEFAULTS.rpcUrl,
    chainId,
    networkId,
    networkName,
    launchState,
    siteSurface,
    siteBaseUrl,
    browseBaseUrl,
    mintOnlyHost,
    backendMode: normalizeBackendMode(process.env.CORECATS_BACKEND_MODE || DEFAULTS.backendMode),
    backendBaseUrl: (process.env.CORECATS_BACKEND_BASE_URL || DEFAULTS.backendBaseUrl).trim().replace(/\/$/, ""),
    internalBackendBaseUrl: (
      process.env.CORECATS_INTERNAL_BACKEND_BASE_URL || DEFAULTS.internalBackendBaseUrl
    ).trim().replace(/\/$/, ""),
    backendSharedSecret: (process.env.CORECATS_BACKEND_SHARED_SECRET || DEFAULTS.backendSharedSecret).trim(),
    statusSnapshotUrl,
    privateCanaryBadgeText: (
      process.env.NEXT_PUBLIC_PRIVATE_CANARY_BADGE_TEXT || DEFAULTS.privateCanaryBadgeText
    ).trim(),
    privateCanaryTitleText: (
      process.env.NEXT_PUBLIC_PRIVATE_CANARY_TITLE_TEXT || DEFAULTS.privateCanaryTitleText
    ).trim(),
    privateCanaryWarningText: (
      process.env.NEXT_PUBLIC_PRIVATE_CANARY_WARNING_TEXT || DEFAULTS.privateCanaryWarningText
    ).trim(),
    canaryAllowedCoreIds: parseCanaryAllowedCoreIds(process.env.CORECATS_CANARY_ALLOWED_CORE_IDS || ""),
    corePassExpectedCoreId: (process.env.COREPASS_EXPECTED_CORE_ID || "").trim(),
    corePassIdentifyMethod,
    coreCatsAddress,
    coreCatsRendererAddress,
    coreCatsDataAddress,
    deployerPrivateKey,
    signerPrivateKey,
    finalizerPrivateKey,
    explorerBaseUrl:
      process.env.NEXT_PUBLIC_CORE_EXPLORER_BASE_URL ||
      process.env.CORE_EXPLORER_BASE_URL ||
      DEFAULTS.explorerBaseUrl,
  };
}

export function getMintRuntimeConfigErrors(state = getCoreServerEnv()) {
  const mintSurfaceEnabled = isMintSurfaceEnabled({
    launchState: state.launchState,
    siteSurface: state.siteSurface,
  });

  if (!mintSurfaceEnabled) {
    return [];
  }

  const errors = [];
  const siteBaseUrl = normalizeUrl(state.siteBaseUrl || "");
  const coreCatsAddress = String(state.coreCatsAddress || "").trim();
  const backendBaseUrl = normalizeUrl(state.backendBaseUrl || "");
  const internalBackendBaseUrl = normalizeUrl(state.internalBackendBaseUrl || "");
  const backendSharedSecret = String(state.backendSharedSecret || "").trim();
  const siteBaseUrlError = getSiteBaseUrlConfigError(siteBaseUrl);
  const externalOrigin = !siteBaseUrlError && siteBaseUrl && !isLoopbackHttpUrl(siteBaseUrl);
  const browseBaseUrl = normalizeUrl(state.browseBaseUrl || "");

  if (siteBaseUrlError) {
    errors.push(siteBaseUrlError);
  }

  if (state.mintOnlyHost) {
    const browseBaseUrlError = getSiteBaseUrlConfigError(browseBaseUrl).replace(
      /NEXT_PUBLIC_SITE_BASE_URL or CORECATS_SITE_BASE_URL/g,
      "NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL or CORECATS_BROWSE_BASE_URL",
    );
    if (browseBaseUrlError) {
      errors.push(browseBaseUrlError);
    } else if (siteBaseUrl && browseBaseUrl && normalizeUrl(siteBaseUrl) === normalizeUrl(browseBaseUrl)) {
      errors.push("The mint-only host must not use the same origin for NEXT_PUBLIC_SITE_BASE_URL and NEXT_PUBLIC_CORECATS_BROWSE_BASE_URL.");
    }
  }

  if (!coreCatsAddress) {
    errors.push("NEXT_PUBLIC_CORECATS_ADDRESS or CORECATS_ADDRESS must be explicitly set when the mint surface is enabled.");
  } else if (looksLikePlaceholder(coreCatsAddress)) {
    errors.push("The mint surface must not use a placeholder CoreCats contract address.");
  } else {
    try {
      if (normalizeCoreAddressKey(coreCatsAddress) === normalizeCoreAddressKey(DEFAULT_DEVIN_CORECATS_ADDRESS)) {
        errors.push("The mint surface must not fall back to the Devin rehearsal CoreCats address.");
      }
    } catch {
      errors.push("The mint surface CoreCats contract address is not a supported Core address format.");
    }
  }

  if (externalOrigin && state.backendMode !== "proxy") {
    errors.push("The mint surface must use CORECATS_BACKEND_MODE=proxy on non-local deployments.");
  }

  if (state.backendMode === "proxy") {
    if (!backendBaseUrl && !internalBackendBaseUrl) {
      errors.push(
        "CORECATS_BACKEND_BASE_URL or CORECATS_INTERNAL_BACKEND_BASE_URL must be explicitly set when the mint surface uses proxy mode.",
      );
    } else {
      if (backendBaseUrl) {
        if (looksLikePlaceholder(backendBaseUrl)) {
          errors.push("The mint surface backend origin must not use a placeholder value.");
        } else if (!backendBaseUrl.startsWith("https://")) {
          errors.push("CORECATS_BACKEND_BASE_URL must start with https:// when proxy mode is enabled.");
        }
      }
      if (internalBackendBaseUrl && !isLoopbackHttpUrl(internalBackendBaseUrl)) {
        errors.push(
          "CORECATS_INTERNAL_BACKEND_BASE_URL must use a loopback http(s) origin such as http://127.0.0.1:8787.",
        );
      }
    }

    if (!backendSharedSecret) {
      errors.push("CORECATS_BACKEND_SHARED_SECRET must be explicitly set when the mint surface uses proxy mode.");
    } else if (looksLikePlaceholder(backendSharedSecret) || backendSharedSecret === "dev-only-secret") {
      errors.push("The mint surface backend shared secret must not use a placeholder or dev-only value.");
    }
  }

  return errors;
}

export function isMintSurfaceEnabled(config) {
  const state = config || getCorePublicConfig();
  return state.launchState !== "closed" && (state.siteSurface === "private-canary" || state.siteSurface === "public-mint");
}

export function getCorePublicConfig() {
  const env = getCoreServerEnv();
  const relayerEnabled =
    env.backendMode === "proxy" ? process.env.CORECATS_RELAYER_ENABLED !== "false" : Boolean(env.finalizerPrivateKey);
  const siteSurface = env.siteSurface;
  const mintSurfaceEnabled = isMintSurfaceEnabled({ launchState: env.launchState, siteSurface });
  const mintRuntimeErrors = getMintRuntimeConfigErrors(env);
  const explicitMintBaseUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_CORECATS_MINT_BASE_URL || process.env.CORECATS_MINT_BASE_URL || "",
  );
  return {
    chainId: env.chainId,
    networkName: env.networkName,
    launchState: env.launchState,
    siteSurface,
    publicTeaserSite: siteSurface === "public-teaser",
    privateCanarySite: siteSurface === "private-canary",
    publicMintSite: siteSurface === "public-mint",
    mintSurfaceEnabled,
    mintRuntimeReady: mintRuntimeErrors.length === 0,
    mintRuntimeErrors,
    siteBaseUrl: env.siteBaseUrl,
    mintBaseUrl:
      explicitMintBaseUrl ||
      (siteSurface === "public-mint" ? env.siteBaseUrl : env.networkName === "mainnet" ? DEFAULT_MAINNET_MINT_BASE_URL : ""),
    browseBaseUrl: env.browseBaseUrl,
    mintOnlyHost: env.mintOnlyHost,
    coreCatsAddress: env.coreCatsAddress,
    coreCatsRendererAddress: env.coreCatsRendererAddress,
    coreCatsDataAddress: env.coreCatsDataAddress,
    explorerBaseUrl: env.explorerBaseUrl,
    relayerEnabled,
    statusSnapshotUrl: env.statusSnapshotUrl,
    privateCanaryBadgeText: env.privateCanaryBadgeText,
    privateCanaryTitleText: env.privateCanaryTitleText,
    privateCanaryWarningText: env.privateCanaryWarningText,
  };
}
