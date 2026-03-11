// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";
import "../src/CoreCatsOnchainData.sol";
import "../src/CoreCatsMetadataRenderer.sol";

contract CoreCatsDeployScript is Script {
    function run() external returns (CoreCats coreCats, CoreCatsOnchainData data, CoreCatsMetadataRenderer renderer) {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address deployerAddress = vm.envOr("DEPLOYER_ADDRESS", address(0));
        string memory collectionName = vm.envOr("CORECATS_COLLECTION_NAME", string("CoreCats"));
        string memory collectionSymbol = vm.envOr("CORECATS_SYMBOL", string("CCAT"));
        string memory tokenNamePrefix = vm.envOr("CORECATS_TOKEN_NAME_PREFIX", collectionName);
        string memory defaultDescription = string(abi.encodePacked(collectionName, " fully on-chain 24x24 SVG."));
        string memory tokenDescription = vm.envOr("CORECATS_TOKEN_DESCRIPTION", defaultDescription);
        bool allowNonstandardLabels = vm.envOr("CORECATS_ALLOW_NONSTANDARD_LABELS", uint256(0)) != 0;
        bool superrarePlaceholderEnabled = vm.envOr("CORECATS_SUPERRARE_PLACEHOLDER", uint256(0)) != 0;

        if (block.chainid == 1 && (!_sameString(collectionName, "CoreCats") || !_sameString(collectionSymbol, "CCAT"))) {
            require(
                allowNonstandardLabels,
                "nonstandard mainnet labels require CORECATS_ALLOW_NONSTANDARD_LABELS=1"
            );
        }

        if (bytes(deployerPrivateKey).length != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else if (deployerAddress != address(0)) {
            vm.startBroadcast(deployerAddress);
        } else {
            vm.startBroadcast();
        }

        data = new CoreCatsOnchainData();
        renderer = new CoreCatsMetadataRenderer(
            address(data), tokenNamePrefix, tokenDescription, superrarePlaceholderEnabled
        );
        coreCats = new CoreCats(collectionName, collectionSymbol);
        coreCats.setMetadataRenderer(address(renderer));

        vm.stopBroadcast();
    }

    function _sameString(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
