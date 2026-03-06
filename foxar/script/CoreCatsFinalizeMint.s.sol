// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsFinalizeMintScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envString("DEPLOYER_PRIVATE_KEY");
        address defaultMinter = vm.rememberKey(deployerPrivateKey);
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address minter = vm.envOr("MINTER_ADDRESS", defaultMinter);

        CoreCats coreCats = CoreCats(coreCatsAddress);

        vm.startBroadcast(deployerPrivateKey);
        coreCats.finalizeMint(minter);
        vm.stopBroadcast();
    }
}
