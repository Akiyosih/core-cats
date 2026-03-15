import { getCoreServerEnv, normalizeCoreAddressKey } from "./core-env.js";
import { fetchMintPrecheck, isExternalMintBackendEnabled } from "./mint-backend-proxy.js";

const CALL_METHODS = ["xcb_call", "eth_call"];
const BLOCK_NUMBER_METHODS = ["xcb_blockNumber", "eth_blockNumber"];
const AVAILABLE_SUPPLY_SELECTOR = "0x1c34eb83";
const MINTED_PER_ADDRESS_SELECTOR = "0x5539b96a";
const RESERVED_PER_ADDRESS_SELECTOR = "0xe64f7f28";
const PENDING_COMMIT_SELECTOR = "0xf622d4c8";
const MAX_PER_ADDRESS = 3;
const HEX_40_RE = /^[0-9a-f]{40}$/;
const ICAN_RE = /^[a-z]{2}[0-9a-f]{42}$/;

let nextRequestId = 1;

function coreAddressToHex(value) {
  return normalizeCoreAddressKey(value);
}

function coreAddressToXcbRpc(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.startsWith("0x") && raw.length === 46 && ICAN_RE.test(raw.slice(2))) return raw;
  if (raw.length === 44 && ICAN_RE.test(raw)) return `0x${raw}`;
  return coreAddressToHex(value);
}

function coreAddressToAbiWord(value) {
  return coreAddressToHex(value).slice(2);
}

function parseHexInt(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const raw = String(value).trim();
  if (!raw) return 0;
  return raw.startsWith("0x") ? Number.parseInt(raw, 16) : Number.parseInt(raw, 10);
}

function pad32(value) {
  return value.padStart(64, "0");
}

function encodeAddressCall(selector, address) {
  return `${selector}${pad32(coreAddressToAbiWord(address))}`;
}

function splitWords(data) {
  const raw = String(data || "").replace(/^0x/, "");
  if (!raw) return [];
  const padded = raw.padEnd(Math.ceil(raw.length / 64) * 64, "0");
  return padded.match(/.{1,64}/g) || [];
}

function decodeUintWord(data, index) {
  const words = splitWords(data);
  if (index >= words.length) return 0;
  return Number.parseInt(words[index], 16);
}

function buildWalletState(currentBlock, minted, reserved, pendingCommit, availableSupply) {
  const pendingCommitActive = pendingCommit.quantity > 0 && currentBlock <= pendingCommit.expiryBlock;
  const effectiveReserved =
    pendingCommit.quantity > 0 && currentBlock > pendingCommit.expiryBlock
      ? Math.max(0, reserved - pendingCommit.quantity)
      : reserved;

  return {
    minted,
    reserved: effectiveReserved,
    availableSupply,
    availableSlots: Math.max(0, MAX_PER_ADDRESS - minted - effectiveReserved),
    pendingCommitActive,
    finalizeBlock: pendingCommit.finalizeBlock,
    expiryBlock: pendingCommit.expiryBlock,
    currentBlock,
    maxPerAddress: MAX_PER_ADDRESS,
  };
}

function createPrecheckError(code, message, walletState = null) {
  const error = new Error(message);
  error.code = code;
  if (walletState) {
    error.walletState = walletState;
  }
  return error;
}

function normalizeWalletState(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    minted: Number(payload.minted || 0),
    reserved: Number(payload.reserved || 0),
    availableSupply: Number(payload.availableSupply || 0),
    availableSlots: Number(payload.availableSlots || 0),
    pendingCommitActive: Boolean(payload.pendingCommitActive),
    finalizeBlock: Number(payload.finalizeBlock || 0),
    expiryBlock: Number(payload.expiryBlock || 0),
    currentBlock: Number(payload.currentBlock || 0),
    maxPerAddress: Number(payload.maxPerAddress || MAX_PER_ADDRESS),
  };
}

export function evaluateMintPrecheck(walletState, quantity) {
  const normalized = normalizeWalletState(walletState);
  if (!normalized) {
    throw createPrecheckError("wallet_state_unavailable", "Wallet precheck did not return a usable wallet state.");
  }

  if (normalized.pendingCommitActive) {
    throw createPrecheckError(
      "pending_commit_exists",
      "This wallet already has a pending commit waiting for finalize.",
      normalized,
    );
  }

  if (normalized.availableSupply < quantity) {
    throw createPrecheckError(
      "sold_out",
      "The remaining unreserved supply is lower than this requested quantity, so QR 2 of 2 was not prepared.",
      normalized,
    );
  }

  if (normalized.minted + normalized.reserved + quantity > normalized.maxPerAddress) {
    throw createPrecheckError(
      "wallet_limit_reached",
      "A single wallet can mint up to 3 cats through the standard mint path. This request would exceed that cumulative limit.",
      normalized,
    );
  }

  return normalized;
}

async function requestJsonRpc(rpcUrl, methods, params) {
  let lastError = null;

  for (const method of methods) {
    const payload = {
      jsonrpc: "2.0",
      id: nextRequestId++,
      method,
      params,
    };

    let response;
    try {
      response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (error) {
      lastError = new Error(`${method} failed: ${error.message || error}`);
      continue;
    }

    let body;
    try {
      body = await response.json();
    } catch (error) {
      lastError = new Error(`${method} failed: ${error.message || error}`);
      continue;
    }

    if (body?.error) {
      const detail =
        typeof body.error === "object" ? body.error.message || body.error.code || JSON.stringify(body.error) : body.error;
      lastError = new Error(`${method} failed: ${detail}`);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, "result")) {
      return body.result;
    }

    lastError = new Error(`${method} returned an invalid JSON-RPC response`);
  }

  throw lastError || new Error("RPC request failed");
}

async function ethCall(rpcUrl, contractAddress, data) {
  let lastError = null;

  for (const method of CALL_METHODS) {
    const to = method === "xcb_call" ? coreAddressToXcbRpc(contractAddress) : coreAddressToHex(contractAddress);
    try {
      const result = await requestJsonRpc(rpcUrl, [method], [
        {
          to,
          data,
        },
        "latest",
      ]);
      if (typeof result === "string" && result.startsWith("0x")) {
        return result;
      }
      lastError = new Error(`${method} did not return a hex payload`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("contract call failed");
}

async function readWalletStateViaRpc({ rpcUrl, contractAddress, minter }) {
  const currentBlock = parseHexInt(await requestJsonRpc(rpcUrl, BLOCK_NUMBER_METHODS, []));
  const availableSupply = decodeUintWord(await ethCall(rpcUrl, contractAddress, AVAILABLE_SUPPLY_SELECTOR), 0);
  const minted = decodeUintWord(await ethCall(rpcUrl, contractAddress, encodeAddressCall(MINTED_PER_ADDRESS_SELECTOR, minter)), 0);
  const reserved = decodeUintWord(
    await ethCall(rpcUrl, contractAddress, encodeAddressCall(RESERVED_PER_ADDRESS_SELECTOR, minter)),
    0,
  );
  const pendingRaw = await ethCall(rpcUrl, contractAddress, encodeAddressCall(PENDING_COMMIT_SELECTOR, minter));
  const pendingWords = splitWords(pendingRaw);
  const pendingCommit = {
    quantity: decodeUintWord(pendingRaw, 0),
    finalizeBlock: decodeUintWord(pendingRaw, 1),
    expiryBlock: decodeUintWord(pendingRaw, 2),
    commitHash: pendingWords[3] ? `0x${pendingWords[3]}` : "0x0",
  };

  return buildWalletState(currentBlock, minted, reserved, pendingCommit, availableSupply);
}

export async function runMintPrecheck(request, { minter, quantity }) {
  if (isExternalMintBackendEnabled()) {
    try {
      const payload = await fetchMintPrecheck(request, { minter, quantity });
      return evaluateMintPrecheck(payload?.walletState || payload, quantity);
    } catch (error) {
      const walletState = normalizeWalletState(error?.payload?.walletState);
      if (walletState) {
        error.walletState = walletState;
      }
      throw error;
    }
  }

  const env = getCoreServerEnv();
  if (!env.rpcUrl) {
    throw createPrecheckError(
      "wallet_state_unavailable",
      "Wallet precheck is unavailable because no Core RPC URL is configured for this local mint surface.",
    );
  }

  const walletState = await readWalletStateViaRpc({
    rpcUrl: env.rpcUrl,
    contractAddress: env.coreCatsAddress,
    minter,
  });
  return evaluateMintPrecheck(walletState, quantity);
}
