// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Test.sol";
import "../src/CoreCats.sol";

contract MockMetadataRenderer {
    string private _uri;

    constructor(string memory uri_) {
        _uri = uri_;
    }

    function tokenURI(uint256) external view returns (string memory) {
        return _uri;
    }
}

contract CoreCatsTest is Test {
    CoreCats private _coreCats;
    MockMetadataRenderer private _renderer;
    address private _minter;

    function setUp() public {
        _renderer = new MockMetadataRenderer("data:application/json;base64,Zm9v");
        _coreCats = new CoreCats("CoreCats", "CCAT", address(_renderer));
        _minter = makeAddr("minter");
    }

    function testMintWithoutAuthorization() public {
        bytes32 seed = keccak256("seed-1");
        address relayer = makeAddr("relayer");

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seed)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + 1);
        vm.prank(relayer);
        _coreCats.finalizeMint(_minter);

        assertEq(_coreCats.totalSupply(), 1);
        assertEq(_coreCats.mintedPerAddress(_minter), 1);
        assertEq(_coreCats.balanceOf(_minter), 1);
    }

    function testQuantityMintFinalizesThreeTokens() public {
        bytes32 seed = keccak256("seed-qty3");

        vm.prank(_minter);
        _coreCats.commitMint(3, keccak256(abi.encodePacked(seed)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + 1);
        vm.prank(makeAddr("finalizer"));
        _coreCats.finalizeMint(_minter);

        assertEq(_coreCats.totalSupply(), 3);
        assertEq(_coreCats.mintedPerAddress(_minter), 3);
        assertEq(_coreCats.balanceOf(_minter), 3);
    }

    function testPerAddressLimitRevertsOnSecondCommitWhenReservedWouldExceedLimit() public {
        _commitAndFinalize(_minter, makeAddr("relayer-a"), 2, keccak256("seed-limit"));

        vm.expectRevert(bytes("address mint limit"));
        vm.prank(_minter);
        _coreCats.commitMint(2, keccak256(abi.encodePacked(bytes32(uint256(41)))));
    }

    function testConstructorRejectsZeroRenderer() public {
        vm.expectRevert(bytes("renderer required"));
        new CoreCats("CoreCats", "CCAT", address(0));
    }

    function testTokenURIDelegatesToRenderer() public {
        _commitAndFinalize(_minter, makeAddr("relayer-c"), 1, keccak256("seed-uri-set"));

        string memory expected = "data:application/json;base64,Zm9v";
        string memory actual = _coreCats.tokenURI(_ownedTokenId(_minter));
        assertEq(actual, expected);
        assertTrue(_startsWith(actual, "data:application/json;base64,"));
    }

    function testMetadataRendererPinnedAtDeploy() public {
        assertEq(_coreCats.metadataRenderer(), address(_renderer));
    }

    function testFinalizeTooEarlyReverts() public {
        bytes32 seed = keccak256("seed-early");

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seed)));

        vm.expectRevert(bytes("finalize too early"));
        vm.prank(makeAddr("relayer-d"));
        _coreCats.finalizeMint(_minter);
    }

    function testAnyoneCanFinalizeForMinter() public {
        bytes32 seed = keccak256("seed-third-party");
        address relayer = makeAddr("third-party-finalizer");

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seed)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + 1);
        vm.prank(relayer);
        _coreCats.finalizeMint(_minter);

        uint256 tokenId = _ownedTokenId(_minter);
        assertEq(_coreCats.ownerOf(tokenId), _minter);
        assertEq(_coreCats.balanceOf(relayer), 0);
    }

    function testExpiredCommitCanBeClearedAndRecommitted() public {
        bytes32 seedA = keccak256("seed-expired-a");
        bytes32 seedB = keccak256("seed-expired-b");

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seedA)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + _coreCats.FINALIZE_WINDOW_BLOCKS() + 2);

        vm.prank(makeAddr("cleanup-relayer"));
        _coreCats.clearExpiredCommit(_minter);

        assertEq(_coreCats.reservedSupply(), 0);
        assertEq(_coreCats.reservedPerAddress(_minter), 0);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seedB)));
    }

    function testFinalizeExpiredReverts() public {
        bytes32 seed = keccak256("seed-expired");

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(seed)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + _coreCats.FINALIZE_WINDOW_BLOCKS() + 2);

        vm.expectRevert(bytes("finalize expired"));
        vm.prank(makeAddr("late-relayer"));
        _coreCats.finalizeMint(_minter);
    }

    function testRandomAssignmentDoesNotRepeatTokenIdsAcrossWallets() public {
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        address carol = makeAddr("carol");

        _commitAndFinalize(alice, makeAddr("relayer-e"), 2, keccak256("seed-alice"));
        _commitAndFinalize(bob, makeAddr("relayer-f"), 2, keccak256("seed-bob"));
        _commitAndFinalize(carol, makeAddr("relayer-g"), 2, keccak256("seed-carol"));

        uint256[6] memory tokenIds = [
            _ownedTokenIdAt(alice, 0),
            _ownedTokenIdAt(alice, 1),
            _ownedTokenIdAt(bob, 0),
            _ownedTokenIdAt(bob, 1),
            _ownedTokenIdAt(carol, 0),
            _ownedTokenIdAt(carol, 1)
        ];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            assertTrue(tokenIds[i] >= 1 && tokenIds[i] <= _coreCats.MAX_SUPPLY());
            for (uint256 j = i + 1; j < tokenIds.length; j++) {
                assertTrue(tokenIds[i] != tokenIds[j]);
            }
        }
    }

    function testCommitRequiresNonZeroHashAndValidQuantity() public {
        vm.expectRevert(bytes("invalid quantity"));
        vm.prank(_minter);
        _coreCats.commitMint(0, keccak256(abi.encodePacked(bytes32(uint256(1)))));

        vm.expectRevert(bytes("commit hash required"));
        vm.prank(_minter);
        _coreCats.commitMint(1, bytes32(0));
    }

    function testConstructorSupportsCustomCollectionLabels() public {
        CoreCats custom = new CoreCats("CCATTEST2", "CCATTEST2", address(_renderer));

        assertEq(custom.name(), "CCATTEST2");
        assertEq(custom.symbol(), "CCATTEST2");
        assertEq(custom.metadataRenderer(), address(_renderer));
    }

    function _commitAndFinalize(address to, address finalizer, uint8 quantity, bytes32 seed) internal {
        vm.prank(to);
        _coreCats.commitMint(quantity, keccak256(abi.encodePacked(seed)));

        vm.roll(block.number + _coreCats.FINALIZE_DELAY_BLOCKS() + 1);
        vm.prank(finalizer);
        _coreCats.finalizeMint(to);
    }

    function _ownedTokenId(address owner) internal view returns (uint256) {
        for (uint256 tokenId = 1; tokenId <= _coreCats.MAX_SUPPLY(); tokenId++) {
            try _coreCats.ownerOf(tokenId) returns (address actualOwner) {
                if (actualOwner == owner) {
                    return tokenId;
                }
            } catch {}
        }
        revert("owned token not found");
    }

    function _ownedTokenIdAt(address owner, uint256 index) internal view returns (uint256) {
        uint256 seen = 0;
        for (uint256 tokenId = 1; tokenId <= _coreCats.MAX_SUPPLY(); tokenId++) {
            try _coreCats.ownerOf(tokenId) returns (address actualOwner) {
                if (actualOwner == owner) {
                    if (seen == index) {
                        return tokenId;
                    }
                    seen++;
                }
            } catch {}
        }
        revert("owned token index not found");
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
