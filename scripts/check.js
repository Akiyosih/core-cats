// scripts/check.js
const hre = require("hardhat");

async function main() {
  const [owner, addr1] = await hre.ethers.getSigners();

  // デプロイ済みのCoreCatsコントラクトのアドレス
  const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // デプロイ時のアドレスに置き換え

  // コントラクトのABIを取得
  const CoreCats = await hre.ethers.getContractFactory("CoreCats");
  const coreCats = CoreCats.attach(contractAddress);

  // Token ID 1 の所有者を取得
  const ownerOfToken1 = await coreCats.ownerOf(1);
  console.log(`Token #1 owner: ${ownerOfToken1}`);

  // owner の所持数を取得
  const balanceOwner = await coreCats.balanceOf(owner.address);
  console.log(`Balance of owner (${owner.address}): ${balanceOwner}`);

  // addr1 の所持数も確認
  const balanceAddr1 = await coreCats.balanceOf(addr1.address);
  console.log(`Balance of addr1 (${addr1.address}): ${balanceAddr1}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
