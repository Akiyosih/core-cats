// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";
import "../src/CoreCatsOnchainData.sol";
import "../src/CoreCatsMetadataRenderer.sol";

contract CoreCatsDeployScript is Script {
    function run() external returns (CoreCats coreCats, CoreCatsOnchainData data, CoreCatsMetadataRenderer renderer) {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));

        if (bytes(deployerPrivateKey).length != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        data = new CoreCatsOnchainData();
        renderer = new CoreCatsMetadataRenderer(address(data));
        coreCats = new CoreCats();
        coreCats.setMetadataRenderer(address(renderer));

        vm.stopBroadcast();
    }
}
