// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

contract CoreCatsIssueMintAuthorizationScript is Script {
    function run()
        external
        returns (
            address minter,
            uint8 quantity,
            uint256 nonce,
            uint256 expiry,
            uint256 chainId,
            bytes32 messageHash,
            bytes memory signature
        )
    {
        minter = vm.envAddress("MINT_TO");
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 quantityValue = vm.envOr("MINT_QUANTITY", uint256(1));
        require(quantityValue > 0 && quantityValue <= type(uint8).max, "invalid quantity");
        quantity = uint8(quantityValue);

        nonce = vm.envOr("MINT_NONCE", uint256(keccak256(abi.encodePacked(block.timestamp, minter, quantityValue))));
        expiry = vm.envOr("MINT_EXPIRY", block.timestamp + 10 minutes);
        chainId = vm.envOr("MINT_CHAIN_ID", block.chainid);

        messageHash = keccak256(abi.encodePacked(minter, quantityValue, nonce, expiry, chainId, coreCatsAddress));

        string memory deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", string(""));
        string memory signerPrivateKey = vm.envOr("MINT_SIGNER_PRIVATE_KEY", deployerPrivateKey);
        require(bytes(signerPrivateKey).length != 0, "missing signer key");

        bytes32 digest = EDDSA.toCoreSignedMessageHash(messageHash);
        signature = vm.sign(signerPrivateKey, digest);
    }
}
