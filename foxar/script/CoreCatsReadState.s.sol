// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsReadStateScript is Script {
    function run()
        external
        view
        returns (
            uint256 totalSupply,
            uint256 availableSupply,
            uint256 reservedSupply,
            address metadataRenderer
        )
    {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        CoreCats coreCats = CoreCats(coreCatsAddress);

        totalSupply = coreCats.totalSupply();
        availableSupply = coreCats.availableSupply();
        reservedSupply = coreCats.reservedSupply();
        metadataRenderer = coreCats.metadataRenderer();
    }
}
