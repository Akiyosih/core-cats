// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "solmate/tokens/ERC721.sol";
import {Owned} from "solmate/auth/Owned.sol";
// ←ここをOpenZeppelinのBase64に変更
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title CoreCats (最小プロトタイプ)
/// @notice 固定の24x24 SVGを返すフルオンチェーンNFT（雛形）
contract CoreCats is ERC721, Owned {
    string internal constant _SVG =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' shape-rendering='crispEdges'>"
        "<rect width='24' height='24' fill='#fff'/>"
        "<rect x='4' y='3' width='4' height='4' fill='#000'/>"
        "<rect x='16' y='3' width='4' height='4' fill='#000'/>"
        "<rect x='6' y='8' width='4' height='4' fill='#000'/>"
        "<rect x='14' y='8' width='4' height='4' fill='#000'/>"
        "<rect x='6' y='16' width='12' height='2' fill='#000'/>"
        "</svg>";

    string internal constant _NAME = "CoreCats";
    string internal constant _DESC = "Fully on-chain placeholder SVG (24x24). Prototype.";

    constructor() ERC721(_NAME, "CCAT") Owned(msg.sender) {}

    function mint(address to, uint256 id) external onlyOwner {
        _safeMint(to, id);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        require(ownerOf[id] != address(0), "NOT_MINTED");

        string memory image = Base64.encode(bytes(_SVG));
        string memory json = string.concat(
            '{"name":"', _NAME,
            '","description":"', _DESC,
            '","image":"data:image/svg+xml;base64,', image,
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
