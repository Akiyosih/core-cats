// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";

contract CoreCatsExportTokenURIScript is Script {
    function run() external returns (string memory tokenUri) {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 tokenId = vm.envOr("TOKEN_ID", uint256(1));
        tokenUri = CoreCats(coreCatsAddress).tokenURI(tokenId);
    }
}
