// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";

contract CoreCatsPrepareMintScript is Script {
    function run() external returns (bytes32 commitHash) {
        commitHash = _resolveCommitHash();
    }

    function _resolveCommitHash() internal returns (bytes32) {
        bytes32 commitHash = vm.envOr("MINT_COMMIT_HASH", bytes32(0));
        if (commitHash != bytes32(0)) {
            return commitHash;
        }

        bytes32 seed = vm.envOr("MINT_SEED", bytes32(0));
        if (seed != bytes32(0)) {
            return keccak256(abi.encodePacked(seed));
        }

        return keccak256(abi.encodePacked(vm.envBytes32("MINT_SECRET")));
    }
}
