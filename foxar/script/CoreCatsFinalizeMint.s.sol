// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsFinalizeMintScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address minter;

        if (bytes(deployerPrivateKey).length != 0) {
            address defaultMinter = vm.rememberKey(deployerPrivateKey);
            minter = vm.envOr("MINTER_ADDRESS", defaultMinter);
            vm.startBroadcast(deployerPrivateKey);
        } else {
            minter = vm.envAddress("MINTER_ADDRESS");
            vm.startBroadcast();
        }

        CoreCats coreCats = CoreCats(coreCatsAddress);

        coreCats.finalizeMint(minter);
        vm.stopBroadcast();
    }
}
