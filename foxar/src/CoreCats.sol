// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC721 本体は Solmate を使用
import {ERC721} from "solmate/tokens/ERC721.sol";
// Base64 は OpenZeppelin を使用（インストール手順は上の①参照）
import "openzeppelin-contracts/contracts/utils/Base64.sol";

contract CoreCats is ERC721 {
    string public constant VERSION = "0.1.0";
    address public owner;

    // シンプルなオーナー権限
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() ERC721("CoreCats", "CCAT") {
        owner = msg.sender;
    }

    /// @notice 暫定: ownerのみ任意IDをmint
    function mint(address to, uint256 id) external onlyOwner {
        _safeMint(to, id);
    }

    /// @notice 固定SVG（24×24のプレースホルダ）を data: URI JSON として返す
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "nonexistent token");

        // 24x24の超シンプルなプレースホルダSVG（背景グレー、中央に猫の「:3」）
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges">',
                '<rect width="24" height="24" fill="#e5e7eb"/>',
                '<text x="12" y="14" font-size="10" text-anchor="middle" fill="#111827">:3</text>',
                "</svg>"
            )
        );

        // SVGをBase64
        string memory imageData = string(
            abi.encodePacked(
                "data:image/svg+xml;base64,",
                Base64.encode(bytes(svg))
            )
        );

        // JSONメタデータを組み立て
        string memory json = string(
            abi.encodePacked(
                '{"name":"CoreCats #',
                _toString(tokenId),
                '","description":"On-chain 24x24 placeholder (will be replaced by palette-compressed art).",',
                '"image":"', imageData, '"}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    // --- 内部: uint256 -> string（最小限の実装） ---
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
