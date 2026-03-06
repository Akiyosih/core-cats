// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";

contract CoreCatsPrepareMintScript is Script {
    function run() external returns (bytes32 messageHash, bytes32 commitHash, uint256 nonce, uint256 expiry) {
        string memory deployerPrivateKey = vm.envString("DEPLOYER_PRIVATE_KEY");
        address minter = vm.rememberKey(deployerPrivateKey);
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 quantity = vm.envOr("MINT_QUANTITY", uint256(1));

        nonce = vm.envOr("MINT_NONCE", uint256(keccak256(abi.encodePacked(block.timestamp, minter, quantity))));
        expiry = vm.envOr("MINT_EXPIRY", block.timestamp + 1 days);
        uint256 signingChainId = vm.envOr("MINT_CHAIN_ID", block.chainid);

        commitHash = keccak256(abi.encodePacked(vm.envBytes32("MINT_SECRET")));
        messageHash = keccak256(abi.encodePacked(minter, quantity, nonce, expiry, signingChainId, coreCatsAddress));
    }
}
