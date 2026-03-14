// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsDirectCommitProbeScript is Script {
    function run() external {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address minter = vm.envAddress("MINTER_ADDRESS");
        uint256 warpTimestamp = vm.envOr("MINT_WARP_TIMESTAMP", uint256(0));
        uint256 quantityValue = vm.envUint("MINT_QUANTITY");
        bytes32 commitHash = vm.envBytes32("MINT_COMMIT_HASH");

        if (warpTimestamp != 0) {
            vm.warp(warpTimestamp);
        }

        vm.prank(minter);
        CoreCats(coreCatsAddress).commitMint(uint8(quantityValue), commitHash);
    }
}
