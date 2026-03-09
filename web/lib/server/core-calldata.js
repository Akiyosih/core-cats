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

export function encodeCoreCatsCommitMintData({ quantity, commitHash, nonce, expiry, signature }) {
  return joinSelectorAndArgs(
    CORECATS_METHOD_SELECTORS.commitMint,
    abiCoder.encode(["uint8", "bytes32", "uint256", "uint256", "bytes"], [quantity, commitHash, nonce, expiry, signature]),
  );
}
