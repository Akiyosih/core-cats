// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";
import "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

contract CoreCatsCommitMintScript is Script {
    function run() external returns (bytes32 commitHash, uint256 nonce, uint256 expiry) {
        string memory deployerPrivateKey = vm.envString("DEPLOYER_PRIVATE_KEY");
        address minter = vm.rememberKey(deployerPrivateKey);

        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 quantity = vm.envOr("MINT_QUANTITY", uint256(1));
        uint8 quantityUint8 = uint8(quantity);

        nonce = vm.envOr("MINT_NONCE", uint256(keccak256(abi.encodePacked(block.timestamp, minter, quantity))));
        expiry = vm.envOr("MINT_EXPIRY", block.timestamp + 1 days);
        uint256 signingChainId = vm.envOr("MINT_CHAIN_ID", block.chainid);
        commitHash = keccak256(abi.encodePacked(vm.envBytes32("MINT_SECRET")));

        bytes32 message = keccak256(abi.encodePacked(minter, quantity, nonce, expiry, signingChainId, coreCatsAddress));
        bytes memory signature = _resolveSignature(deployerPrivateKey, message);

        vm.startBroadcast(deployerPrivateKey);
        CoreCats(coreCatsAddress).commitMint(quantityUint8, commitHash, nonce, expiry, signature);
        vm.stopBroadcast();
    }

    function _resolveSignature(string memory deployerPrivateKey, bytes32 message) internal returns (bytes memory) {
        bytes memory providedSignature = vm.envOr("MINT_SIGNATURE", bytes(""));
        if (providedSignature.length != 0) {
            return providedSignature;
        }

        string memory signerPrivateKey = vm.envOr("MINT_SIGNER_PRIVATE_KEY", deployerPrivateKey);
        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        return vm.sign(signerPrivateKey, digest);
    }
}
