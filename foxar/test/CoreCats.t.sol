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
        bytes memory sig = _mintSignature(_minter, nonce, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.mint(_minter, nonce, expiry, sig);

        assertEq(_coreCats.totalSupply(), 1);
        assertEq(_coreCats.ownerOf(1), _minter);
        assertEq(_coreCats.mintedPerAddress(_minter), 1);
    }

    function testMintReplayReverts() public {
        uint256 nonce = 7;
        uint256 expiry = block.timestamp + 1 days;
        bytes memory sig = _mintSignature(_minter, nonce, expiry, _signerKey);

        vm.prank(_minter);
        _coreCats.mint(_minter, nonce, expiry, sig);

        vm.expectRevert(bytes("nonce used"));
        vm.prank(_minter);
        _coreCats.mint(_minter, nonce, expiry, sig);
    }

    function testMintExpiredSignatureReverts() public {
        uint256 nonce = 11;
        uint256 expiry = block.timestamp - 1;
        bytes memory sig = _mintSignature(_minter, nonce, expiry, _signerKey);

        vm.expectRevert(bytes("signature expired"));
        vm.prank(_minter);
        _coreCats.mint(_minter, nonce, expiry, sig);
    }

    function testMintInvalidSignatureReverts() public {
        (, string memory wrongKey) = makeAddrAndKey("wrong-signer");
        uint256 nonce = 15;
        uint256 expiry = block.timestamp + 1 days;
        bytes memory sig = _mintSignature(_minter, nonce, expiry, wrongKey);

        vm.expectRevert(bytes("invalid signature"));
        vm.prank(_minter);
        _coreCats.mint(_minter, nonce, expiry, sig);
    }

    function testTokenURIRevertsWhenRendererUnset() public {
        _mintOne(_minter, 21);

        vm.expectRevert(bytes("renderer not set"));
        _coreCats.tokenURI(1);
    }

    function testTokenURIDelegatesToRenderer() public {
        string memory expected = "data:application/json;base64,Zm9v";
        MockMetadataRenderer renderer = new MockMetadataRenderer(expected);
        _coreCats.setMetadataRenderer(address(renderer));

        _mintOne(_minter, 22);

        string memory actual = _coreCats.tokenURI(1);
        assertEq(actual, expected);
        assertTrue(_startsWith(actual, "data:application/json;base64,"));
    }

    function _mintOne(address to, uint256 nonce) internal {
        uint256 expiry = block.timestamp + 1 days;
        bytes memory sig = _mintSignature(to, nonce, expiry, _signerKey);

        vm.prank(to);
        _coreCats.mint(to, nonce, expiry, sig);
    }

    function _mintSignature(address to, uint256 nonce, uint256 expiry, string memory key)
        internal
        view
        returns (bytes memory)
    {
        bytes32 message = keccak256(abi.encodePacked(to, nonce, expiry, block.chainid, address(_coreCats)));
        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        return vm.sign(key, digest);
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
