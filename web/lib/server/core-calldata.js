import { AbiCoder } from "ethers";

// Core/ylm method selectors differ from Ethereum keccak-based selectors.
// These values come from foxar/out/CoreCats.sol/CoreCats.json methodIdentifiers.
export const CORECATS_METHOD_SELECTORS = {
  commitMint: "0xf634ddd1",
  finalizeMint: "0x11709128",
};

const abiCoder = AbiCoder.defaultAbiCoder();

function joinSelectorAndArgs(selector, encodedArgs) {
  return `${selector}${encodedArgs.slice(2)}`;
}

export function normalizeCoreAddressToHex(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (/^0x[0-9a-f]{40}$/.test(raw)) return raw;
  if (/^[0-9a-f]{40}$/.test(raw)) return `0x${raw}`;
  if (/^[a-z]{2}[0-9a-f]{42}$/.test(raw)) return `0x${raw.slice(4)}`;
  throw new Error(`Unsupported Core address format: ${value}`);
}

export function encodeCoreCatsCommitMintData({ quantity, commitHash, nonce, expiry, signature }) {
  return joinSelectorAndArgs(
    CORECATS_METHOD_SELECTORS.commitMint,
    abiCoder.encode(["uint8", "bytes32", "uint256", "uint256", "bytes"], [quantity, commitHash, nonce, expiry, signature]),
  );
}

export function encodeCoreCatsFinalizeMintData({ minter }) {
  return joinSelectorAndArgs(
    CORECATS_METHOD_SELECTORS.finalizeMint,
    abiCoder.encode(["address"], [normalizeCoreAddressToHex(minter)]),
  );
}
