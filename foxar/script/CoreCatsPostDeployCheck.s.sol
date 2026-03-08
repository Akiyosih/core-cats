// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsPostDeployCheckScript is Script {
    function run()
        external
        returns (
            uint256 totalSupply,
            uint256 availableSupply,
            uint256 reservedSupply,
            address signer,
            address metadataRenderer,
            string memory collectionName,
            string memory collectionSymbol
        )
    {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address expectedRenderer = vm.envAddress("EXPECTED_RENDERER_ADDRESS");
        address expectedSigner = vm.envAddress("EXPECTED_SIGNER_ADDRESS");
        string memory expectedCollectionName = vm.envOr("EXPECTED_COLLECTION_NAME", string(""));
        string memory expectedCollectionSymbol = vm.envOr("EXPECTED_COLLECTION_SYMBOL", string(""));

        CoreCats coreCats = CoreCats(coreCatsAddress);

        metadataRenderer = coreCats.metadataRenderer();
        signer = coreCats.signer();
        collectionName = coreCats.name();
        collectionSymbol = coreCats.symbol();
        totalSupply = coreCats.totalSupply();
        availableSupply = coreCats.availableSupply();
        reservedSupply = coreCats.reservedSupply();

        require(metadataRenderer == expectedRenderer, "renderer mismatch");
        require(signer == expectedSigner, "signer mismatch");
        if (bytes(expectedCollectionName).length != 0) {
            require(keccak256(bytes(collectionName)) == keccak256(bytes(expectedCollectionName)), "name mismatch");
        }
        if (bytes(expectedCollectionSymbol).length != 0) {
            require(keccak256(bytes(collectionSymbol)) == keccak256(bytes(expectedCollectionSymbol)), "symbol mismatch");
        }
    }
}
