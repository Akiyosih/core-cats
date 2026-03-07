import { getCorePublicConfig } from "./core-env.js";

const ZERO_ADDRESS = "00000000000000000000000000000000000000000000";
const CACHE_TTL_MS = Number(process.env.CORECATS_STATUS_CACHE_TTL_MS || 30_000);

let snapshotCache = null;

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

export function isCoreAddress(value) {
  return /^(ab|cb)[0-9a-f]{42}$/i.test(String(value || "").trim());
}

function explorerBaseUrl() {
  return getCorePublicConfig().explorerBaseUrl.replace(/\/$/, "");
}

function apiBaseUrl() {
  return `${explorerBaseUrl()}/api/v2`;
}

export function buildExplorerAddressUrl(address) {
  if (!address) return null;
  return `${explorerBaseUrl()}/address/${address}`;
}

export function buildExplorerTxUrl(txHash) {
  if (!txHash) return null;
  return `${explorerBaseUrl()}/tx/${txHash}`;
}

function buildEmptySnapshot(errorMessage = "") {
  return {
    fetchedAt: new Date().toISOString(),
    errorMessage,
    mintedCount: 0,
    byToken: {},
    byOwner: {},
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`status fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchContractTxIds(contractAddress) {
  const txids = [];
  let page = 1;
  let totalPages = 1;

  do {
    const payload = await fetchJson(`${apiBaseUrl()}/address/${contractAddress}?page=${page}`);
    totalPages = Number(payload.totalPages || 1);
    txids.push(...(payload.txids || []));
    page += 1;
  } while (page <= totalPages);

  return Array.from(new Set(txids));
}

async function buildStatusSnapshot() {
  const { coreCatsAddress } = getCorePublicConfig();
  const normalizedContract = normalizeAddress(coreCatsAddress);
  const txids = await fetchContractTxIds(coreCatsAddress);
  const transactions = await Promise.all(txids.map((txid) => fetchJson(`${apiBaseUrl()}/tx/${txid}`)));

  transactions.sort((a, b) => {
    const blockDiff = Number(a.blockHeight || 0) - Number(b.blockHeight || 0);
    if (blockDiff !== 0) return blockDiff;
    return Number(a.blockTime || 0) - Number(b.blockTime || 0);
  });

  const tokenStates = new Map();

  for (const tx of transactions) {
    for (const transfer of tx.tokenTransfers || []) {
      if (transfer.type !== "CBC721") continue;
      if (normalizeAddress(transfer.contract) !== normalizedContract) continue;

      const tokenId = Number(transfer.value);
      if (!Number.isInteger(tokenId) || tokenId <= 0) continue;

      const current = tokenStates.get(tokenId) || {
        tokenId,
        minted: false,
        owner: null,
        mintTxHash: null,
        latestTxHash: null,
        mintedAt: null,
        updatedAt: null,
      };

      const from = normalizeAddress(transfer.from);
      const to = normalizeAddress(transfer.to);

      if (from === ZERO_ADDRESS && !current.mintTxHash) {
        current.minted = true;
        current.mintTxHash = tx.txid;
        current.mintedAt = tx.blockTime || null;
      }

      current.minted = true;
      current.owner = to || null;
      current.latestTxHash = tx.txid;
      current.updatedAt = tx.blockTime || null;

      tokenStates.set(tokenId, current);
    }
  }

  const byToken = {};
  const ownerBuckets = new Map();

  for (const [tokenId, state] of tokenStates.entries()) {
    const entry = {
      minted: true,
      owner: state.owner,
      mintTxHash: state.mintTxHash,
      latestTxHash: state.latestTxHash,
      mintedAt: state.mintedAt,
      updatedAt: state.updatedAt,
      explorer: {
        mintTx: buildExplorerTxUrl(state.mintTxHash),
        latestTx: buildExplorerTxUrl(state.latestTxHash),
        owner: buildExplorerAddressUrl(state.owner),
      },
    };

    byToken[tokenId] = entry;

    if (isCoreAddress(state.owner)) {
      const ownerKey = normalizeAddress(state.owner);
      const bucket = ownerBuckets.get(ownerKey) || {
        owner: state.owner,
        explorer: buildExplorerAddressUrl(state.owner),
        tokenIds: [],
      };
      bucket.tokenIds.push(tokenId);
      ownerBuckets.set(ownerKey, bucket);
    }
  }

  const byOwner = {};
  for (const [ownerKey, bucket] of ownerBuckets.entries()) {
    bucket.tokenIds.sort((a, b) => a - b);
    byOwner[ownerKey] = bucket;
  }

  return {
    fetchedAt: new Date().toISOString(),
    errorMessage: "",
    mintedCount: tokenStates.size,
    byToken,
    byOwner,
  };
}

export async function getStatusSnapshot() {
  const now = Date.now();
  if (snapshotCache && snapshotCache.expiresAt > now) {
    return snapshotCache.snapshot;
  }

  try {
    const snapshot = await buildStatusSnapshot();
    snapshotCache = {
      expiresAt: now + CACHE_TTL_MS,
      snapshot,
    };
    return snapshot;
  } catch (error) {
    if (snapshotCache?.snapshot) {
      return {
        ...snapshotCache.snapshot,
        errorMessage: error instanceof Error ? error.message : "status fetch failed",
      };
    }
    return buildEmptySnapshot(error instanceof Error ? error.message : "status fetch failed");
  }
}

export async function getTokenStatus(tokenId) {
  const snapshot = await getStatusSnapshot();
  return snapshot.byToken[tokenId] || {
    minted: false,
    owner: null,
    mintTxHash: null,
    latestTxHash: null,
    mintedAt: null,
    updatedAt: null,
    explorer: {
      mintTx: null,
      latestTx: null,
      owner: null,
    },
  };
}

export async function getOwnerStatus(ownerAddress) {
  if (!isCoreAddress(ownerAddress)) {
    return null;
  }
  const snapshot = await getStatusSnapshot();
  return snapshot.byOwner[normalizeAddress(ownerAddress)] || {
    owner: ownerAddress,
    explorer: buildExplorerAddressUrl(ownerAddress),
    tokenIds: [],
  };
}

export function attachStatusToItem(item, status) {
  return {
    ...item,
    mint_status: status,
  };
}
