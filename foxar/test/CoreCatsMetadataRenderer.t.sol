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
    uint256 private constant BEAM_SUPERRARE_TOKEN_ID = 6;

    function testRendererStoresConfigurableLabels() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        CoreCatsMetadataRenderer renderer =
            new CoreCatsMetadataRenderer(address(data), "CCATTEST", "CCATTEST pilot metadata.", true);

        assertEq(renderer.tokenNamePrefix(), "CCATTEST");
        assertEq(renderer.tokenDescription(), "CCATTEST pilot metadata.");
        assertTrue(renderer.superrarePlaceholderEnabled());
    }

    function testSuperrarePlaceholderChangesBeamSuperrareTokenUri() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        CoreCatsMetadataRenderer baseline =
            new CoreCatsMetadataRenderer(address(data), "CoreCats", "CoreCats fully on-chain 24x24 SVG.", false);
        CoreCatsMetadataRenderer placeholder =
            new CoreCatsMetadataRenderer(address(data), "CoreCats", "CoreCats fully on-chain 24x24 SVG.", true);

        string memory baselineBeam = baseline.tokenURI(BEAM_SUPERRARE_TOKEN_ID);
        string memory placeholderBeam = placeholder.tokenURI(BEAM_SUPERRARE_TOKEN_ID);

        assertTrue(_startsWith(placeholderBeam, "data:application/json;base64,"));
        assertFalse(_sameString(baselineBeam, placeholderBeam));
    }

    function testJsonEscapeHandlesQuotesBackslashesAndNewlines() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        TestableCoreCatsMetadataRenderer renderer = new TestableCoreCatsMetadataRenderer(
            address(data), "Core\"Cats", "Line 1\nLine \"2\" \\", false
        );

        assertEq(renderer.exposedEscapeJsonString("Core\"Cats"), "Core\\\"Cats");
        assertEq(renderer.exposedEscapeJsonString("Line 1\nLine \"2\" \\"), "Line 1\\nLine \\\"2\\\" \\\\");
    }

    function testTokenURIRevertsOutsideSupplyRange() public {
        CoreCatsOnchainData data = new CoreCatsOnchainData();
        CoreCatsMetadataRenderer renderer =
            new CoreCatsMetadataRenderer(address(data), "CCATTEST2", "CCATTEST2 renderer boundary test.", true);

        vm.expectRevert(bytes("token out of range"));
        renderer.tokenURI(0);

        vm.expectRevert(bytes("token out of range"));
        renderer.tokenURI(1001);
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
