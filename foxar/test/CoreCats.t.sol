// SPDX-License-Identifier: UNLICENSED
pragma solidity ^1.1.2;

import "spark-std/Test.sol";
import "../src/CoreCats.sol";
import "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

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
    address private _signer;
    string private _signerKey;
    address private _minter;

    function setUp() public {
        _coreCats = new CoreCats();
        (_signer, _signerKey) = makeAddrAndKey("signer");
        _minter = makeAddr("minter");
        _coreCats.setSigner(_signer);
    }

    function testMintWithValidSignature() public {
        uint256 nonce = 1;
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-1");
        bytes memory sig = _mintSignature(_minter, 1, nonce, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + 1);
        vm.prank(_minter);
        _coreCats.revealMint(secret);

        assertEq(_coreCats.totalSupply(), 1);
        assertEq(_coreCats.mintedPerAddress(_minter), 1);
        assertEq(_coreCats.balanceOf(_minter), 1);
    }

    function testCommitReplayReverts() public {
        uint256 nonce = 7;
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-2");
        bytes memory sig = _mintSignature(_minter, 1, nonce, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + 1);
        vm.prank(_minter);
        _coreCats.revealMint(secret);

        vm.expectRevert(bytes("nonce used"));
        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);
    }

    function testCommitExpiredSignatureReverts() public {
        uint256 nonce = 11;
        uint256 expiry = block.timestamp - 1;
        bytes32 secret = keccak256("secret-3");
        bytes memory sig = _mintSignature(_minter, 1, nonce, expiry, _signerKey);

        vm.expectRevert(bytes("signature expired"));
        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);
    }

    function testCommitInvalidSignatureReverts() public {
        (, string memory wrongKey) = makeAddrAndKey("wrong-signer");
        uint256 nonce = 15;
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-4");
        bytes memory sig = _mintSignature(_minter, 1, nonce, expiry, wrongKey);

        vm.expectRevert(bytes("invalid signature"));
        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);
    }

    function testQuantityMintRevealsThreeTokens() public {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-qty3");
        bytes memory sig = _mintSignature(_minter, 3, 31, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(3, keccak256(abi.encodePacked(secret)), 31, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + 1);
        vm.prank(_minter);
        _coreCats.revealMint(secret);

        assertEq(_coreCats.totalSupply(), 3);
        assertEq(_coreCats.mintedPerAddress(_minter), 3);
        assertEq(_coreCats.balanceOf(_minter), 3);
    }

    function testPerAddressLimitRevertsOnSecondCommitWhenReservedWouldExceedLimit() public {
        _commitAndReveal(_minter, 2, 40, keccak256("secret-limit"));

        uint256 expiry = block.timestamp + 1 days;
        bytes memory sigB = _mintSignature(_minter, 2, 41, expiry, _signerKey);
        vm.expectRevert(bytes("address mint limit"));
        vm.prank(_minter);
        _coreCats.commitMint(2, keccak256(abi.encodePacked(bytes32(uint256(41)))), 41, expiry, sigB);
    }

    function testTokenURIRevertsWhenRendererUnset() public {
        _commitAndReveal(_minter, 1, 21, keccak256("secret-uri-unset"));
        uint256 tokenId = _ownedTokenId(_minter);

        vm.expectRevert(bytes("renderer not set"));
        _coreCats.tokenURI(tokenId);
    }

    function testTokenURIDelegatesToRenderer() public {
        string memory expected = "data:application/json;base64,Zm9v";
        MockMetadataRenderer renderer = new MockMetadataRenderer(expected);
        _coreCats.setMetadataRenderer(address(renderer));

        _commitAndReveal(_minter, 1, 22, keccak256("secret-uri-set"));

        string memory actual = _coreCats.tokenURI(_ownedTokenId(_minter));
        assertEq(actual, expected);
        assertTrue(_startsWith(actual, "data:application/json;base64,"));
    }

    function testSetSignerOnlyOwner() public {
        address nonOwner = makeAddr("non-owner");
        address anotherSigner = makeAddr("another-signer");

        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        vm.prank(nonOwner);
        _coreCats.setSigner(anotherSigner);
    }

    function testSetMetadataRendererOnlyOwner() public {
        address nonOwner = makeAddr("non-owner");
        MockMetadataRenderer renderer = new MockMetadataRenderer("data:application/json;base64,Zm9v");

        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        vm.prank(nonOwner);
        _coreCats.setMetadataRenderer(address(renderer));
    }

    function testRevealTooEarlyReverts() public {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-early");
        bytes memory sig = _mintSignature(_minter, 1, 51, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), 51, expiry, sig);

        vm.expectRevert(bytes("reveal too early"));
        vm.prank(_minter);
        _coreCats.revealMint(secret);
    }

    function testRevealWrongSecretReverts() public {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-correct");
        bytes memory sig = _mintSignature(_minter, 1, 52, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), 52, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + 1);
        vm.expectRevert(bytes("invalid reveal"));
        vm.prank(_minter);
        _coreCats.revealMint(keccak256("secret-wrong"));
    }

    function testExpiredCommitCanBeClearedAndRecommitted() public {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secretA = keccak256("secret-expired-a");
        bytes32 secretB = keccak256("secret-expired-b");
        bytes memory sigA = _mintSignature(_minter, 1, 60, expiry, _signerKey);
        bytes memory sigB = _mintSignature(_minter, 1, 61, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secretA)), 60, expiry, sigA);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + _coreCats.REVEAL_WINDOW_BLOCKS() + 2);

        vm.prank(_minter);
        _coreCats.clearExpiredCommit(_minter);

        assertEq(_coreCats.reservedSupply(), 0);
        assertEq(_coreCats.reservedPerAddress(_minter), 0);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secretB)), 61, expiry, sigB);
    }

    function testRevealExpiredReverts() public {
        uint256 expiry = block.timestamp + 1 days;
        bytes32 secret = keccak256("secret-expired");
        bytes memory sig = _mintSignature(_minter, 1, 62, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.commitMint(1, keccak256(abi.encodePacked(secret)), 62, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + _coreCats.REVEAL_WINDOW_BLOCKS() + 2);

        vm.expectRevert(bytes("reveal expired"));
        vm.prank(_minter);
        _coreCats.revealMint(secret);
    }

    function testRandomAssignmentDoesNotRepeatTokenIdsAcrossWallets() public {
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        address carol = makeAddr("carol");

        _commitAndReveal(alice, 2, 71, keccak256("secret-alice"));
        _commitAndReveal(bob, 2, 72, keccak256("secret-bob"));
        _commitAndReveal(carol, 2, 73, keccak256("secret-carol"));

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
        uint256 expiry = block.timestamp + 1 days;
        bytes memory sig = _mintSignature(_minter, 1, 80, expiry, _signerKey);

        vm.expectRevert(bytes("invalid quantity"));
        vm.prank(_minter);
        _coreCats.commitMint(0, keccak256(abi.encodePacked(bytes32(uint256(1)))), 80, expiry, sig);

        vm.expectRevert(bytes("commit hash required"));
        vm.prank(_minter);
        _coreCats.commitMint(1, bytes32(0), 80, expiry, sig);
    }

    function _commitAndReveal(address to, uint8 quantity, uint256 nonce, bytes32 secret) internal {
        uint256 expiry = block.timestamp + 1 days;
        bytes memory sig = _mintSignature(to, quantity, nonce, expiry, _signerKey);

        vm.prank(to);
        _coreCats.commitMint(quantity, keccak256(abi.encodePacked(secret)), nonce, expiry, sig);

        vm.roll(block.number + _coreCats.REVEAL_DELAY_BLOCKS() + 1);
        vm.prank(to);
        _coreCats.revealMint(secret);
    }

    function _mintSignature(address to, uint256 quantity, uint256 nonce, uint256 expiry, string memory key)
        internal
        view
        returns (bytes memory)
    {
        bytes32 message = keccak256(abi.encodePacked(to, quantity, nonce, expiry, block.chainid, address(_coreCats)));
        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        return vm.sign(key, digest);
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
