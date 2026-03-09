import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const FOXAR_ENV_PATH = path.join(ROOT_DIR, "foxar", ".env");

export const DEFAULT_DEVIN_RPC_URL = "https://xcbapi-arch-devin.coreblockchain.net/";
export const DEFAULT_DEVIN_CORECATS_ADDRESS = "ab597892bace5d97cf2fffa9a6eb0d5664b54a4b39ba";
export const DEFAULT_DEVIN_EXPLORER_BASE_URL = "https://xab.blockindex.net";

const DEFAULTS = {
  rpcUrl: DEFAULT_DEVIN_RPC_URL,
  chainId: 3,
  networkId: 3,
  networkName: "devin",
  launchState: "closed",
  coreCatsAddress: DEFAULT_DEVIN_CORECATS_ADDRESS,
  explorerBaseUrl: DEFAULT_DEVIN_EXPLORER_BASE_URL,
  backendMode: "local",
  backendBaseUrl: "",
  backendSharedSecret: "",
};

function normalizeLaunchState(value) {
  if (value === "canary" || value === "public" || value === "closed") {
    return value;
  }
  return DEFAULTS.launchState;
}

function normalizeBackendMode(value) {
  if (value === "proxy" || value === "local") {
    return value;
  }
  return DEFAULTS.backendMode;
}

export function looksLikePlaceholder(value) {
  return /replace-with/i.test(String(value || "").trim());
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
  const signerPrivateKey = process.env.MINT_SIGNER_PRIVATE_KEY || fileEnv.MINT_SIGNER_PRIVATE_KEY || deployerPrivateKey;
  const finalizerPrivateKey =
    process.env.FINALIZER_PRIVATE_KEY || fileEnv.FINALIZER_PRIVATE_KEY || deployerPrivateKey;

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
    chainId: Number(process.env.NEXT_PUBLIC_CORE_CHAIN_ID || process.env.CORE_CHAIN_ID || DEFAULTS.chainId),
    networkId: Number(process.env.CORE_NETWORK_ID || DEFAULTS.networkId),
    networkName: process.env.CORE_NETWORK_NAME || DEFAULTS.networkName,
    launchState: normalizeLaunchState(
      process.env.NEXT_PUBLIC_LAUNCH_STATE || process.env.CORECATS_LAUNCH_STATE || DEFAULTS.launchState,
    ),
    backendMode: normalizeBackendMode(process.env.CORECATS_BACKEND_MODE || DEFAULTS.backendMode),
    backendBaseUrl: (process.env.CORECATS_BACKEND_BASE_URL || DEFAULTS.backendBaseUrl).trim().replace(/\/$/, ""),
    backendSharedSecret: (process.env.CORECATS_BACKEND_SHARED_SECRET || DEFAULTS.backendSharedSecret).trim(),
    corePassExpectedCoreId: (process.env.COREPASS_EXPECTED_CORE_ID || "").trim(),
    coreCatsAddress:
      process.env.NEXT_PUBLIC_CORECATS_ADDRESS ||
      process.env.CORECATS_ADDRESS ||
      fileEnv.CORECATS_ADDRESS ||
      DEFAULTS.coreCatsAddress,
    deployerPrivateKey,
    signerPrivateKey,
    finalizerPrivateKey,
    explorerBaseUrl:
      process.env.NEXT_PUBLIC_CORE_EXPLORER_BASE_URL ||
      process.env.CORE_EXPLORER_BASE_URL ||
      DEFAULTS.explorerBaseUrl,
  };
}

export function getCorePublicConfig() {
  const env = getCoreServerEnv();
  const relayerEnabled =
    env.backendMode === "proxy" ? process.env.CORECATS_RELAYER_ENABLED !== "false" : Boolean(env.finalizerPrivateKey);
  return {
    chainId: env.chainId,
    networkName: env.networkName,
    launchState: env.launchState,
    coreCatsAddress: env.coreCatsAddress,
    explorerBaseUrl: env.explorerBaseUrl,
    relayerEnabled,
  };
}
