// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Script.sol";
import "spark-std/console2.sol";

contract CoreCatsProbeCommitScript is Script {
    function run() external returns (bool ok, string memory message) {
        address coreCatsAddress = vm.envAddress("CORECATS_ADDRESS");
        address minter = vm.envAddress("MINTER_ADDRESS");
        bytes memory callData = vm.envBytes("MINT_CALLDATA");
        bytes memory result;

        vm.prank(minter);
        (ok, result) = coreCatsAddress.call(callData);

        if (ok) {
            message = "ok";
            console2.log("probe:", message);
            return (ok, message);
        }

        message = _decodeRevert(result);
        console2.log("probe:", message);
        return (ok, message);
    }

    function _decodeRevert(bytes memory revertData) internal pure returns (string memory) {
        if (revertData.length >= 68) {
            bytes4 selector;
            assembly {
                selector := mload(add(revertData, 32))
            }
            if (selector == 0x08c379a0) {
                bytes memory payload = new bytes(revertData.length - 4);
                for (uint256 i = 4; i < revertData.length; i++) {
                    payload[i - 4] = revertData[i];
                }
                return abi.decode(payload, (string));
            }
        }
        if (revertData.length == 0) {
            return "execution reverted";
        }
        return "unrecognized revert payload";
    }
}
