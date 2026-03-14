// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsCommitMintScript is Script {
    function run() external returns (bytes32 commitHash) {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address deployerAddress = vm.envOr("DEPLOYER_ADDRESS", address(0));

        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 quantity = vm.envOr("MINT_QUANTITY", uint256(1));
        uint8 quantityUint8 = uint8(quantity);

        commitHash = _resolveCommitHash();

        if (bytes(deployerPrivateKey).length != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else if (deployerAddress != address(0)) {
            vm.startBroadcast(deployerAddress);
        } else {
            vm.startBroadcast();
        }
        CoreCats(coreCatsAddress).commitMint(quantityUint8, commitHash);
        vm.stopBroadcast();
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
