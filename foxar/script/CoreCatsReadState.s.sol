// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsReadStateScript is Script {
    function run() external view returns (uint256 totalSupply, address ownerOfToken1, address metadataRenderer) {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        CoreCats coreCats = CoreCats(coreCatsAddress);

        totalSupply = coreCats.totalSupply();
        metadataRenderer = coreCats.metadataRenderer();
        ownerOfToken1 = coreCats.ownerOf(1);
    }
}
