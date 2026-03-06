// SPDX-License-Identifier: MIT
pragma solidity ^1.1.2;

import {CRC721} from "corezeppelin-contracts/token/CRC721/CRC721.sol";
import {Ownable} from "corezeppelin-contracts/access/Ownable.sol";
import {EDDSA} from "corezeppelin-contracts/utils/cryptography/EDDSA.sol";

interface ICoreCatsMetadataRenderer {
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract CoreCats is CRC721, Ownable {
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_PER_ADDRESS = 3;

    uint256 private _nextId = 1;

    mapping(address => uint256) public mintedPerAddress;
    mapping(bytes32 => bool) public usedNonce;

    address public signer;
    address public metadataRenderer;

    constructor() CRC721("CoreCats", "CCAT") {
        signer = msg.sender;
    }

    function setSigner(address newSigner) external onlyOwner {
        signer = newSigner;
    }

    function setMetadataRenderer(address newRenderer) external onlyOwner {
        metadataRenderer = newRenderer;
    }

    function totalSupply() public view returns (uint256) {
        return _nextId - 1;
    }

    function mint(address to, uint256 nonce, uint256 expiry, bytes calldata signature) external {
        require(block.timestamp <= expiry, "signature expired");
        require(totalSupply() < MAX_SUPPLY, "sold out");
        require(mintedPerAddress[to] < MAX_PER_ADDRESS, "address mint limit");

        bytes32 message = _mintMessage(to, nonce, expiry);
        require(!usedNonce[message], "nonce used");
        usedNonce[message] = true;

        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        address recovered = EDDSA.recover(digest, signature);
        require(recovered == signer, "invalid signature");

        uint256 tokenId = _nextId++;
        mintedPerAddress[to] += 1;
        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        require(metadataRenderer != address(0), "renderer not set");
        return ICoreCatsMetadataRenderer(metadataRenderer).tokenURI(tokenId);
    }

    function _mintMessage(address to, uint256 nonce, uint256 expiry) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(to, nonce, expiry, block.chainid, address(this)));
    }
}
