// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsRevealMintScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envString("DEPLOYER_PRIVATE_KEY");
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        bytes32 secret = vm.envBytes32("MINT_SECRET");

        CoreCats coreCats = CoreCats(coreCatsAddress);

        vm.startBroadcast(deployerPrivateKey);
        coreCats.revealMint(secret);
        vm.stopBroadcast();
    }
}
