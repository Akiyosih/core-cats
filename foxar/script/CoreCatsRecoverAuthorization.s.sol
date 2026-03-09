// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

contract CoreCatsRecoverAuthorizationScript is Script {
    function run()
        external
        view
        returns (
            bytes32 messageHash,
            bytes32 digest,
            address recovered,
            uint8 errorCode
    )
    {
        address minter = vm.envAddress("MINTER_ADDRESS");
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        uint256 quantity = vm.envUint("MINT_QUANTITY");
        uint256 nonce = vm.envUint("MINT_NONCE");
        uint256 expiry = vm.envUint("MINT_EXPIRY");
        uint256 chainId = vm.envUint("MINT_CHAIN_ID");
        bytes memory signature = vm.envBytes("MINT_SIGNATURE");
        EDDSA.RecoverError error;

        messageHash = keccak256(abi.encodePacked(minter, quantity, nonce, expiry, chainId, coreCatsAddress));
        digest = EDDSA.toCoreSignedMessageHash(messageHash);
        (recovered, error) = EDDSA.tryRecover(digest, signature);
        errorCode = uint8(error);
    }
}
