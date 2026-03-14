// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Test.sol";
import "../src/CoreCatsMetadataRenderer.sol";
import "../src/CoreCatsOnchainData.sol";

contract TestableCoreCatsMetadataRenderer is CoreCatsMetadataRenderer {
    constructor(
        address dataAddress,
        string memory tokenNamePrefix_,
        string memory tokenDescription_,
        bool superrarePlaceholderEnabled_
    ) CoreCatsMetadataRenderer(dataAddress, tokenNamePrefix_, tokenDescription_, superrarePlaceholderEnabled_) {}

    function exposedEscapeJsonString(string memory value) external pure returns (string memory) {
        return _escapeJsonString(value);
    }
}

contract CoreCatsMetadataRendererTest is Test {
    uint256 private constant PING_SUPERRARE_TOKEN_ID = 999;
    uint256 private constant CORE_SUPERRARE_TOKEN_ID = 1000;

    function testRendererStoresConfigurableLabels() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        CoreCatsMetadataRenderer renderer =
            new CoreCatsMetadataRenderer(address(data), "CCATTEST", "CCATTEST pilot metadata.", true);

        assertEq(renderer.tokenNamePrefix(), "CCATTEST");
        assertEq(renderer.tokenDescription(), "CCATTEST pilot metadata.");
        assertTrue(renderer.superrarePlaceholderEnabled());
    }

    function testSuperrarePlaceholderChangesSuperrareTokenUris() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        CoreCatsMetadataRenderer baseline =
            new CoreCatsMetadataRenderer(address(data), "CoreCats", "CoreCats fully on-chain 24x24 SVG.", false);
        CoreCatsMetadataRenderer placeholder =
            new CoreCatsMetadataRenderer(address(data), "CCATTEST", "CCATTEST pilot metadata.", true);

        string memory baselinePing = baseline.tokenURI(PING_SUPERRARE_TOKEN_ID);
        string memory baselineCore = baseline.tokenURI(CORE_SUPERRARE_TOKEN_ID);
        string memory placeholderPing = placeholder.tokenURI(PING_SUPERRARE_TOKEN_ID);
        string memory placeholderCore = placeholder.tokenURI(CORE_SUPERRARE_TOKEN_ID);

        assertTrue(_startsWith(placeholderPing, "data:application/json;base64,"));
        assertTrue(_startsWith(placeholderCore, "data:application/json;base64,"));
        assertFalse(_sameString(baselinePing, placeholderPing));
        assertFalse(_sameString(baselineCore, placeholderCore));
        assertFalse(_sameString(placeholderPing, placeholderCore));
    }

    function testJsonEscapeHandlesQuotesBackslashesAndNewlines() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        TestableCoreCatsMetadataRenderer renderer = new TestableCoreCatsMetadataRenderer(
            address(data), "Core\"Cats", "Line 1\nLine \"2\" \\", false
        );

        assertEq(renderer.exposedEscapeJsonString("Core\"Cats"), "Core\\\"Cats");
        assertEq(renderer.exposedEscapeJsonString("Line 1\nLine \"2\" \\"), "Line 1\\nLine \\\"2\\\" \\\\");
    }

    function _sameString(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _startsWith(string memory value, string memory prefix) internal pure returns (bool) {
        bytes memory v = bytes(value);
        bytes memory p = bytes(prefix);

        if (p.length > v.length) {
            return false;
        }

        for (uint256 i = 0; i < p.length; i++) {
            if (v[i] != p[i]) {
                return false;
            }
        }

        return true;
    }
}
