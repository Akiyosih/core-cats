const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Minting from:", owner.address);

  const CoreCats = await hre.ethers.getContractFactory("CoreCats");
  const coreCats = await CoreCats.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"); // 最新のデプロイ先

  // 引数つき mint
  const tx = await coreCats.mint(owner.address);
  await tx.wait();

  console.log("Minted token #1 to", owner.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
