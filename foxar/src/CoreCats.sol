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
    uint64 public constant REVEAL_DELAY_BLOCKS = 2;
    uint64 public constant REVEAL_WINDOW_BLOCKS = 200;

    struct PendingCommit {
        uint8 quantity;
        uint64 revealBlock;
        uint64 expiryBlock;
        bytes32 commitHash;
    }

    uint256 private _mintedCount;

    mapping(address => uint256) public mintedPerAddress;
    mapping(address => uint256) public reservedPerAddress;
    mapping(bytes32 => bool) public usedNonce;
    mapping(address => PendingCommit) public pendingCommit;
    mapping(uint256 => uint256) private _tokenMatrix;

    address public signer;
    address public metadataRenderer;
    uint256 public reservedSupply;

    event MintCommitted(
        address indexed minter,
        uint8 quantity,
        uint64 revealBlock,
        uint64 expiryBlock,
        bytes32 commitHash
    );
    event MintCommitExpired(address indexed minter, uint8 quantity, uint64 revealBlock, uint64 expiryBlock);
    event MintRevealed(address indexed minter, uint8 quantity, bytes32 entropy);
    event TokenAssigned(address indexed minter, uint256 indexed tokenId, uint256 indexed drawIndex, bytes32 entropy);

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
        return _mintedCount;
    }

    function availableSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply() - reservedSupply;
    }

    function commitMint(
        uint8 quantity,
        bytes32 commitHash,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external {
        address to = msg.sender;

        _clearExpiredCommitIfNeeded(to);

        require(quantity > 0 && quantity <= MAX_PER_ADDRESS, "invalid quantity");
        require(commitHash != bytes32(0), "commit hash required");
        require(block.timestamp <= expiry, "signature expired");
        require(pendingCommit[to].quantity == 0, "pending commit exists");
        require(availableSupply() >= quantity, "sold out");
        require(mintedPerAddress[to] + reservedPerAddress[to] + quantity <= MAX_PER_ADDRESS, "address mint limit");

        bytes32 message = _mintMessage(to, quantity, nonce, expiry);
        require(!usedNonce[message], "nonce used");
        usedNonce[message] = true;

        bytes32 digest = EDDSA.toCoreSignedMessageHash(message);
        address recovered = EDDSA.recover(digest, signature);
        require(recovered == signer, "invalid signature");

        uint64 revealBlock = uint64(block.number + REVEAL_DELAY_BLOCKS);
        uint64 expiryBlock = uint64(revealBlock + REVEAL_WINDOW_BLOCKS);

        pendingCommit[to] = PendingCommit({
            quantity: quantity,
            revealBlock: revealBlock,
            expiryBlock: expiryBlock,
            commitHash: commitHash
        });

        reservedPerAddress[to] += quantity;
        reservedSupply += quantity;

        emit MintCommitted(to, quantity, revealBlock, expiryBlock, commitHash);
    }

    function revealMint(bytes32 secret) external {
        address to = msg.sender;
        PendingCommit memory commitData = pendingCommit[to];

        require(commitData.quantity > 0, "no pending commit");
        require(block.number > commitData.revealBlock, "reveal too early");
        require(block.number <= commitData.expiryBlock, "reveal expired");
        require(keccak256(abi.encodePacked(secret)) == commitData.commitHash, "invalid reveal");

        bytes32 revealBlockHash = blockhash(commitData.revealBlock);
        require(revealBlockHash != bytes32(0), "reveal blockhash unavailable");

        uint256 quantity = uint256(commitData.quantity);
        uint256 mintedBefore = _mintedCount;
        bytes32 entropy = keccak256(
            abi.encodePacked(secret, revealBlockHash, to, address(this), block.chainid, commitData.revealBlock)
        );

        delete pendingCommit[to];
        reservedPerAddress[to] -= quantity;
        reservedSupply -= quantity;
        mintedPerAddress[to] += quantity;
        _mintedCount = mintedBefore + quantity;

        emit MintRevealed(to, commitData.quantity, entropy);

        for (uint256 i = 0; i < quantity; i++) {
            uint256 remaining = MAX_SUPPLY - (mintedBefore + i);
            uint256 tokenId = _drawRandomTokenId(uint256(keccak256(abi.encodePacked(entropy, i))), remaining);
            _safeMint(to, tokenId);
            emit TokenAssigned(to, tokenId, i, entropy);
        }
    }

    function clearExpiredCommit(address minter) external {
        PendingCommit memory commitData = pendingCommit[minter];
        require(commitData.quantity > 0, "no pending commit");
        require(block.number > commitData.expiryBlock, "commit active");

        delete pendingCommit[minter];
        reservedPerAddress[minter] -= uint256(commitData.quantity);
        reservedSupply -= uint256(commitData.quantity);

        emit MintCommitExpired(minter, commitData.quantity, commitData.revealBlock, commitData.expiryBlock);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        require(metadataRenderer != address(0), "renderer not set");
        return ICoreCatsMetadataRenderer(metadataRenderer).tokenURI(tokenId);
    }

    function _mintMessage(address to, uint256 quantity, uint256 nonce, uint256 expiry) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(to, quantity, nonce, expiry, block.chainid, address(this)));
    }

    function _clearExpiredCommitIfNeeded(address minter) internal {
        PendingCommit memory commitData = pendingCommit[minter];
        if (commitData.quantity == 0 || block.number <= commitData.expiryBlock) {
            return;
        }

        delete pendingCommit[minter];
        reservedPerAddress[minter] -= uint256(commitData.quantity);
        reservedSupply -= uint256(commitData.quantity);

        emit MintCommitExpired(minter, commitData.quantity, commitData.revealBlock, commitData.expiryBlock);
    }

    function _drawRandomTokenId(uint256 randomWord, uint256 remaining) internal returns (uint256) {
        uint256 drawIndex = randomWord % remaining;
        uint256 lastIndex = remaining - 1;

        uint256 selected = _tokenMatrix[drawIndex];
        uint256 tokenIndex = selected == 0 ? drawIndex : selected;

        if (drawIndex != lastIndex) {
            uint256 lastValue = _tokenMatrix[lastIndex];
            _tokenMatrix[drawIndex] = lastValue == 0 ? lastIndex : lastValue;
        }

        if (_tokenMatrix[lastIndex] != 0) {
            delete _tokenMatrix[lastIndex];
        }

        return tokenIndex + 1;
    }
}
