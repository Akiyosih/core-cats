"use client";

const ACCOUNT_METHODS = ["xcb_requestAccounts", "eth_requestAccounts", "xcb_accounts", "eth_accounts"];
const SEND_TX_METHODS = ["xcb_sendTransaction", "eth_sendTransaction"];
const RECEIPT_METHODS = ["xcb_getTransactionReceipt", "eth_getTransactionReceipt"];
const CHAIN_ID_METHODS = ["xcb_chainId", "eth_chainId", "net_version"];

function isObject(value) {
  return typeof value === "object" && value !== null;
}

export function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  if (isObject(window.core)) return window.core;
  if (isObject(window.ethereum)) return window.ethereum;
  if (isObject(window.web3?.currentProvider)) return window.web3.currentProvider;
  if (isObject(window.xcb)) return window.xcb;
  return null;
}

export async function requestWithFallback(provider, methods, params = []) {
  if (!provider?.request) {
    throw new Error("No injected wallet provider found");
  }

  let lastError = null;
  for (const method of methods) {
    try {
      return await provider.request({ method, params });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Provider methods not available: ${methods.join(", ")}`);
}

export async function connectWallet(provider) {
  const accounts = await requestWithFallback(provider, ACCOUNT_METHODS);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("No wallet accounts returned");
  }
  return accounts[0];
}

export async function readChainId(provider) {
  const raw = await requestWithFallback(provider, CHAIN_ID_METHODS);
  if (typeof raw === "string" && raw.startsWith("0x")) {
    return Number.parseInt(raw, 16);
  }
  return Number(raw);
}

export async function sendTransaction(provider, tx) {
  return requestWithFallback(provider, SEND_TX_METHODS, [tx]);
}

export async function getTransactionReceipt(provider, txHash) {
  return requestWithFallback(provider, RECEIPT_METHODS, [txHash]);
}

export async function waitForReceipt(provider, txHash, { timeoutMs = 180000, intervalMs = 3000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await getTransactionReceipt(provider, txHash);
    if (receipt) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for transaction receipt");
}
