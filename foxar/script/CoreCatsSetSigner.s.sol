// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsSetSignerScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address newSigner = vm.envAddress("NEW_SIGNER_ADDRESS");

        CoreCats coreCats = CoreCats(coreCatsAddress);

        if (bytes(deployerPrivateKey).length != 0) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }
        coreCats.setSigner(newSigner);
        vm.stopBroadcast();
    }
}
