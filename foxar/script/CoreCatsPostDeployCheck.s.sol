// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsPostDeployCheckScript is Script {
    function run()
        external
        view
        returns (
            uint256 totalSupply,
            uint256 availableSupply,
            uint256 reservedSupply,
            address signer,
            address metadataRenderer
        )
    {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address expectedRenderer = vm.envAddress("EXPECTED_RENDERER_ADDRESS");
        address expectedSigner = vm.envAddress("EXPECTED_SIGNER_ADDRESS");

        CoreCats coreCats = CoreCats(coreCatsAddress);

        metadataRenderer = coreCats.metadataRenderer();
        signer = coreCats.signer();
        totalSupply = coreCats.totalSupply();
        availableSupply = coreCats.availableSupply();
        reservedSupply = coreCats.reservedSupply();

        require(metadataRenderer == expectedRenderer, "renderer mismatch");
        require(signer == expectedSigner, "signer mismatch");
    }
}
