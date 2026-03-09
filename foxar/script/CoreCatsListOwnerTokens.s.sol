// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "spark-std/console2.sol";
import "../src/CoreCats.sol";

contract CoreCatsListOwnerTokensScript is Script {
    function run() external view returns (uint256 balance, uint256[] memory ownedTokenIds) {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address ownerAddress = vm.envAddress("OWNER_ADDRESS");

        CoreCats coreCats = CoreCats(coreCatsAddress);
        balance = coreCats.balanceOf(ownerAddress);
        ownedTokenIds = new uint256[](balance);

        uint256 found = 0;
        uint256 maxSupply = coreCats.MAX_SUPPLY();
        for (uint256 tokenId = 1; tokenId <= maxSupply && found < balance; tokenId++) {
            try coreCats.ownerOf(tokenId) returns (address actualOwner) {
                if (actualOwner == ownerAddress) {
                    ownedTokenIds[found] = tokenId;
                    found++;
                    console2.log("ownedTokenId", tokenId);
                }
            } catch {}
        }

        require(found == balance, "owner tokens incomplete");
    }
}
