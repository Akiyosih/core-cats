// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "../src/CoreCats.sol";
import "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

contract CoreCatsPostDeployCheckScript is Script {
    function run() external {
        string memory deployerPrivateKey = vm.envString("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.rememberKey(deployerPrivateKey);

        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address expectedRenderer = vm.envAddress("EXPECTED_RENDERER_ADDRESS");
        address mintTo = vm.envOr("MINT_TO", deployerAddress);

        CoreCats coreCats = CoreCats(coreCatsAddress);
        require(coreCats.metadataRenderer() == expectedRenderer, "renderer mismatch");
        require(coreCats.signer() == deployerAddress, "script key is not signer");

        uint256 supplyBefore = coreCats.totalSupply();

        uint256 nonce = uint256(keccak256(abi.encodePacked(block.timestamp, supplyBefore, mintTo)));
        uint256 expiry = block.timestamp + 1 days;
        bytes32 message = keccak256(abi.encodePacked(mintTo, nonce, expiry, block.chainid, coreCatsAddress));
        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        bytes memory signature = vm.sign(deployerPrivateKey, digest);

        vm.startBroadcast(deployerPrivateKey);
        coreCats.mint(mintTo, nonce, expiry, signature);
        vm.stopBroadcast();

        string memory tokenUri = coreCats.tokenURI(supplyBefore + 1);
        require(_startsWith(tokenUri, "data:application/json;base64,"), "tokenURI prefix invalid");
        require(coreCats.totalSupply() == supplyBefore + 1, "supply not incremented");
    }

    function _startsWith(string memory value, string memory prefix) internal pure returns (bool) {
        bytes memory valueBytes = bytes(value);
        bytes memory prefixBytes = bytes(prefix);

        if (prefixBytes.length > valueBytes.length) {
            return false;
        }

        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (valueBytes[i] != prefixBytes[i]) {
                return false;
            }
        }

        return true;
    }
}
