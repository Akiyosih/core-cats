// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract CoreCats is ERC721URIStorage, Ownable {
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 private _tokenIdCounter;

    constructor() ERC721("CoreCats", "CCAT") Ownable(msg.sender) {
        // デプロイ時に msg.sender をオーナーに設定
    }

    // 引数でミント先を指定できるように修正
    function mint(address to) public onlyOwner {
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        _tokenIdCounter++;
        _safeMint(to, _tokenIdCounter);
    }

	function generateSVG(uint256 tokenId) internal pure returns (string memory) {
		// 仮のシンプルSVG（ピンク背景＋tokenIdを表示）
		return string(
			abi.encodePacked(
				"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>",
				"<rect width='24' height='24' fill='pink'/>",
				"<text x='4' y='16' font-size='12' fill='black'>#",
				Strings.toString(tokenId),
				"</text></svg>"
			)
		);
	}

	function tokenURI(uint256 tokenId) public view override returns (string memory) {
		require(_exists(tokenId), "CoreCats: URI query for nonexistent token");

		string memory svg = generateSVG(tokenId);

		string memory image = string(
			abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg)))
		);

		string memory json = string(
			abi.encodePacked(
				'{"name": "Core Cat #', Strings.toString(tokenId),
				'", "description": "Fully on-chain SVG cat stored on Core Blockchain.", "image": "',
				image, '"}'
			)
		);

		return string(
			abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
		);
	}

    function _baseURI() internal pure override returns (string memory) {
        // 後でオンチェーンSVGに置き換える
        return "https://example.com/api/token/";
    }
}
