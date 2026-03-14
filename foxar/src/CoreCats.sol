// SPDX-License-Identifier: MIT
pragma solidity ^1.1.2;

import {CRC721} from "corezeppelin-contracts/token/CRC721/CRC721.sol";

interface ICoreCatsMetadataRenderer {
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract CoreCats is CRC721 {
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_PER_ADDRESS = 3;
    uint64 public constant FINALIZE_DELAY_BLOCKS = 2;
    uint64 public constant FINALIZE_WINDOW_BLOCKS = 200;

    struct PendingCommit {
        uint8 quantity;
        uint64 finalizeBlock;
        uint64 expiryBlock;
        bytes32 commitHash;
    }

    uint256 private _mintedCount;

    mapping(address => uint256) public mintedPerAddress;
    mapping(address => uint256) public reservedPerAddress;
    mapping(address => PendingCommit) public pendingCommit;
    mapping(uint256 => uint256) private _tokenMatrix;

    address public immutable metadataRenderer;
    uint256 public reservedSupply;

    event MintCommitted(
        address indexed minter,
        uint8 quantity,
        uint64 finalizeBlock,
        uint64 expiryBlock,
        bytes32 commitHash
    );
    event MintCommitExpired(address indexed minter, uint8 quantity, uint64 finalizeBlock, uint64 expiryBlock);
    event MintFinalized(address indexed minter, address indexed finalizer, uint8 quantity, bytes32 entropy);
    event TokenAssigned(address indexed minter, uint256 indexed tokenId, uint256 indexed drawIndex, bytes32 entropy);

    constructor(string memory collectionName_, string memory collectionSymbol_, address metadataRenderer_)
        CRC721(collectionName_, collectionSymbol_)
    {
        require(bytes(collectionName_).length != 0, "name required");
        require(bytes(collectionSymbol_).length != 0, "symbol required");
        require(metadataRenderer_ != address(0), "renderer required");
        metadataRenderer = metadataRenderer_;
    }

    function totalSupply() public view returns (uint256) {
        return _mintedCount;
    }

    function availableSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply() - reservedSupply;
    }

    function commitMint(uint8 quantity, bytes32 commitHash) external {
        address to = msg.sender;

        _clearExpiredCommitIfNeeded(to);

        require(quantity > 0 && quantity <= MAX_PER_ADDRESS, "invalid quantity");
        require(commitHash != bytes32(0), "commit hash required");
        require(pendingCommit[to].quantity == 0, "pending commit exists");
        require(availableSupply() >= quantity, "sold out");
        require(mintedPerAddress[to] + reservedPerAddress[to] + quantity <= MAX_PER_ADDRESS, "address mint limit");

        uint64 finalizeBlock = uint64(block.number + FINALIZE_DELAY_BLOCKS);
        uint64 expiryBlock = uint64(finalizeBlock + FINALIZE_WINDOW_BLOCKS);

        pendingCommit[to] = PendingCommit({
            quantity: quantity,
            finalizeBlock: finalizeBlock,
            expiryBlock: expiryBlock,
            commitHash: commitHash
        });

        reservedPerAddress[to] += quantity;
        reservedSupply += quantity;

        emit MintCommitted(to, quantity, finalizeBlock, expiryBlock, commitHash);
    }

    function finalizeMint(address minter) external {
        PendingCommit memory commitData = pendingCommit[minter];

        require(commitData.quantity > 0, "no pending commit");
        require(block.number > commitData.finalizeBlock, "finalize too early");
        require(block.number <= commitData.expiryBlock, "finalize expired");

        bytes32 finalizeBlockHash = blockhash(commitData.finalizeBlock);
        require(finalizeBlockHash != bytes32(0), "finalize blockhash unavailable");

        uint256 quantity = uint256(commitData.quantity);
        uint256 mintedBefore = _mintedCount;
        bytes32 entropy = keccak256(
            abi.encodePacked(commitData.commitHash, finalizeBlockHash, minter, address(this), block.chainid, commitData.finalizeBlock)
        );

        delete pendingCommit[minter];
        reservedPerAddress[minter] -= quantity;
        reservedSupply -= quantity;
        mintedPerAddress[minter] += quantity;
        _mintedCount = mintedBefore + quantity;

        emit MintFinalized(minter, msg.sender, commitData.quantity, entropy);

        for (uint256 i = 0; i < quantity; i++) {
            uint256 remaining = MAX_SUPPLY - (mintedBefore + i);
            uint256 tokenId = _drawRandomTokenId(uint256(keccak256(abi.encodePacked(entropy, i))), remaining);
            _safeMint(minter, tokenId);
            emit TokenAssigned(minter, tokenId, i, entropy);
        }
    }

    function clearExpiredCommit(address minter) external {
        PendingCommit memory commitData = pendingCommit[minter];
        require(commitData.quantity > 0, "no pending commit");
        require(block.number > commitData.expiryBlock, "commit active");

        delete pendingCommit[minter];
        reservedPerAddress[minter] -= uint256(commitData.quantity);
        reservedSupply -= uint256(commitData.quantity);

        emit MintCommitExpired(minter, commitData.quantity, commitData.finalizeBlock, commitData.expiryBlock);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);
        return ICoreCatsMetadataRenderer(metadataRenderer).tokenURI(tokenId);
    }

    function _clearExpiredCommitIfNeeded(address minter) internal {
        PendingCommit memory commitData = pendingCommit[minter];
        if (commitData.quantity == 0 || block.number <= commitData.expiryBlock) {
            return;
        }

        delete pendingCommit[minter];
        reservedPerAddress[minter] -= uint256(commitData.quantity);
        reservedSupply -= uint256(commitData.quantity);

        emit MintCommitExpired(minter, commitData.quantity, commitData.finalizeBlock, commitData.expiryBlock);
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
