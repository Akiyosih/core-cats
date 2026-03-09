// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";

contract CoreCatsDeriveAddressScript is Script {
    function run() external returns (address derivedAddress) {
        string memory privateKey = vm.envString("PRIVATE_KEY");
        derivedAddress = vm.rememberKey(privateKey);
    }
}
