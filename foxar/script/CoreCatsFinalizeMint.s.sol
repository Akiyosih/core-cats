// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsFinalizeMintScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address deployerAddress = vm.envOr("DEPLOYER_ADDRESS", address(0));
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address minter;

        if (bytes(deployerPrivateKey).length != 0) {
            address defaultMinter = vm.rememberKey(deployerPrivateKey);
            minter = vm.envOr("MINTER_ADDRESS", defaultMinter);
            vm.startBroadcast(deployerPrivateKey);
        } else if (deployerAddress != address(0)) {
            minter = vm.envOr("MINTER_ADDRESS", deployerAddress);
            vm.startBroadcast(deployerAddress);
        } else {
            minter = vm.envAddress("MINTER_ADDRESS");
            vm.startBroadcast();
        }

        CoreCats coreCats = CoreCats(coreCatsAddress);

        coreCats.finalizeMint(minter);
        vm.stopBroadcast();
    }
}
