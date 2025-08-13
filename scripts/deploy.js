const hre = require("hardhat");

async function main() {
  const CoreCats = await hre.ethers.getContractFactory("CoreCats");
  const coreCats = await CoreCats.deploy();

  await coreCats.waitForDeployment(); // 新しいバージョンの正しい書き方

  console.log("CoreCats deployed to:", await coreCats.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
