import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getCoreServerEnv } from "./core-env.js";

const execFileAsync = promisify(execFile);

function buildScriptCommand(scriptSpec, { broadcast = false, energyEstimateMultiplier } = {}) {
  const parts = [
    `"${process.env.SPARK_PATH || "$SPARK_PATH"}"`,
    "script",
    scriptSpec,
    '--fork-url "$CORE_TESTNET_RPC_URL"',
    '--network-id "$CORE_NETWORK_ID"',
  ];

  if (energyEstimateMultiplier) {
    parts.push(`--energy-estimate-multiplier ${energyEstimateMultiplier}`);
  }

  if (broadcast) {
    parts.push("--broadcast");
  }

  return parts.join(" ");
}

export async function runSparkScript(scriptSpec, envOverrides = {}, options = {}) {
  const env = getCoreServerEnv();
  const mergedEnv = {
    ...process.env,
    CORE_TESTNET_RPC_URL: env.rpcUrl,
    CORE_NETWORK_ID: String(env.networkId),
    SPARK_PATH: env.sparkPath,
    DEPLOYER_PRIVATE_KEY: env.deployerPrivateKey,
    CORECATS_ADDRESS: env.coreCatsAddress,
    ...envOverrides,
  };

  const command = `set -euo pipefail; cd "${env.foxarDir}"; ${buildScriptCommand(scriptSpec, options)}`;

  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-lc", command], {
      env: mergedEnv,
      maxBuffer: 1024 * 1024 * 8,
    });
    return { stdout, stderr };
  } catch (error) {
    const stdout = error.stdout || "";
    const stderr = error.stderr || "";
    const message = [error.message, stdout, stderr].filter(Boolean).join("\n");
    const wrapped = new Error(message);
    wrapped.stdout = stdout;
    wrapped.stderr = stderr;
    throw wrapped;
  }
}

function parseRequiredValue(name, regex, text) {
  const match = text.match(regex);
  if (!match) {
    throw new Error(`Failed to parse ${name} from spark output`);
  }
  return match[1];
}

export async function issueMintAuthorization({ minter, quantity, nonce, expiry }) {
  const env = getCoreServerEnv();
  if (!env.signerPrivateKey) {
    throw new Error("Mint signer key is not configured");
  }

  const { stdout } = await runSparkScript(
    "script/CoreCatsIssueMintAuthorization.s.sol:CoreCatsIssueMintAuthorizationScript",
    {
      MINT_TO: minter,
      MINT_QUANTITY: String(quantity),
      MINT_NONCE: String(nonce),
      MINT_EXPIRY: String(expiry),
      MINT_SIGNER_PRIVATE_KEY: env.signerPrivateKey,
      MINT_CHAIN_ID: String(env.chainId),
    },
    { broadcast: false },
  );

  return {
    minter: parseRequiredValue("minter", /minter:\s+address\s+([^\s]+)/, stdout),
    quantity: Number(parseRequiredValue("quantity", /quantity:\s+uint8\s+(\d+)/, stdout)),
    nonce: parseRequiredValue("nonce", /nonce:\s+uint256\s+(\d+)/, stdout),
    expiry: Number(parseRequiredValue("expiry", /expiry:\s+uint256\s+(\d+)/, stdout)),
    chainId: Number(parseRequiredValue("chainId", /chainId:\s+uint256\s+(\d+)/, stdout)),
    messageHash: parseRequiredValue("messageHash", /messageHash:\s+bytes32\s+(0x[0-9a-fA-F]+)/, stdout),
    signature: parseRequiredValue("signature", /signature:\s+bytes\s+(0x[0-9a-fA-F]+)/, stdout),
    rawOutput: stdout,
  };
}

export async function relayFinalizeMint({ minter, energyEstimateMultiplier = 250 }) {
  const env = getCoreServerEnv();
  if (!env.finalizerPrivateKey) {
    const error = new Error("Finalizer key is not configured");
    error.code = "relayer_not_configured";
    throw error;
  }

  const { stdout } = await runSparkScript(
    "script/CoreCatsFinalizeMint.s.sol:CoreCatsFinalizeMintScript",
    {
      DEPLOYER_PRIVATE_KEY: env.finalizerPrivateKey,
      MINTER_ADDRESS: minter,
    },
    { broadcast: true, energyEstimateMultiplier },
  );

  const txHash = parseRequiredValue("tx hash", /✅ Hash:\s+(0x[0-9a-fA-F]+)/, stdout);
  return { txHash, rawOutput: stdout };
}
