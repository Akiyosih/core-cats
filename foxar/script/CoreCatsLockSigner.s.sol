// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsLockSignerScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address deployerAddress = vm.envOr("DEPLOYER_ADDRESS", address(0));
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");

        CoreCats coreCats = CoreCats(coreCatsAddress);

        if (bytes(deployerPrivateKey).length != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else if (deployerAddress != address(0)) {
            vm.startBroadcast(deployerAddress);
        } else {
            vm.startBroadcast();
        }
        coreCats.lockSigner();
        vm.stopBroadcast();
    }
}
