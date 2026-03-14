import { AbiCoder } from "ethers";

// Core/ylm method selectors differ from Ethereum keccak-based selectors.
// These values come from foxar/out/CoreCats.sol/CoreCats.json methodIdentifiers.
export const CORECATS_METHOD_SELECTORS = {
  commitMint: "0x9bf2435b",
  finalizeMint: "0x11709128",
};

const abiCoder = AbiCoder.defaultAbiCoder();

function joinSelectorAndArgs(selector, encodedArgs) {
  return `${selector}${encodedArgs.slice(2)}`;
}

function pad32(hexBody) {
  return hexBody.padStart(64, "0");
}

export function normalizeCoreAddressToAbiWord(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (/^0x[a-z]{2}[0-9a-f]{42}$/.test(raw)) return `0x${raw.slice(2)}`;
  if (/^[a-z]{2}[0-9a-f]{42}$/.test(raw)) return `0x${raw}`;
  if (/^0x[0-9a-f]{40}$/.test(raw)) return raw;
  if (/^[0-9a-f]{40}$/.test(raw)) return `0x${raw}`;
  throw new Error(`Unsupported Core address format: ${value}`);
}

export function encodeCoreCatsCommitMintData({ quantity, commitHash }) {
  return joinSelectorAndArgs(
    CORECATS_METHOD_SELECTORS.commitMint,
    abiCoder.encode(["uint8", "bytes32"], [quantity, commitHash]),
  );
}

export function encodeCoreCatsFinalizeMintData({ minter }) {
  const minterWord = normalizeCoreAddressToAbiWord(minter).replace(/^0x/, "");
  return joinSelectorAndArgs(CORECATS_METHOD_SELECTORS.finalizeMint, `0x${pad32(minterWord)}`);
}
